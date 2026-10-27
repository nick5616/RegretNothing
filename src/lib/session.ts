import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { deleteSession, hashToken, newToken, userForSession } from "./auth";
import { getDb } from "./db";

const SESSION_COOKIE = "rn_session";
const GIFTER_COOKIE = "rn_gifter";
const secure = process.env.NODE_ENV === "production";

export const currentUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return userForSession(await getDb(), token);
});

export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

export async function setSessionCookie(session: { token: string; expiresAt: Date }) {
  (await cookies()).set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    expires: session.expiresAt,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(await getDb(), token);
  jar.delete(SESSION_COOKIE);
}

/** Hash of this browser's anonymous gifter token, or null if it has never claimed anything. */
export async function readGifterHash(): Promise<string | null> {
  const token = (await cookies()).get(GIFTER_COOKIE)?.value;
  return token ? hashToken(token) : null;
}

/** Same as readGifterHash, but mints the token on first use. Only callable from actions. */
export async function ensureGifterHash(): Promise<string> {
  const jar = await cookies();
  let token = jar.get(GIFTER_COOKIE)?.value;
  if (!token) {
    token = newToken();
    jar.set(GIFTER_COOKIE, token, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 60 * 60 * 24 * 400 });
  }
  return hashToken(token);
}
