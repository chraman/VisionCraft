"""
Kaggle FLUX.2 [klein] 4B Model Server
=======================================
Paste this entire file into a Kaggle notebook code cell and run it.

It loads FLUX.2 [klein] 4B, starts a FastAPI server, and exposes it via
ngrok so the VisionCraft ai-service can call it as the 'local' provider.

After running:
  1. Copy the ngrok URL printed below
  2. Put it in ai-service/.env:  LOCAL_MODEL_URL=https://xxxx.ngrok-free.app
  3. Ensure:                     PROVIDER_PRIORITY=local,openai,...
  4. Restart ai-service + image-worker

Endpoints:
  GET  /health          → {"status": "ok", "model": "...", "device": "..."}
  POST /generate/text   → JSON body → PNG bytes
  POST /generate/image  → multipart (image file + form fields) → PNG bytes

GPU requirements:
  FLUX.2 [klein] 4B with fp16 + CPU offload: ~10-12 GB VRAM peak
  Kaggle T4 (16 GB) works fine.

Estimated time on T4:
  Text2img (4 steps):   ~8-15 seconds
  Img2img  (4 steps):   ~10-18 seconds
"""

# ─── Install ──────────────────────────────────────────────────────────────────
import subprocess, sys

subprocess.run([
    sys.executable, "-m", "pip", "install", "-q",
    "fastapi", "uvicorn[standard]", "pyngrok",
    "diffusers>=0.31.0", "transformers", "accelerate", "sentencepiece",
    "safetensors", "Pillow",
], check=True)

print("Dependencies installed.")

# ─── Imports ──────────────────────────────────────────────────────────────────
import os, io, gc, torch, asyncio, logging, threading, nest_asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from PIL import Image
from pyngrok import ngrok
import uvicorn

from kaggle_secrets import UserSecretsClient

# ─── Config ───────────────────────────────────────────────────────────────────
nest_asyncio.apply()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("KaggleServer")

# Set HF token for gated model access
user_secrets = UserSecretsClient()
os.environ["HF_TOKEN"] = user_secrets.get_secret("HF_TOKEN")

NGROK_TOKEN  = "37vraVxV1TunmyLhSBA7H7ryytC_2U3FfH5E2t4oyrijUUCwX"
MODEL_ID     = "black-forest-labs/FLUX.2-klein-4B"
PORT         = 8000

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# Aspect ratio → (width, height) — FLUX works best at multiples of 16
ASPECT_TO_SIZE: dict[str, tuple[int, int]] = {
    "1:1":  (1024, 1024),
    "16:9": (1280, 720),
    "9:16": (720,  1280),
    "4:3":  (1024, 768),
    "3:4":  (768,  1024),
}

# Quality → inference steps
QUALITY_STEPS: dict[str, int] = {
    "standard": 4,
    "hd":       8,
    "ultra":    12,
}

models: dict = {}


# ─── Helpers ──────────────────────────────────────────────────────────────────

def clear_vram() -> None:
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()


def png_response(img: Image.Image) -> Response:
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return Response(content=buf.getvalue(), media_type="image/png")


def resize_for_flux(img: Image.Image, target_w: int, target_h: int) -> Image.Image:
    """Resize preserving aspect ratio, then center-crop to exact target size."""
    scale = max(target_w / img.width, target_h / img.height)
    new_w = int(img.width  * scale)
    new_h = int(img.height * scale)
    img   = img.resize((new_w, new_h), Image.LANCZOS)
    left  = (new_w - target_w) // 2
    top   = (new_h - target_h) // 2
    return img.crop((left, top, left + target_w, top + target_h))


# ─── Lifespan: load models once ───────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("⏳ Loading FLUX.2 [klein] 4B …")
    try:
        clear_vram()

        from diffusers import Flux2KleinPipeline

        pipe = Flux2KleinPipeline.from_pretrained(
            MODEL_ID,
            torch_dtype=torch.float16,
        )
        pipe.enable_model_cpu_offload()
        pipe.vae.enable_tiling()
        models["pipe"] = pipe

        # Try to build an img2img pipeline from the same components so we
        # don't load a second copy of the weights.
        try:
            from diffusers import FluxImg2ImgPipeline
            img2img = FluxImg2ImgPipeline(**pipe.components)
            img2img.enable_model_cpu_offload()
            models["img2img"] = img2img
            logger.info("✅ Img2img pipeline ready.")
        except Exception as e:
            logger.warning(f"⚠️  FluxImg2ImgPipeline unavailable ({e}); img2img will fall back to text2img.")

        logger.info("🚀 FLUX.2 [klein] server ready.")

    except Exception as e:
        logger.error(f"❌ Startup failed: {e}")
        raise

    yield

    models.clear()
    clear_vram()


