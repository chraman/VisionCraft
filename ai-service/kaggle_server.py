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
    "git+https://github.com/huggingface/diffusers.git",
    "transformers", "accelerate", "sentencepiece",
    "safetensors", "Pillow", "bitsandbytes",
], check=True)

print("Dependencies installed.")

# ─── Imports ──────────────────────────────────────────────────────────────────
import os, io, gc, torch, asyncio, logging, random, threading, nest_asyncio
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

NGROK_TOKEN  = user_secrets.get_secret("NGROK_TOKEN")
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


def load_pipeline_int8():
    """Load FLUX pipeline with bitsandbytes int8 quantization (~7-8 GB VRAM vs ~10-12 GB)."""
    try:
        import bitsandbytes  # noqa: F401
        from diffusers import FluxPipeline
        from transformers import BitsAndBytesConfig

        bnb_config = BitsAndBytesConfig(load_in_8bit=True)
        pipe = FluxPipeline.from_pretrained(MODEL_ID, quantization_config=bnb_config, device_map="auto")
        return pipe
    except ImportError as e:
        logger.warning("bitsandbytes unavailable, skipping int8 pipeline: %s", e)
        return None


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

        # Flux2KleinPipeline was added in diffusers >0.36; fall back to the
        # standard FluxPipeline which loads klein weights correctly on 0.31–0.36.
        try:
            from diffusers import Flux2KleinPipeline as _PipeClass
            logger.info("Using Flux2KleinPipeline")
        except ImportError:
            from diffusers import FluxPipeline as _PipeClass
            logger.info("Flux2KleinPipeline not found in this diffusers version; using FluxPipeline")

        pipe = _PipeClass.from_pretrained(
            MODEL_ID,
            torch_dtype=torch.bfloat16,
        )
        pipe.enable_model_cpu_offload()
        pipe.vae.enable_tiling()
        models["pipe"] = pipe

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
    return {"status": "ok", "model": MODEL_ID, "device": DEVICE}


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
        aspect_ratio  = str(body.get("aspect_ratio", "1:1"))
        quality       = str(body.get("quality", "standard"))
        width, height = ASPECT_TO_SIZE.get(aspect_ratio, (1024, 1024))
        steps         = QUALITY_STEPS.get(quality, 4)

        logger.info(f"Text2img | prompt={prompt[:60]!r} | {width}x{height} | steps={steps}")

        # Flux2KleinPipeline does not support negative_prompt
        with torch.inference_mode():
            result = pipe(
                prompt=prompt,
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
    image:    UploadFile        = File(...),
    image2:   UploadFile | None = File(None),
    image3:   UploadFile | None = File(None),
    image4:   UploadFile | None = File(None),
    prompt:   str               = Form(...),
    strength: float             = Form(0.75),
) -> Response:
    """
    Multipart fields:
      image     file    Primary source image (PNG/JPEG) — sets output dimensions
      image2-4  file    Additional reference images (optional, accepted for API
                        consistency with multi-image img2img; not used for FLUX.2
                        generation since the Gemini-augmented prompt already
                        encodes their visual context)
      prompt    string  Generation prompt (may contain [image1], [image2] refs)
      strength  float   0.0-1.0 — how much to change the source (default 0.75)
    Returns: PNG bytes
    """
    if not models.get("pipe"):
        return Response(status_code=503, content="Model not loaded.")

    extras = [f for f in [image2, image3, image4] if f is not None]
    if extras:
        logger.info(f"Multi-image img2img: {1 + len(extras)} reference(s); using primary image only for FLUX.2 generation.")

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

        steps = max(4, round(10 * strength))
        logger.info(
            f"Img2img | prompt={prompt[:60]!r} | "
            f"strength={strength:.2f} | {target_w}x{target_h} | steps={steps}"
        )
        with torch.inference_mode():
            result = models["pipe"](
                prompt=prompt,
                image=source_img,
                strength=strength,
                num_inference_steps=steps,
                guidance_scale=1.0,
            )
        out_img = result.images[0]

        return png_response(out_img)

    except Exception as e:
        logger.error(f"❌ Img2img error: {e}", exc_info=True)
        return Response(status_code=500, content=str(e))


