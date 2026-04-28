"""
Local model provider — calls a self-hosted endpoint (Kaggle ngrok or local GPU).

The endpoint at LOCAL_MODEL_URL must expose:
  POST /generate/text  — body: {prompt, aspect_ratio, quality}  → PNG bytes
  POST /generate/image — body: {prompt, strength}  + multipart image → PNG bytes

This is intentionally simple — adapt the request/response format to match
whichever local model server you run (diffusers FastAPI, ComfyUI API, etc.).
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
            "prompt": prompt,
            "aspect_ratio": aspect_ratio,
            "quality": quality,
            "width": w,
            "height": h,
        }
        if negative_prompt:
            payload["negative_prompt"] = negative_prompt

        async with httpx.AsyncClient(timeout=300) as client:
            response = await client.post(f"{self._base()}/generate/text", json=payload)
            response.raise_for_status()
            img_bytes = response.content

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
