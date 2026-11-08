import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getServerEnv, supabasePublicConfigured } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

export async function createUserClient() {
  if (!supabasePublicConfigured()) {
    throw new Error("Supabase public environment is not configured");
  }
  const env = getServerEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const cookie of cookiesToSet) {
            cookieStore.set(cookie.name, cookie.value, cookie.options);
          }
        } catch {
          // Called from a Server Component; middleware refreshes the session.
        }
      },
    },
  });
}
