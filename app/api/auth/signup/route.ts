import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase/server";

/**
 * POST /api/auth/signup
 *
 * Sign up with email and password. Returns the session containing the JWT
 * when email confirmation is disabled. When confirmation is required,
 * returns user info and a message to check email.
 *
 * Request body: { email: string, password: string }
 * Response: { access_token, refresh_token, user, expires_in } or { user, message } when confirmation required
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

    const { data, error } = await getSupabase().auth.signUp({
      email: String(email).trim(),
      password: String(password),
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (data.session && data.user) {
      return NextResponse.json({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in,
        user: {
          id: data.user.id,
          email: data.user.email,
        },
      });
    }

    return NextResponse.json({
      user:
        data.user != null
          ? { id: data.user.id, email: data.user.email }
          : null,
      message:
        "Account created. Please check your email to confirm your account before signing in.",
    });
  } catch (err) {
    console.error("[auth/signup]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
