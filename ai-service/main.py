"""
AI Service — FastAPI
Handles text-to-image and image-to-image generation with dynamic provider failover.
Providers activated by env vars: STABILITY_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY,
HUGGINGFACE_API_KEY, LOCAL_MODEL_URL. Priority set via PROVIDER_PRIORITY.
"""
from fastapi import FastAPI
from pydantic import BaseModel

from routers.generation import router as generation_router

app = FastAPI(
    title="AI Image Service",
    description="Image generation service — dynamic provider failover (Stability AI, OpenAI, Gemini, HuggingFace, Local)",
    version="1.0.0",
)

app.include_router(generation_router)


class HealthResponse(BaseModel):
    status: str
    service: str


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", service="ai-service")


@app.get("/models")
async def list_models() -> dict:
    """List available AI models from the model registry."""
    return {
        "models": [
            {"id": "sdxl", "provider": "stability-ai", "description": "Stable Diffusion XL"},
            {"id": "dalle3", "provider": "openai", "description": "DALL-E 3"},
            {"id": "sdxl-turbo", "provider": "huggingface", "description": "SDXL Turbo"},
        ]
    }
