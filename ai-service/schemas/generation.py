from pydantic import BaseModel, Field


class GenerateTextRequest(BaseModel):
    job_id: str
    user_id: str
    prompt: str
    negative_prompt: str | None = None
    model: str = "sdxl"
    aspect_ratio: str = "1:1"
    quality: str = "standard"


class GenerateImageRequest(BaseModel):
    job_id: str
    user_id: str
    image_url: str  # S3 key from uploads bucket
    prompt: str
    strength: float = Field(default=0.75, ge=0.1, le=1.0)
    model: str = "sdxl"


class GenerateResponse(BaseModel):
    job_id: str
    image_key: str   # S3 key in generated bucket
    provider: str
    model: str
    width: int
    height: int
    seed: int | None = None
