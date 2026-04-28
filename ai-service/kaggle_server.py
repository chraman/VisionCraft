"""
Kaggle Local Model Server
=========================
Paste this entire file into a Kaggle notebook code cell and run it.
It loads SDXL Turbo on the GPU, starts a FastAPI server, and exposes it
via ngrok so the VisionCraft ai-service can call it as the 'local' provider.

After running:
  1. Copy the ngrok URL printed below (e.g. https://xxxx.ngrok.io)
  2. Put it in ai-service/.env:   LOCAL_MODEL_URL=https://xxxx.ngrok.io
  3. Set                          PROVIDER_PRIORITY=local
  4. Restart the ai-service

The server exposes:
  POST /generate/text   — JSON body → PNG bytes
  POST /generate/image  — multipart form (image file + form fields) → PNG bytes
  GET  /health          — returns {"status": "ok"}

GPU requirements:
  - SDXL Turbo: ~6 GB VRAM  (default — fastest, 4-step generation)
  - SDXL:       ~8 GB VRAM  (set MODEL_ID = "stabilityai/stable-diffusion-xl-base-1.0")
  - Kaggle T4 (16 GB) or P100 (16 GB) both work fine.

Estimated generation time on T4:
  - SDXL Turbo: ~2-4 seconds
  - SDXL:       ~10-15 seconds
"""

# ─── Cell 1: Install dependencies ────────────────────────────────────────────
# Run this cell first, then the rest.

import subprocess, sys

subprocess.run([sys.executable, "-m", "pip", "install", "-q",
    "fastapi", "uvicorn[standard]", "pyngrok",
    "diffusers", "transformers", "accelerate", "safetensors",
    "torch", "torchvision", "--index-url", "https://download.pytorch.org/whl/cu121",
], check=True)

print("Dependencies installed.")

# ─── Cell 2: Load model ───────────────────────────────────────────────────────

import torch
from diffusers import AutoPipelineForText2Image, AutoPipelineForImage2Image
from PIL import Image
import io

# Change to "stabilityai/stable-diffusion-xl-base-1.0" for full SDXL
# (slower but higher quality, still fits on T4)
MODEL_ID = "stabilityai/sdxl-turbo"

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
DTYPE  = torch.float16 if DEVICE == "cuda" else torch.float32

print(f"Loading {MODEL_ID} on {DEVICE} …")

text_pipe = AutoPipelineForText2Image.from_pretrained(
    MODEL_ID,
    torch_dtype=DTYPE,
    variant="fp16" if DEVICE == "cuda" else None,
).to(DEVICE)

img2img_pipe = AutoPipelineForImage2Image.from_pipe(text_pipe)

# SDXL Turbo: 1-4 steps, guidance_scale=0.0
# Full SDXL:  25-30 steps, guidance_scale=7.5
IS_TURBO = "turbo" in MODEL_ID.lower()
DEFAULT_STEPS = 4 if IS_TURBO else 25
DEFAULT_GUIDANCE = 0.0 if IS_TURBO else 7.5

print(f"Model loaded. Steps={DEFAULT_STEPS}, guidance={DEFAULT_GUIDANCE}")

# ─── Cell 3: Aspect ratio → dimensions ───────────────────────────────────────

ASPECT_TO_SIZE: dict[str, tuple[int, int]] = {
    "1:1":  (512,  512),
    "16:9": (768,  432),
    "9:16": (432,  768),
    "4:3":  (640,  480),
    "3:4":  (480,  640),
}

# ─── Cell 4: FastAPI server ────────────────────────────────────────────────────

import threading
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import Response
import uvicorn

app = FastAPI(title="VisionCraft Local Model Server")


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "model": MODEL_ID, "device": DEVICE}


@app.post("/generate/text")
async def generate_text(body: dict) -> Response:
    prompt         = str(body.get("prompt", ""))
    negative_prompt= body.get("negative_prompt") or None
    aspect_ratio   = str(body.get("aspect_ratio", "1:1"))
    quality        = str(body.get("quality", "standard"))
    width, height  = ASPECT_TO_SIZE.get(aspect_ratio, (512, 512))

    steps    = DEFAULT_STEPS
    guidance = DEFAULT_GUIDANCE

    # hd quality → slightly more steps (ignored for turbo)
    if quality == "hd" and not IS_TURBO:
        steps = 40

    result = text_pipe(
        prompt=prompt,
        negative_prompt=negative_prompt,
        width=width,
        height=height,
        num_inference_steps=steps,
        guidance_scale=guidance,
    )
    img: Image.Image = result.images[0]

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return Response(content=buf.getvalue(), media_type="image/png")


@app.post("/generate/image")
async def generate_image(
    image: UploadFile = File(...),
    prompt: str = Form(...),
    strength: float = Form(default=0.75),
) -> Response:
    source_bytes = await image.read()
    source_img   = Image.open(io.BytesIO(source_bytes)).convert("RGB")
    source_img   = source_img.resize((512, 512))

    result = img2img_pipe(
        prompt=prompt,
        image=source_img,
        strength=min(strength, 1.0),
        num_inference_steps=DEFAULT_STEPS,
        guidance_scale=DEFAULT_GUIDANCE,
    )
    out_img: Image.Image = result.images[0]

    buf = io.BytesIO()
    out_img.save(buf, format="PNG")
    return Response(content=buf.getvalue(), media_type="image/png")


# ─── Cell 5: Start server + ngrok tunnel ──────────────────────────────────────

from pyngrok import ngrok, conf

# Option A: Use ngrok free (no account needed, URL changes each session)
# Option B: Add your ngrok authtoken for a stable subdomain:
#   ngrok.set_auth_token("your_token_here")
#   conf.get_default().auth_token = "your_token_here"

PORT = 8080

def run_server():
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="warning")

thread = threading.Thread(target=run_server, daemon=True)
thread.start()

import time; time.sleep(2)  # wait for uvicorn to start

tunnel = ngrok.connect(PORT, "http")
public_url = tunnel.public_url

print("\n" + "="*60)
print(f"  Local model server is LIVE!")
print(f"  ngrok URL: {public_url}")
print("="*60)
print(f"\nSet these in ai-service/.env:")
print(f"  LOCAL_MODEL_URL={public_url}")
print(f"  PROVIDER_PRIORITY=local")
print("\nThen restart ai-service. The tunnel stays alive as long")
print("as this Kaggle session is running.\n")
