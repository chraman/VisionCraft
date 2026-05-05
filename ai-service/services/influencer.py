"""
Influencer service — DNA extraction and anchored prompt construction.

DNA extraction uses Gemini vision (source image) or Gemini text (description).
Raises ValueError on bad JSON/missing fields; RuntimeError on timeout.
"""
import asyncio
import hashlib
import json
import logging
import time
from datetime import datetime, timezone

logger = logging.getLogger("ai-service")

_DNA_SYSTEM_PROMPT = """You are a character DNA extractor for AI image generation.
Analyze the provided source (image or text description) and return a JSON object with this exact shape:

{
  "face_anchor": "<one-sentence precise face description: skin tone, face shape, eye color/shape, nose, lips, any distinctive features — 15-25 words>",
  "immutable": {
    "facial_topology": "<face shape, symmetry, e.g. 'oval face, high symmetry, wide-set eyes'>",
    "skin_texture": "<undertone and texture, e.g. 'warm olive undertone, smooth, low pore visibility'>",
    "bone_structure": "<structural features, e.g. 'high cheekbones, defined jawline, soft brow ridge'>",
    "body_morphology": "<build descriptors, e.g. 'athletic build, 5ft8 height class, upright posture'>"
  },
  "dynamic": {
    "wardrobe": "<style tokens, e.g. 'business casual, neutral tones, minimal accessories'>",
    "lighting": "<lighting preference, e.g. 'soft diffused natural light, warm temperature'>"
  }
}

Rules:
- Output ONLY valid JSON. No markdown fences, no explanation, no extra keys.
- face_anchor: a single sentence of 15-25 words capturing the most precise visual identity markers.
- All other values must be single strings (comma-separated descriptors, 8-20 words each).
- Immutable = permanent physical traits. Dynamic = context-dependent style choices."""


async def extract_character_dna(
    source_image_url: str | None,
    description: str | None,
    name: str = "",
    model_name: str = "gemini-2.0-flash",
    timeout_seconds: float = 15.0,
) -> dict:
    """
    Call Gemini to extract a CharacterDna dict from an image URL or text description.
    Returns the raw dict; caller validates against CharacterDnaSchema.
    """
    import google.generativeai as genai
    from config.settings import settings

    if not source_image_url and not description:
        raise ValueError("Either source_image_url or description must be provided")

    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel(model_name, system_instruction=_DNA_SYSTEM_PROMPT)

    start = time.monotonic()
    try:
        if source_image_url:
            import io
            import httpx
            import boto3
            import PIL.Image
            from botocore.exceptions import BotoCoreError, ClientError

            if source_image_url.startswith("http://") or source_image_url.startswith("https://"):
                async with httpx.AsyncClient(timeout=30) as client:
                    resp = await client.get(source_image_url)
                    resp.raise_for_status()
                    image_bytes = resp.content
            else:
                bucket = settings.aws_bucket_uploads or "uploads"
                s3_kwargs: dict = {}
                if settings.aws_access_key_id and settings.aws_secret_access_key:
                    s3_kwargs["aws_access_key_id"] = settings.aws_access_key_id
                    s3_kwargs["aws_secret_access_key"] = settings.aws_secret_access_key
                if settings.aws_endpoint_url:
                    s3_kwargs["endpoint_url"] = settings.aws_endpoint_url
                s3 = boto3.client("s3", region_name=settings.aws_region, **s3_kwargs)
                try:
                    obj = s3.get_object(Bucket=bucket, Key=source_image_url)
                    image_bytes = obj["Body"].read()
                except (BotoCoreError, ClientError) as err:
                    raise ValueError(f"Source image not found in S3: {err}") from err

            pil_image = PIL.Image.open(io.BytesIO(image_bytes))
            parts = ["Extract the character DNA from this image:", pil_image]
        else:
            parts = [f"Extract the character DNA from this description:\n{description}"]

        response = await asyncio.wait_for(
            model.generate_content_async(
                parts,
                generation_config={"max_output_tokens": 600, "temperature": 0.3},
            ),
            timeout=timeout_seconds,
        )

        elapsed_ms = int((time.monotonic() - start) * 1000)
        text = response.text.strip()

        # Strip markdown fences if Gemini adds them despite instructions
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]

        dna_dict = json.loads(text)

        required_immutable = {"facial_topology", "skin_texture", "bone_structure", "body_morphology"}
        required_dynamic = {"wardrobe", "lighting"}
        missing_imm = required_immutable - set(dna_dict.get("immutable", {}).keys())
        missing_dyn = required_dynamic - set(dna_dict.get("dynamic", {}).keys())
        if missing_imm:
            raise ValueError(f"Missing immutable DNA fields: {missing_imm}")
        if missing_dyn:
            raise ValueError(f"Missing dynamic DNA fields: {missing_dyn}")
        if not dna_dict.get("face_anchor"):
            raise ValueError("Missing face_anchor field in DNA extraction")

        imm = dna_dict["immutable"]
        dna_dict["anchoring_prefix"] = (
            f"{imm['facial_topology']}, {imm['skin_texture']}, "
            f"{imm['bone_structure']}, {imm['body_morphology']}, "
        )
        dna_dict["extracted_at"] = datetime.now(timezone.utc).isoformat()
        dna_dict["extraction_model"] = model_name
        # Deterministic seed from influencer name — same persona starts from the same latent space
        seed_input = name if name else dna_dict.get("face_anchor", "default")
        dna_dict["seed"] = int(hashlib.sha256(seed_input.encode()).hexdigest()[:8], 16) % (2 ** 32)

        logger.info(
            "DNA extracted: model=%s ms=%d prefix_len=%d",
            model_name, elapsed_ms, len(dna_dict["anchoring_prefix"]),
        )
        return dna_dict

    except json.JSONDecodeError as err:
        raise ValueError(f"Gemini returned invalid JSON for DNA extraction: {err}") from err
    except asyncio.TimeoutError:
        raise RuntimeError(f"DNA extraction timed out after {timeout_seconds}s")


