import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, createSessionToken } from "@/lib/session";
import { checkPassword } from "@/lib/password";

export async function POST(req: NextRequest) {
  const { password } = (await req.json()) as { password?: string };

  if (!password || !checkPassword(password)) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const token = await createSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
