import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase/server";

/**
 * POST /api/auth/refresh
 *
 * Exchange a refresh_token for a new access_token and refresh_token.
 * Request body: { refresh_token: string }
 * Response: { access_token, refresh_token, expires_in } on success
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const refresh_token = body.refresh_token;

    if (!refresh_token || typeof refresh_token !== "string") {
      return NextResponse.json(
        { error: "refresh_token is required" },
        { status: 400 }
      );
    }

    const { data, error } = await getSupabase().auth.refreshSession({
      refresh_token: refresh_token.trim(),
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    if (!data.session) {
      return NextResponse.json(
        { error: "No session returned" },
        { status: 401 }
      );
    }

    const user = data.session.user;
    return NextResponse.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      user: user
        ? { id: user.id, email: user.email ?? null }
        : { id: "", email: null },
    });
  } catch (err) {
    console.error("[auth/refresh]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
