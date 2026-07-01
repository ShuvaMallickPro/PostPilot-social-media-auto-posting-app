import { randomBytes } from "crypto";

export function generateOAuthState(): string {
  return randomBytes(32).toString("hex");
}

type OAuthCookieOptions = {
  name: string;
  value: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  maxAge: number;
  path: string;
};

export function createOAuthStateCookie(
  name: string,
  value: string,
): OAuthCookieOptions {
  return {
    name,
    value,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  };
}

export function clearOAuthStateCookie(name: string): OAuthCookieOptions {
  return {
    name,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  };
}
