import { createUserClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type { Profile } from "@/lib/supabase/database.types";
import { AppError } from "@/lib/errors";

export async function getSessionUser() {
  const supabase = await createUserClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return null;
  }
  return data.user;
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) {
    throw new AppError("Sign in required", "unauthenticated", 401);
  }
  return user;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) {
    logger.error("profile lookup failed", { code: error.code });
    return null;
  }
  return data;
}

export async function requireProfile() {
  const user = await requireUser();
  let profile = await getProfile(user.id);
  if (!profile) {
    const admin = createAdminClient();
    const displayName =
      typeof user.user_metadata?.display_name === "string"
        ? user.user_metadata.display_name
        : (user.email?.split("@")[0] ?? "user");
    await admin.from("profiles").upsert({
      id: user.id,
      email: user.email ?? "",
      display_name: displayName,
    });
    await admin.from("user_preferences").upsert({ user_id: user.id });
    profile = await getProfile(user.id);
  }
  if (!profile) {
    throw new AppError("Profile is missing", "profile_missing", 500);
  }
  return { user, profile };
}

export async function requireAdmin() {
  const ctx = await requireProfile();
  if (ctx.profile.role !== "admin") {
    throw new AppError("Admin access required", "forbidden", 403);
  }
  return ctx;
}
