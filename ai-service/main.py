"""
AI Service — FastAPI
Sprint 4: Full provider implementation with Stability AI, OpenAI, HuggingFace
For now: stub endpoints
"""
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(
    title="AI Image Service",
    description="Image generation service — Stability AI + OpenAI + HuggingFace",
    version="0.0.0",
)


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
