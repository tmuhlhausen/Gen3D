export type GenerationMode = 'text_to_3d' | 'image_to_3d' | 'mesh_to_mesh';
export type GenerationQuality = 'draft' | 'standard' | 'high' | 'hero';
export type ExportFormat = 'glb' | 'fbx' | 'obj' | 'usdz';

export interface GenerationRequest {
  prompt: string;
  negative_prompt?: string;
  mode: GenerationMode;
  style?: string;
  quality?: GenerationQuality;
  texture_resolution?: number;
  target_polycount?: number;
  export_format?: ExportFormat;
  seed?: number;
  reference_asset_ids?: string[];
}

export interface AssetPlan {
  asset_type: string;
  components: string[];
  materials: string[];
  constraints: string[];
  target_polycount: number;
  texture_resolution: number;
  export_format: ExportFormat;
}

export interface GenerationJob {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  request: GenerationRequest;
  plan: AssetPlan;
  preview_url?: string;
  output_url?: string;
  created_at: string;
  updated_at: string;
}
