"""
Dynamic provider registry.

Providers are activated by setting the corresponding env var:
  local      → LOCAL_MODEL_URL
  stability  → STABILITY_API_KEY
  openai     → OPENAI_API_KEY
  gemini     → GEMINI_API_KEY
  huggingface → HUGGINGFACE_API_KEY

Priority order is set via PROVIDER_PRIORITY env var (default: stability,openai,gemini,huggingface).
"""
from __future__ import annotations

from abc import ABC, abstractmethod

from config.settings import settings

# Stability AI aspect_ratio strings map directly; OpenAI needs WxH strings.
ASPECT_RATIO_TO_SIZE: dict[str, tuple[int, int]] = {
    "1:1": (1024, 1024),
    "16:9": (1344, 768),
    "9:16": (768, 1344),
    "4:3": (1152, 896),
    "3:4": (896, 1152),
}


class ProviderUnavailableError(Exception):
    pass


class BaseProvider(ABC):
    @abstractmethod
    def is_available(self) -> bool:
        """Return True if the provider's API key / URL is configured."""

    @abstractmethod
    async def generate_text(
        self, prompt: str, negative_prompt: str | None, aspect_ratio: str, quality: str
    ) -> tuple[bytes, int, int]:
        """Return (png_bytes, width, height)."""

    @abstractmethod
    async def generate_image(
        self, image_bytes: bytes, prompt: str, strength: float, aspect_ratio: str
    ) -> tuple[bytes, int, int]:
        """Return (png_bytes, width, height)."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Provider identifier returned in API responses."""


def build_active_providers() -> list[BaseProvider]:
    """
    Build the list of active providers in priority order.
    Skips any provider whose key/URL is not configured.
    Called once at app startup.
    """
    from providers.local_provider import LocalProvider
    from providers.stability import StabilityProvider
    from providers.openai_provider import OpenAIProvider
    from providers.gemini_provider import GeminiProvider
    from providers.huggingface_provider import HuggingFaceProvider

    registry: dict[str, BaseProvider] = {
        "local": LocalProvider(),
        "stability": StabilityProvider(),
        "openai": OpenAIProvider(),
        "gemini": GeminiProvider(),
        "huggingface": HuggingFaceProvider(),
    }

    priority = [p.strip() for p in settings.provider_priority.split(",")]
    active = [registry[p] for p in priority if p in registry and registry[p].is_available()]

    # Return empty list — the failover loop will raise ProviderUnavailableError at
    # request time, producing a proper 503 instead of crashing at startup.
    return active
