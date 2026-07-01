import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { upsertLinkedInAccount } from "@/lib/accounts";
import { OAUTH_STATE_COOKIE } from "@/lib/constants/platforms";
import {
  exchangeLinkedInCode,
  fetchLinkedInProfile,
  getLinkedInRedirectUri,
} from "@/lib/linkedin";
import { clearOAuthStateCookie } from "@/lib/oauth/cookies";
import { redirectToAccounts } from "@/lib/oauth/redirect";

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
  const cookieState = req.cookies.get(OAUTH_STATE_COOKIE.linkedin)?.value;

  const clearState = (response: NextResponse) => {
    response.cookies.set(
      clearOAuthStateCookie(OAUTH_STATE_COOKIE.linkedin),
    );
    return response;
  };

  if (!code) {
    return clearState(
      NextResponse.redirect(
        redirectToAccounts(req, { error: "missing_code" }),
      ),
    );
  }

  if (!state || !cookieState || state !== cookieState) {
    return clearState(
      NextResponse.redirect(
        redirectToAccounts(req, { error: "invalid_state" }),
      ),
    );
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return clearState(
      NextResponse.redirect(
        redirectToAccounts(req, { error: "linkedin_config" }),
      ),
    );
  }

  const redirectUri = getLinkedInRedirectUri(new URL(req.url).origin);

  try {
    const tokenData = await exchangeLinkedInCode({
      code,
      redirectUri,
      clientId,
      clientSecret,
    });

    const profile = await fetchLinkedInProfile(tokenData.access_token);

    await upsertLinkedInAccount({
      userId,
      providerAccountId: profile.sub,
      accessToken: tokenData.access_token,
      expiresAt: Math.floor(Date.now() / 1000) + tokenData.expires_in,
      tokenType: tokenData.token_type,
      scope: tokenData.scope,
    });

    return clearState(
      NextResponse.redirect(
        redirectToAccounts(req, { success: "linkedin" }),
      ),
    );
  } catch (error) {
    console.error("LinkedIn OAuth callback failed:", error);

    const errorCode =
      error instanceof Error &&
      error.message.toLowerCase().includes("profile")
        ? "profile_fetch_failed"
        : "token_exchange_failed";

    return clearState(
      NextResponse.redirect(redirectToAccounts(req, { error: errorCode })),
    );
  }
}
