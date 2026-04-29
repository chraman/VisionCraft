"""Generation service — provider failover + S3 upload."""
import logging
import sys

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError

from config.settings import settings
from providers import BaseProvider, ProviderUnavailableError

logger = logging.getLogger("ai-service")


def _log(msg: str) -> None:
    logger.info(msg)
    print(msg, flush=True)


def _err(msg: str) -> None:
    logger.error(msg)
    print(f"ERROR: {msg}", file=sys.stderr, flush=True)


async def generate_text_with_failover(
    providers: list[BaseProvider],
    prompt: str,
    negative_prompt: str | None,
    aspect_ratio: str,
    quality: str,
) -> tuple[bytes, int, int, str]:
    last_err: Exception | None = None
    for provider in providers:
        _log(f"[ai-service] trying provider={provider.name}")
        try:
            img_bytes, w, h = await provider.generate_text(
                prompt, negative_prompt, aspect_ratio, quality
            )
            _log(f"[ai-service] provider={provider.name} succeeded size={w}x{h} bytes={len(img_bytes)}")
            return img_bytes, w, h, provider.name
        except NotImplementedError:
            _log(f"[ai-service] provider={provider.name} skipped (NotImplemented)")
            continue
        except Exception as err:
            _err(f"[ai-service] provider={provider.name} failed: {err}")
            last_err = err

    raise ProviderUnavailableError(f"All providers failed. Last: {last_err}")


async def generate_image_with_failover(
    providers: list[BaseProvider],
    image_bytes: bytes,
    prompt: str,
    strength: float,
    aspect_ratio: str,
) -> tuple[bytes, int, int, str]:
    last_err: Exception | None = None
    for provider in providers:
        _log(f"[ai-service] img2img trying provider={provider.name}")
        try:
            result_bytes, w, h = await provider.generate_image(
                image_bytes, prompt, strength, aspect_ratio
            )
            _log(f"[ai-service] img2img provider={provider.name} succeeded size={w}x{h}")
            return result_bytes, w, h, provider.name
        except NotImplementedError:
            continue
        except Exception as err:
            _err(f"[ai-service] img2img provider={provider.name} failed: {err}")
            last_err = err

    raise ProviderUnavailableError(f"All providers failed. Last: {last_err}")


def upload_to_s3(image_bytes: bytes, job_id: str, user_id: str) -> str:
    if not settings.aws_bucket_generated:
        raise RuntimeError("AWS_BUCKET_GENERATED is not configured")

    key = f"generated/{user_id}/{job_id}.png"

    _log(
        f"[ai-service] upload_to_s3 starting: bucket={settings.aws_bucket_generated} "
        f"key={key} endpoint={settings.aws_endpoint_url or 'AWS'} "
        f"region={settings.aws_region} bytes={len(image_bytes)}"
    )

    s3_kwargs: dict = {}
    if settings.aws_access_key_id and settings.aws_secret_access_key:
        s3_kwargs["aws_access_key_id"] = settings.aws_access_key_id
        s3_kwargs["aws_secret_access_key"] = settings.aws_secret_access_key
    if settings.aws_endpoint_url:
        s3_kwargs["endpoint_url"] = settings.aws_endpoint_url

    # path-style addressing required for MinIO (same as forcePathStyle:true in Node SDK)
    s3_config = Config(
        signature_version="s3v4",
        s3={"addressing_style": "path"},
    )

    try:
        s3 = boto3.client("s3", region_name=settings.aws_region, config=s3_config, **s3_kwargs)
        s3.put_object(
            Bucket=settings.aws_bucket_generated,
            Key=key,
            Body=image_bytes,
            ContentType="image/png",
        )
        _log(f"[ai-service] upload_to_s3 succeeded: key={key}")
    except Exception as err:
        _err(f"[ai-service] upload_to_s3 FAILED ({type(err).__name__}): {err}")
        raise RuntimeError(f"S3 upload failed: {err}") from err

    return key
