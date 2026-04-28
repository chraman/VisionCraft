"""Google Imagen 3 provider via google-generativeai SDK."""
import io
from config.settings import settings
from providers import BaseProvider, ASPECT_RATIO_TO_SIZE


class GeminiProvider(BaseProvider):
    @property
    def name(self) -> str:
        return "google-imagen"

    def is_available(self) -> bool:
        return bool(settings.gemini_api_key)

    async def generate_text(
        self, prompt: str, negative_prompt: str | None, aspect_ratio: str, quality: str
    ) -> tuple[bytes, int, int]:
        import google.generativeai as genai  # type: ignore[import]

        genai.configure(api_key=settings.gemini_api_key)
        imagen = genai.ImageGenerationModel("imagen-3.0-generate-001")

        w, h = ASPECT_RATIO_TO_SIZE.get(aspect_ratio, (1024, 1024))
        # Imagen 3 supports aspect_ratio as "1:1", "3:4", "4:3", "9:16", "16:9"
        result = imagen.generate_images(
            prompt=prompt[:2000],
            number_of_images=1,
            aspect_ratio=aspect_ratio,
        )

        image_data = result.images[0]
        img_bytes = image_data._image_bytes  # type: ignore[attr-defined]
        return img_bytes, w, h

    async def generate_image(
        self, image_bytes: bytes, prompt: str, strength: float, aspect_ratio: str
    ) -> tuple[bytes, int, int]:
        # Imagen 3 does not expose img2img in the current generativeai SDK;
        # fall through to next provider.
        raise NotImplementedError("Google Imagen 3 does not support image-to-image via this SDK")
