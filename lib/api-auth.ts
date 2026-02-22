import type { NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase/server";

export function getAccessTokenFromRequest(request: NextRequest): string | null {
  const auth = request.headers.get("authorization");
  if (!auth || !/^Bearer\s+/i.test(auth)) return null;
  return auth.replace(/^Bearer\s+/i, "").trim();
}

export async function getUserIdFromToken(token: string): Promise<string | null> {
  const {
    data: { user },
  } = await getSupabase().auth.getUser(token);
  return user?.id ?? null;
}
