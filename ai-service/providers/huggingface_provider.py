"""HuggingFace Inference API provider."""
import io
import httpx
from PIL import Image as PILImage
from config.settings import settings
from providers import BaseProvider, ASPECT_RATIO_TO_SIZE

_TEXT2IMG_MODEL = "stabilityai/stable-diffusion-xl-base-1.0"
_IMG2IMG_MODEL = "stabilityai/stable-diffusion-xl-base-1.0"
_API_BASE = "https://api-inference.huggingface.co/models"


class HuggingFaceProvider(BaseProvider):
    @property
    def name(self) -> str:
        return "huggingface"

    def is_available(self) -> bool:
        return bool(settings.huggingface_api_key)

    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {settings.huggingface_api_key}"}

    async def generate_text(
        self, prompt: str, negative_prompt: str | None, aspect_ratio: str, quality: str
    ) -> tuple[bytes, int, int]:
        w, h = ASPECT_RATIO_TO_SIZE.get(aspect_ratio, (1024, 1024))
        payload: dict = {"inputs": prompt[:2000], "parameters": {"width": w, "height": h}}
        if negative_prompt:
            payload["parameters"]["negative_prompt"] = negative_prompt

        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(
                f"{_API_BASE}/{_TEXT2IMG_MODEL}",
                headers=self._headers(),
                json=payload,
            )
            response.raise_for_status()
            img_bytes = response.content

        return img_bytes, w, h

    async def generate_image(
        self, image_bytes: bytes, prompt: str, strength: float, aspect_ratio: str
    ) -> tuple[bytes, int, int]:
        w, h = ASPECT_RATIO_TO_SIZE.get(aspect_ratio, (1024, 1024))

        # HuggingFace img2img via image-to-image pipeline
        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(
                f"{_API_BASE}/{_IMG2IMG_MODEL}",
                headers=self._headers(),
                content=image_bytes,
                params={"prompt": prompt[:2000], "strength": strength},
            )
            response.raise_for_status()
            result_bytes = response.content

        try:
            img = PILImage.open(io.BytesIO(result_bytes))
            actual_w, actual_h = img.size
        except Exception:
            actual_w, actual_h = w, h

        return result_bytes, actual_w, actual_h