# ─── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(title="VisionCraft FLUX.2 Local Server", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "model":  MODEL_ID,
        "device": DEVICE,
        "img2img_available": "img2img" in models,
    }


@app.post("/generate/text")
async def generate_text(request: Request) -> Response:
    """
    Body (JSON):
      prompt         string   required
      negative_prompt string  optional
      aspect_ratio   string   "1:1" | "16:9" | "9:16" | "4:3" | "3:4"
      quality        string   "standard" | "hd" | "ultra"
    Returns: PNG bytes
    """
    pipe = models.get("pipe")
    if not pipe:
        return Response(status_code=503, content="Model not loaded.")

    try:
        body          = await request.json()
        prompt        = str(body.get("prompt", ""))
        neg_prompt    = body.get("negative_prompt") or None
        aspect_ratio  = str(body.get("aspect_ratio", "1:1"))
        quality       = str(body.get("quality", "standard"))
        width, height = ASPECT_TO_SIZE.get(aspect_ratio, (1024, 1024))
        steps         = QUALITY_STEPS.get(quality, 4)

        logger.info(f"Text2img | prompt={prompt[:60]!r} | {width}x{height} | steps={steps}")

        with torch.inference_mode():
            result = pipe(
                prompt=prompt,
                negative_prompt=neg_prompt,
                width=width,
                height=height,
                num_inference_steps=steps,
                guidance_scale=1.0,
            )

        return png_response(result.images[0])

    except Exception as e:
        logger.error(f"❌ Text2img error: {e}", exc_info=True)
        return Response(status_code=500, content=str(e))


@app.post("/generate/image")
async def generate_image(
    image:    UploadFile = File(...),
    prompt:   str        = Form(...),
    strength: float      = Form(0.75),
) -> Response:
    """
    Multipart fields:
      image     file    Source image (PNG/JPEG)
      prompt    string  Generation prompt
      strength  float   0.0-1.0 — how much to change the source (default 0.75)
    Returns: PNG bytes
    """
    if not models.get("pipe"):
        return Response(status_code=503, content="Model not loaded.")

    try:
        # Load and normalize source image
        src_bytes  = await image.read()
        source_img = Image.open(io.BytesIO(src_bytes)).convert("RGB")

        # Snap to nearest supported size
        target_w, target_h = min(
            ASPECT_TO_SIZE.values(),
            key=lambda wh: abs(wh[0] / wh[1] - source_img.width / source_img.height),
        )
        source_img = resize_for_flux(source_img, target_w, target_h)

        steps = max(4, int(QUALITY_STEPS["standard"] / max(strength, 0.1)))

        img2img = models.get("img2img")
        if img2img:
            logger.info(f"Img2img (FLUX) | prompt={prompt[:60]!r} | strength={strength} | steps={steps}")
            with torch.inference_mode():
                result = img2img(
                    prompt=prompt,
                    image=source_img,
                    strength=min(strength, 1.0),
                    num_inference_steps=steps,
                    guidance_scale=1.0,
                )
        else:
            # Fallback: text2img using source image dimensions + prompt
            logger.info(f"Img2img (text fallback) | prompt={prompt[:60]!r} | {target_w}x{target_h}")
            with torch.inference_mode():
                result = models["pipe"](
                    prompt=prompt,
                    width=target_w,
                    height=target_h,
                    num_inference_steps=4,
                    guidance_scale=1.0,
                )

        return png_response(result.images[0])

    except Exception as e:
        logger.error(f"❌ Img2img error: {e}", exc_info=True)
        return Response(status_code=500, content=str(e))


# ─── Start server + ngrok ─────────────────────────────────────────────────────

if __name__ == "__main__":
    os.system("fuser -k 8000/tcp 2>/dev/null || true")
    ngrok.kill()
    ngrok.set_auth_token(NGROK_TOKEN)

    tunnel     = ngrok.connect(PORT)
    public_url = tunnel.public_url

    print("\n" + "=" * 60)
    print("  FLUX.2 [klein] server is LIVE!")
    print(f"  ngrok URL: {public_url}")
    print("=" * 60)
    print("\nPaste into ai-service/.env:")
    print(f"  LOCAL_MODEL_URL={public_url}")
    print("  PROVIDER_PRIORITY=local,openai,stability")
    print("\nThen restart ai-service. Tunnel stays alive as long as")
    print("this Kaggle session is running.\n")

    config = uvicorn.Config(
        app,
        host="0.0.0.0",
        port=PORT,
        loop="asyncio",
        timeout_keep_alive=150,
        log_level="info",
    )
    server = uvicorn.Server(config)
    loop   = asyncio.get_event_loop()
    loop.run_until_complete(server.serve())
