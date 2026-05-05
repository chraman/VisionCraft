from pydantic import BaseModel, Field


class CharacterDnaImmutableSchema(BaseModel):
    facial_topology: str
    skin_texture: str
    bone_structure: str
    body_morphology: str


class CharacterDnaDynamicSchema(BaseModel):
    wardrobe: str
    lighting: str


class CharacterDnaSchema(BaseModel):
    immutable: CharacterDnaImmutableSchema
    dynamic: CharacterDnaDynamicSchema
    anchoring_prefix: str
    extracted_at: str
    extraction_model: str
    face_anchor: str | None = None
    seed: int | None = None


class ExtractDnaRequest(BaseModel):
    source_image_url: str | None = None
    description: str | None = None
    name: str = Field(..., min_length=1, max_length=100)


class ExtractDnaResponse(BaseModel):
    influencer_id: str
    character_dna: CharacterDnaSchema


class GenerateInfluencerRequest(BaseModel):
    job_id: str
    user_id: str
    influencer_id: str
    character_dna: CharacterDnaSchema
    target_prompt: str = Field(..., min_length=3, max_length=2000)
    emotion_modifier: str | None = None
    scene_params: str | None = None
    model: str = "sdxl"
    aspect_ratio: str = "1:1"
    quality: str = "standard"
    use_int8: bool = False
    source_image_url: str | None = None
    reference_strength: float = 0.25
    scene_image_url: str | None = None


class GenerateInfluencerResponse(BaseModel):
    job_id: str
    image_key: str
    provider: str
    model: str
    width: int
    height: int
    seed: int | None = None
    anchored_prompt: str
