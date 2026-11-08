import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
});

const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  APP_URL: z.string().url().optional(),
  REPLICATE_API_TOKEN: z.string().min(1).optional(),
  REPLICATE_WEBHOOK_SECRET: z.string().min(1).optional(),
  REPLICATE_MODEL: z.string().min(1).optional(),
  GENERATION_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
  DEFAULT_MONTHLY_GENERATION_LIMIT: z.coerce.number().int().nonnegative().optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

export function readPublicEnv() {
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  return parsed.success ? parsed.data : {};
}

export function supabasePublicConfigured(): boolean {
  const env = readPublicEnv();
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getServerEnv(): ServerEnv {
  const parsed = serverSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    APP_URL: process.env.APP_URL,
    REPLICATE_API_TOKEN: process.env.REPLICATE_API_TOKEN,
    REPLICATE_WEBHOOK_SECRET: process.env.REPLICATE_WEBHOOK_SECRET,
    REPLICATE_MODEL: process.env.REPLICATE_MODEL,
    GENERATION_TIMEOUT_MS: process.env.GENERATION_TIMEOUT_MS,
    DEFAULT_MONTHLY_GENERATION_LIMIT: process.env.DEFAULT_MONTHLY_GENERATION_LIMIT,
  });

  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid server environment: ${fields}`);
  }

  return parsed.data;
}

export function tryGetServerEnv():
  | { ok: true; env: ServerEnv }
  | { ok: false; missing: string[] } {
  try {
    return { ok: true, env: getServerEnv() };
  } catch {
    const missing: string[] = [];
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
    return { ok: false, missing: missing.length ? missing : ["invalid values"] };
  }
}

export function providerConfigured(): boolean {
  return Boolean(process.env.REPLICATE_API_TOKEN);
}

export function appUrl(): string {
  return (
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}
