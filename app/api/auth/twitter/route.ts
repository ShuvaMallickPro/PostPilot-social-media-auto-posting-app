import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import {
  OAUTH_PKCE_COOKIE,
  OAUTH_STATE_COOKIE,
} from "@/lib/constants/platforms";
import {
  createOAuthStateCookie,
  generateOAuthState,
} from "@/lib/oauth/cookies";
import { generatePkcePair } from "@/lib/oauth/pkce";
import { buildAppUrl, redirectToAccounts } from "@/lib/oauth/redirect";
import { buildTwitterAuthUrl, getTwitterRedirectUri } from "@/lib/twitter";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  // const userId = "user_2sJbYt74vplLJ9Xa";

  if (!userId) {
    return NextResponse.redirect(
      redirectToAccounts(req, { error: "unauthorized" }),
    );
  }

  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      redirectToAccounts(req, { error: "twitter_config" }),
    );
  }

  const state = generateOAuthState();
  const { codeVerifier, codeChallenge } = generatePkcePair();
  const redirectUri = getTwitterRedirectUri(buildAppUrl(req, "/").origin);
  const twitterUrl = buildTwitterAuthUrl({
    clientId,
    redirectUri,
    state,
    codeChallenge,
  });

  const response = NextResponse.redirect(twitterUrl);
  response.cookies.set(
    createOAuthStateCookie(OAUTH_STATE_COOKIE.twitter, state),
  );
  response.cookies.set(
    createOAuthStateCookie(OAUTH_PKCE_COOKIE.twitter, codeVerifier),
  );

  return response;
}
