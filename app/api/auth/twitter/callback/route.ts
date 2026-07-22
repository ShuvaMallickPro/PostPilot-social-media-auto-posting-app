import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { upsertTwitterAccount } from "@/lib/accounts";
import {
  OAUTH_PKCE_COOKIE,
  OAUTH_STATE_COOKIE,
} from "@/lib/constants/platforms";
import { clearOAuthStateCookie } from "@/lib/oauth/cookies";
import { redirectToAccounts } from "@/lib/oauth/redirect";
import {
  exchangeTwitterCode,
  fetchTwitterProfile,
  getTwitterRedirectUri,
} from "@/lib/twitter";

export async function GET(req: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.redirect(
      redirectToAccounts(req, { error: "unauthorized" }),
    );
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieState = req.cookies.get(OAUTH_STATE_COOKIE.twitter)?.value;
  const codeVerifier = req.cookies.get(OAUTH_PKCE_COOKIE.twitter)?.value;

  const clearOAuthCookies = (response: NextResponse) => {
    response.cookies.set(clearOAuthStateCookie(OAUTH_STATE_COOKIE.twitter));
    response.cookies.set(clearOAuthStateCookie(OAUTH_PKCE_COOKIE.twitter));
    return response;
  };

  if (!code) {
    return clearOAuthCookies(
      NextResponse.redirect(redirectToAccounts(req, { error: "missing_code" })),
    );
  }

  if (!state || !cookieState || state !== cookieState) {
    return clearOAuthCookies(
      NextResponse.redirect(
        redirectToAccounts(req, { error: "invalid_state" }),
      ),
    );
  }

  if (!codeVerifier) {
    return clearOAuthCookies(
      NextResponse.redirect(
        redirectToAccounts(req, { error: "missing_verifier" }),
      ),
    );
  }

  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return clearOAuthCookies(
      NextResponse.redirect(
        redirectToAccounts(req, { error: "twitter_config" }),
      ),
    );
  }

  const redirectUri = getTwitterRedirectUri(new URL(req.url).origin);

  try {
    const tokenData = await exchangeTwitterCode({
      code,
      redirectUri,
      clientId,
      clientSecret,
      codeVerifier,
    });

    const profile = await fetchTwitterProfile(tokenData.access_token);

    await upsertTwitterAccount({
      userId,
      providerAccountId: profile.id,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: Math.floor(Date.now() / 1000) + tokenData.expires_in,
      tokenType: tokenData.token_type ?? "Bearer",
      scope: tokenData.scope,
    });

    return clearOAuthCookies(
      NextResponse.redirect(redirectToAccounts(req, { success: "twitter" })),
    );
  } catch (error) {
    console.error("Twitter OAuth callback failed:", error);

    const errorCode =
      error instanceof Error && error.message.toLowerCase().includes("profile")
        ? "profile_fetch_failed"
        : "token_exchange_failed";

    return clearOAuthCookies(
      NextResponse.redirect(redirectToAccounts(req, { error: errorCode })),
    );
  }
}
