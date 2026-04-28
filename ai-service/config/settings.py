from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Provider API keys / URLs
    stability_api_key: str = ""
    openai_api_key: str = ""
    gemini_api_key: str = ""
    huggingface_api_key: str = ""
    local_model_url: str = ""  # e.g. https://xxxx.ngrok.io

    # Provider priority — comma-separated, left = highest priority
    # Only providers with their key/URL set are active
    provider_priority: str = "stability,openai,gemini,huggingface"

    # AWS — for uploading generated images to S3 (or MinIO locally)
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "us-east-1"
    aws_bucket_generated: str = ""
    aws_bucket_uploads: str = ""
    aws_endpoint_url: str = ""  # Set to http://localhost:9000 for local MinIO

    # Safety
    safety_enabled: bool = False

    # App
    port: int = 8000
    service_name: str = "ai-service"
    log_level: str = "info"

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"  # ignore unknown env vars (APP_ENV, NODE_ENV, etc.)


settings = Settings()
