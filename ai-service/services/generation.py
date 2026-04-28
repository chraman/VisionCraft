"""Generation service — provider failover + S3 upload."""
import logging

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from config.settings import settings
from providers import BaseProvider, ProviderUnavailableError

logger = logging.getLogger("ai-service")


async def generate_text_with_failover(
    providers: list[BaseProvider],
    prompt: str,
    negative_prompt: str | None,
    aspect_ratio: str,
    quality: str,
) -> tuple[bytes, int, int, str]:
    """Try each provider in order. Returns (png_bytes, width, height, provider_name)."""
    last_err: Exception | None = None
    for provider in providers:
        try:
            img_bytes, w, h = await provider.generate_text(
                prompt, negative_prompt, aspect_ratio, quality
            )
            return img_bytes, w, h, provider.name
        except NotImplementedError:
            continue
        except Exception as err:
            logger.warning("Provider %s failed for text generation: %s", provider.name, err)
            last_err = err

    raise ProviderUnavailableError(
        f"All configured providers failed. Last error: {last_err}"
    )


async def generate_image_with_failover(
    providers: list[BaseProvider],
    image_bytes: bytes,
    prompt: str,
    strength: float,
    aspect_ratio: str,
) -> tuple[bytes, int, int, str]:
    """Try each provider in order. Returns (png_bytes, width, height, provider_name)."""
    last_err: Exception | None = None
    for provider in providers:
        try:
            result_bytes, w, h = await provider.generate_image(
                image_bytes, prompt, strength, aspect_ratio
            )
            return result_bytes, w, h, provider.name
        except NotImplementedError:
            continue
        except Exception as err:
            logger.warning("Provider %s failed for image generation: %s", provider.name, err)
            last_err = err

    raise ProviderUnavailableError(
        f"All configured providers failed. Last error: {last_err}"
    )


def upload_to_s3(image_bytes: bytes, job_id: str, user_id: str) -> str:
    """Upload PNG bytes to the generated images bucket. Returns the S3 key."""
    if not settings.aws_bucket_generated:
        raise RuntimeError("AWS_BUCKET_GENERATED is not configured")

    key = f"generated/{user_id}/{job_id}.png"

    s3_kwargs: dict = {}
    if settings.aws_access_key_id and settings.aws_secret_access_key:
        s3_kwargs["aws_access_key_id"] = settings.aws_access_key_id
        s3_kwargs["aws_secret_access_key"] = settings.aws_secret_access_key
    # Use settings (pydantic-settings reads .env); don't rely on os.getenv which
    # won't see .env values unless load_dotenv() was called separately.
    if settings.aws_endpoint_url:
        s3_kwargs["endpoint_url"] = settings.aws_endpoint_url

    s3 = boto3.client("s3", region_name=settings.aws_region, **s3_kwargs)
    try:
        s3.put_object(
            Bucket=settings.aws_bucket_generated,
            Key=key,
            Body=image_bytes,
            ContentType="image/png",
        )
    except (BotoCoreError, ClientError) as err:
        raise RuntimeError(f"S3 upload failed: {err}") from err

    return key
