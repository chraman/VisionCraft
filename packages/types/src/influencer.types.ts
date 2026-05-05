export interface CharacterDnaImmutable {
  facial_topology: string;
  skin_texture: string;
  bone_structure: string;
  body_morphology: string;
}

export interface CharacterDnaDynamic {
  wardrobe: string;
  lighting: string;
}

export interface CharacterDna {
  immutable: CharacterDnaImmutable;
  dynamic: CharacterDnaDynamic;
  anchoring_prefix: string;
  extracted_at: string;
  extraction_model: string;
}

export interface Influencer {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  sourceImageUrl: string | null;
  characterDna: CharacterDna;
  isPublic: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ExtractDnaRequest {
  name: string;
  sourceImageUrl?: string;
  descriptionText?: string;
  description?: string;
}

export interface GenerateInfluencerRequest {
  influencerId: string;
  targetPrompt: string;
  emotionModifier?: string;
  sceneParams?: string;
  dynamicOverrides?: Partial<CharacterDnaDynamic>;
  model?: string;
  aspectRatio?: string;
  quality?: string;
  useInt8?: boolean;
}
