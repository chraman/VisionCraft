"""
Local model provider — calls a self-hosted endpoint (Kaggle ngrok or local GPU).

The endpoint at LOCAL_MODEL_URL must expose:
  GET  /health          — {"status": "ok"}
  POST /generate/text   — JSON body → PNG bytes
  POST /generate/image  — multipart (image file + form fields) → PNG bytes

See ai-service/kaggle_server.py for the reference server implementation
(FLUX.2 [klein] 4B via diffusers on a Kaggle T4/P100 GPU).
"""
import io
import httpx
from PIL import Image as PILImage

from config.settings import settings
from providers import BaseProvider, ASPECT_RATIO_TO_SIZE


class LocalProvider(BaseProvider):
    @property
    def name(self) -> str:
        return "local"

    def is_available(self) -> bool:
        return bool(settings.local_model_url)

    def _base(self) -> str:
        return settings.local_model_url.rstrip("/")

    async def generate_text(
        self, prompt: str, negative_prompt: str | None, aspect_ratio: str, quality: str
    ) -> tuple[bytes, int, int]:
        w, h = ASPECT_RATIO_TO_SIZE.get(aspect_ratio, (1024, 1024))

        payload: dict = {
            "prompt":       prompt,
            "aspect_ratio": aspect_ratio,
            "quality":      quality,
            "width":        w,
            "height":       h,
        }
        if negative_prompt:
            payload["negative_prompt"] = negative_prompt

        # FLUX generation is slow (8-20s on T4) — use a generous timeout
        async with httpx.AsyncClient(timeout=300) as client:
            response = await client.post(f"{self._base()}/generate/text", json=payload)
            response.raise_for_status()
            img_bytes = response.content

        # Read actual dimensions from the PNG header rather than trusting defaults
        try:
            img = PILImage.open(io.BytesIO(img_bytes))
            actual_w, actual_h = img.size
        except Exception:
            actual_w, actual_h = w, h

        return img_bytes, actual_w, actual_h

    async def generate_image(
        self, image_bytes: bytes, prompt: str, strength: float, aspect_ratio: str
    ) -> tuple[bytes, int, int]:
        w, h = ASPECT_RATIO_TO_SIZE.get(aspect_ratio, (1024, 1024))

        async with httpx.AsyncClient(timeout=300) as client:
            response = await client.post(
                f"{self._base()}/generate/image",
                data={"prompt": prompt, "strength": str(strength)},
                files={"image": ("image.png", io.BytesIO(image_bytes), "image/png")},
            )
            response.raise_for_status()
            result_bytes = response.content

        try:
            img = PILImage.open(io.BytesIO(result_bytes))
            actual_w, actual_h = img.size
        except Exception:
            actual_w, actual_h = w, h

        return result_bytes, actual_w, actual_h
