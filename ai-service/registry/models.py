"""
Model registry — add new AI models here. Nothing else changes.
See: CLAUDE.md §12.2
"""
from typing import TypedDict


class ModelConfig(TypedDict):
    provider: str
    version: str


MODEL_REGISTRY: dict[str, ModelConfig] = {
    "sdxl": {
        "provider": "stability",
        "version": "stable-diffusion-xl-1024-v1-0",
    },
    "dalle3": {
        "provider": "openai",
        "version": "dall-e-3",
    },
    "sdxl-turbo": {
        "provider": "huggingface",
        "version": "stabilityai/sdxl-turbo",
    },
}

# Provider failover order (CLAUDE.md §12.3)
PROVIDER_FAILOVER_ORDER = ["stability", "openai", "huggingface"]
