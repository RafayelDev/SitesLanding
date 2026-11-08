import { z } from "zod";
import { ASPECT_RATIOS, MAX_PROMPT_LENGTH, MIN_PROMPT_LENGTH, STYLE_PRESETS } from "@/lib/constants";

const styleIds = STYLE_PRESETS.map((item) => item.id) as [string, ...string[]];
const aspectIds = ASPECT_RATIOS.map((item) => item.id) as [string, ...string[]];

export const generateInputSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(MIN_PROMPT_LENGTH, "Prompt must be at least 3 characters")
    .max(MAX_PROMPT_LENGTH, "Prompt is too long")
    .refine((value) => !containsControlChars(value), "Prompt contains invalid characters"),
  style: z.enum(styleIds),
  aspectRatio: z.enum(aspectIds),
});

export type GenerateInput = z.infer<typeof generateInputSchema>;

export const registerSchema = z
  .object({
    email: z.string().trim().email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    displayName: z.string().trim().min(1).max(80).optional().or(z.literal("")),
  });

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
});

export const updatePasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
});

export const preferencesUpdateSchema = z.object({
  defaultStyle: z.enum(styleIds),
  defaultAspectRatio: z.enum(aspectIds),
});

export const galleryQuerySchema = z.object({
  q: z.string().trim().max(200).optional().default(""),
  style: z.enum(["all", ...styleIds]).optional().default("all"),
  favorites: z.enum(["0", "1"]).optional().default("0"),
  page: z.coerce.number().int().min(1).optional().default(1),
});

export const uuidSchema = z.string().uuid();

export const adminLimitSchema = z.object({
  userId: z.string().uuid(),
  monthlyGenerationLimit: z.coerce.number().int().min(0).max(10_000),
});

export const JOB_STATUSES = ["pending", "processing", "completed", "failed"] as const;

const ALLOWED_TRANSITIONS: Record<string, readonly string[]> = {
  pending: ["processing", "failed"],
  processing: ["completed", "failed", "processing"],
  completed: ["completed"],
  failed: ["processing", "failed"],
};

export function assertJobTransition(from: string, to: string): void {
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed || !allowed.includes(to)) {
    throw new Error(`Illegal job transition ${from} → ${to}`);
  }
}

export function containsControlChars(value: string): boolean {
  return /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value);
}

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !result[key]) {
      result[key] = issue.message;
    }
  }
  return result;
}