def build_anchored_prompt(
    dna: dict,
    target_prompt: str,
    emotion_modifier: str | None = None,
    scene_params: str | None = None,
) -> str:
    """
    Construct the final generation prompt by injecting the DNA anchoring prefix.

    Structure: {face_anchor}, {anchoring_prefix}, {target_prompt}
               [, {emotion_modifier}][, {wardrobe}][, {lighting}][, {scene_params}]
    """
    parts = []
    if dna.get("face_anchor"):
        parts.append(dna["face_anchor"])
    parts += [dna["anchoring_prefix"], target_prompt.strip()]

    if emotion_modifier:
        parts.append(emotion_modifier.strip())

    dynamic = dna.get("dynamic", {})
    if dynamic.get("wardrobe"):
        parts.append(dynamic["wardrobe"])
    if dynamic.get("lighting"):
        parts.append(dynamic["lighting"])

    if scene_params:
        parts.append(scene_params.strip())

    return ", ".join(p.rstrip(", ") for p in parts if p)


# Fixed profile prompt — appended to every profile-mode generation to override
# any lighting/wardrobe drift that could come from the source image context.
_PROFILE_SUFFIX = (
    "simple fitted neutral clothing, plain light grey studio background, "
    "soft even diffused lighting, full body head to toe, natural relaxed stance, "
    "professional studio portrait, photorealistic, high detail"
)


def build_profile_prompt(dna: dict) -> str:
    """
    Prompt used exclusively for the canonical profile/preview image.

    Intentionally omits dynamic.wardrobe and dynamic.lighting — those describe
    the character's TYPICAL style, not the neutral reference shot. Using them
    here causes the profile image to inherit the source image outfit (e.g. saree,
    dark background) instead of a clean, readable full-body reference.
    """
    parts = []
    if dna.get("face_anchor"):
        parts.append(dna["face_anchor"])
    if dna.get("anchoring_prefix"):
        parts.append(dna["anchoring_prefix"].rstrip(", "))
    parts.append(_PROFILE_SUFFIX)
    return ", ".join(p for p in parts if p)
