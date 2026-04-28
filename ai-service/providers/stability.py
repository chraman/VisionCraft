"""Stability AI REST API provider (v2beta)."""
import io
import httpx
from PIL import Image as PILImage
from config.settings import settings
from providers import BaseProvider, ASPECT_RATIO_TO_SIZE

_BASE = "https://api.stability.ai/v2beta/stable-image/generate"


class StabilityProvider(BaseProvider):
    @property
    def name(self) -> str:
        return "stability-ai"

    def is_available(self) -> bool:
        return bool(settings.stability_api_key)

    async def generate_text(
        self, prompt: str, negative_prompt: str | None, aspect_ratio: str, quality: str
    ) -> tuple[bytes, int, int]:
        headers = {
            "Authorization": f"Bearer {settings.stability_api_key}",
            "Accept": "image/*",
        }
        data: dict[str, str] = {
            "prompt": prompt[:2000],
            "aspect_ratio": aspect_ratio,
            "output_format": "png",
        }
        if negative_prompt:
            data["negative_prompt"] = negative_prompt

        async with httpx.AsyncClient(timeout=90) as client:
            response = await client.post(f"{_BASE}/ultra", headers=headers, data=data)
            response.raise_for_status()
            img_bytes = response.content

        w, h = ASPECT_RATIO_TO_SIZE.get(aspect_ratio, (1024, 1024))
        return img_bytes, w, h

    async def generate_image(
        self, image_bytes: bytes, prompt: str, strength: float, aspect_ratio: str
    ) -> tuple[bytes, int, int]:
        headers = {
            "Authorization": f"Bearer {settings.stability_api_key}",
            "Accept": "image/*",
        }
        # Determine output size from aspect ratio
        w, h = ASPECT_RATIO_TO_SIZE.get(aspect_ratio, (1024, 1024))

        async with httpx.AsyncClient(timeout=90) as client:
            response = await client.post(
                f"{_BASE}/sd3",
                headers=headers,
                data={
                    "prompt": prompt[:2000],
                    "strength": str(strength),
                    "output_format": "png",
                    "mode": "image-to-image",
                },
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
