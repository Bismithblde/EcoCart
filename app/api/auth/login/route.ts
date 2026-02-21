import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase/server";

/**
 * POST /api/auth/login
 *
 * Login with email and password. Returns the session containing the JWT.
 *
 * Request body: { email: string, password: string }
 * Response: { access_token, refresh_token, user, expires_in } on success
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const { data, error } = await getSupabase().auth.signInWithPassword({
      email: String(email).trim(),
      password: String(password),
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
        { status: 500 }
      );
    }

    return NextResponse.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });
  } catch (err) {
    console.error("[auth/login]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
