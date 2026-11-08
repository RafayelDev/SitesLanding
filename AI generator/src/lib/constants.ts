export const APP_NAME = "PixelForge AI";
export const STORAGE_BUCKET = "generated-images";
export const GALLERY_PAGE_SIZE = 12;
export const GENERATE_RATE_LIMIT_WINDOW_MS = 60_000;
export const GENERATE_RATE_LIMIT_MAX = 8;
export const DEFAULT_MONTHLY_LIMIT = 50;
export const MAX_PROMPT_LENGTH = 2000;
export const MIN_PROMPT_LENGTH = 3;

export const STYLE_PRESETS = [
  {
    id: "photorealistic",
    label: "Photorealistic",
    suffix: "photorealistic photography, natural lighting, highly detailed, 35mm",
  },
  {
    id: "cinematic",
    label: "Cinematic",
    suffix: "cinematic still, dramatic lighting, anamorphic, film grain, color graded",
  },
  {
    id: "digital-art",
    label: "Digital art",
    suffix: "digital illustration, sharp linework, vibrant colors, artstation",
  },
  {
    id: "anime",
    label: "Anime",
    suffix: "anime style, studio lighting, clean lineart, expressive",
  },
  {
    id: "oil-painting",
    label: "Oil painting",
    suffix: "oil painting on canvas, visible brushstrokes, classical composition",
  },
  {
    id: "watercolor",
    label: "Watercolor",
    suffix: "watercolor painting, soft pigment blooms, paper texture",
  },
  {
    id: "pixel-art",
    label: "Pixel art",
    suffix: "pixel art, 16-bit, limited palette, crisp pixels",
  },
  {
    id: "3d-render",
    label: "3D render",
    suffix: "octane 3d render, subsurface scattering, studio lighting, ultra detailed",
  },
] as const;

export const ASPECT_RATIOS = [
  { id: "1:1", label: "Square 1:1", width: 1024, height: 1024 },
  { id: "16:9", label: "Landscape 16:9", width: 1344, height: 768 },
  { id: "9:16", label: "Portrait 9:16", width: 768, height: 1344 },
  { id: "4:3", label: "Classic 4:3", width: 1152, height: 896 },
  { id: "3:4", label: "Classic 3:4", width: 896, height: 1152 },
] as const;

export type StyleId = (typeof STYLE_PRESETS)[number]["id"];
export type AspectRatioId = (typeof ASPECT_RATIOS)[number]["id"];
export type JobStatus = "pending" | "processing" | "completed" | "failed";
export type UserRole = "user" | "admin";

export function styleById(id: string) {
  return STYLE_PRESETS.find((item) => item.id === id);
}

export function aspectById(id: string) {
  return ASPECT_RATIOS.find((item) => item.id === id);
}

export function composePrompt(prompt: string, styleId: StyleId): string {
  const style = styleById(styleId);
  const trimmed = prompt.trim();
  if (!style) {
    return trimmed;
  }
  return `${trimmed}. Style: ${style.suffix}`;
}
