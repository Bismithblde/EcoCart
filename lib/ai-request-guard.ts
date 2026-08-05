import { NextRequest, NextResponse } from "next/server";
import { getAccessTokenFromRequest, getUserIdFromToken } from "@/lib/api-auth";

const WINDOW_MS = 60_000;
const MAX_CREDITS_PER_WINDOW = 12;

interface UsageBucket {
  windowStartedAt: number;
  credits: number;
}

const usageByUser = new Map<string, UsageBucket>();

type AuthorizationResult =
  | { userId: string }
  | { response: NextResponse };

/**
 * Protect paid AI routes with Supabase authentication and a small instance-local
 * usage boundary. This is deliberately lightweight for a portfolio demo.
 */
export async function authorizeAiRequest(
  request: NextRequest,
  credits = 1
): Promise<AuthorizationResult> {
  const token = getAccessTokenFromRequest(request);
  if (!token) {
    return {
      response: NextResponse.json(
        { error: "Sign in to run sustainability analysis" },
        { status: 401 }
      ),
    };
  }

  let userId: string | null = null;
  try {
    userId = await getUserIdFromToken(token);
  } catch {
    userId = null;
  }
  if (!userId) {
    return {
      response: NextResponse.json(
        { error: "Your session is invalid or expired" },
        { status: 401 }
      ),
    };
  }

  const now = Date.now();
  for (const [id, bucket] of usageByUser) {
    if (now - bucket.windowStartedAt >= WINDOW_MS) usageByUser.delete(id);
  }

  const bucket = usageByUser.get(userId);
  const activeBucket =
    bucket && now - bucket.windowStartedAt < WINDOW_MS
      ? bucket
      : { windowStartedAt: now, credits: 0 };

  if (activeBucket.credits + credits > MAX_CREDITS_PER_WINDOW) {
    const retryAfter = Math.max(
      1,
      Math.ceil((WINDOW_MS - (now - activeBucket.windowStartedAt)) / 1000)
    );
    return {
      response: NextResponse.json(
        { error: "Too many AI requests. Try again in a moment." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      ),
    };
  }

  activeBucket.credits += credits;
  usageByUser.set(userId, activeBucket);
  return { userId };
}