@app.post("/influencer/generate")
async def generate_influencer(
    anchored_prompt:    str               = Form(...),
    aspect_ratio:       str               = Form("1:1"),
    quality:            str               = Form("standard"),
    use_int8:           str               = Form("false"),
    seed:               int | None        = Form(None),
    reference_strength: float             = Form(0.25),
    reference_image:    UploadFile | None = File(None),
    scene_image:        UploadFile | None = File(None),
) -> Response:
    """
    Multipart form fields:
      anchored_prompt    string   required  — DNA-prefixed prompt from ai-service
      aspect_ratio       string   optional
      quality            string   optional
      use_int8           string   optional  — "true"/"false" for bitsandbytes int8
      seed               int      optional  — for reproducibility
      reference_strength float    optional  — face lock img2img strength (0.0–1.0)
      reference_image    file     optional  — influencer profile image (face reference)
      scene_image        file     optional  — user reference scene image (composition)
    Returns: PNG bytes

    Blending logic:
      scene_image only        → img2img at strength=0.65, DNA text anchors identity
      reference_image only    → img2img at strength=reference_strength (face lock)
      both images             → blend 80% scene + 20% profile → img2img at strength=0.65
      neither                 → text-to-image
    """
    pipe = models.get("pipe")
    if not pipe:
        return Response(status_code=503, content="Model not loaded.")

    try:
        use_int8_bool = use_int8.lower() == "true"
        active_pipe = pipe
        if use_int8_bool:
            int8_pipe = load_pipeline_int8()
            if int8_pipe:
                active_pipe = int8_pipe
                logger.info("Using int8-quantized pipeline for influencer generation")

        seed_val = seed if seed is not None else random.randint(0, 2 ** 32 - 1)
        generator = torch.Generator("cpu").manual_seed(seed_val)
        width, height = ASPECT_TO_SIZE.get(aspect_ratio, (1024, 1024))
        steps = QUALITY_STEPS.get(quality, 4)

        has_ref   = reference_image is not None
        has_scene = scene_image is not None

        logger.info(
            f"Influencer generate | prompt={anchored_prompt[:60]!r} | {width}x{height} | "
            f"steps={steps} | int8={use_int8_bool} | seed={seed_val} | "
            f"ref={has_ref} | scene={has_scene}"
        )

        if has_scene:
            scene_bytes = await scene_image.read()
            scene_pil = Image.open(io.BytesIO(scene_bytes)).convert("RGB")
            scene_pil = resize_for_flux(scene_pil, width, height)

            if has_ref:
                # Both images: blend scene (80%) + profile face (20%) for composition + identity
                ref_bytes = await reference_image.read()
                ref_pil = Image.open(io.BytesIO(ref_bytes)).convert("RGB")
                ref_pil = resize_for_flux(ref_pil, width, height)
                input_pil = Image.blend(scene_pil, ref_pil, alpha=0.2)
            else:
                input_pil = scene_pil

            with torch.inference_mode():
                result = active_pipe(
                    prompt=anchored_prompt,
                    image=input_pil,
                    strength=0.65,
                    num_inference_steps=steps,
                    guidance_scale=1.0,
                    generator=generator,
                )

        elif has_ref:
            # Profile only — face lock at user-specified strength
            ref_bytes = await reference_image.read()
            ref_pil = Image.open(io.BytesIO(ref_bytes)).convert("RGB")
            ref_pil = resize_for_flux(ref_pil, width, height)
            with torch.inference_mode():
                result = active_pipe(
                    prompt=anchored_prompt,
                    image=ref_pil,
                    strength=reference_strength,
                    num_inference_steps=steps,
                    guidance_scale=1.0,
                    generator=generator,
                )

        else:
            # Text-to-image fallback
            with torch.inference_mode():
                result = active_pipe(
                    prompt=anchored_prompt,
                    width=width,
                    height=height,
                    num_inference_steps=steps,
                    guidance_scale=1.0,
                    generator=generator,
                )

        return png_response(result.images[0])

    except Exception as e:
        logger.error(f"Influencer generate error: {e}", exc_info=True)
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
