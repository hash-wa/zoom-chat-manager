import { timingSafeEqual } from "node:crypto";

export function checkPassword(password: string): boolean {
  const expected = process.env.APP_PASSWORD;
  if (!expected) {
    throw new Error("APP_PASSWORD environment variable is not set");
  }
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
