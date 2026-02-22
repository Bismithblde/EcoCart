"use client";

import { AuthProvider } from "@/contexts/AuthContext";

export default function AuthProviderClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthProvider>{children}</AuthProvider>;
}
