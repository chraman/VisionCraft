"""OpenAI DALL-E 3 provider."""
import io
import httpx
from openai import AsyncOpenAI
from config.settings import settings
from providers import BaseProvider, ASPECT_RATIO_TO_SIZE


class OpenAIProvider(BaseProvider):
    @property
    def name(self) -> str:
        return "openai"

    def is_available(self) -> bool:
        return bool(settings.openai_api_key)

    def _client(self) -> AsyncOpenAI:
        return AsyncOpenAI(api_key=settings.openai_api_key)

    def _size_str(self, aspect_ratio: str) -> str:
        w, h = ASPECT_RATIO_TO_SIZE.get(aspect_ratio, (1024, 1024))
        # DALL-E 3 supports: 1024x1024, 1792x1024, 1024x1792
        if w > h:
            return "1792x1024"
        if h > w:
            return "1024x1792"
        return "1024x1024"

    async def generate_text(
        self, prompt: str, negative_prompt: str | None, aspect_ratio: str, quality: str
    ) -> tuple[bytes, int, int]:
        dall_e_quality = "hd" if quality == "hd" else "standard"
        size = self._size_str(aspect_ratio)
        w_str, h_str = size.split("x")

        response = await self._client().images.generate(
            model="dall-e-3",
            prompt=prompt[:4000],
            size=size,  # type: ignore[arg-type]
            quality=dall_e_quality,  # type: ignore[arg-type]
            n=1,
            response_format="url",
        )
        url = response.data[0].url
        if not url:
            raise RuntimeError("OpenAI returned no image URL")

        async with httpx.AsyncClient(timeout=60) as client:
            img_response = await client.get(url)
            img_response.raise_for_status()
            img_bytes = img_response.content

        return img_bytes, int(w_str), int(h_str)

    async def generate_image(
        self, image_bytes: bytes, prompt: str, strength: float, aspect_ratio: str
    ) -> tuple[bytes, int, int]:
        # DALL-E 3 does not natively support img2img; fall through to next provider.
        raise NotImplementedError("OpenAI DALL-E 3 does not support image-to-image generation")
