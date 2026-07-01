import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { OAUTH_STATE_COOKIE } from "@/lib/constants/platforms";
import {
  buildLinkedInAuthUrl,
  getLinkedInRedirectUri,
} from "@/lib/linkedin";
import {
  createOAuthStateCookie,
  generateOAuthState,
} from "@/lib/oauth/cookies";
import { buildAppUrl, redirectToAccounts } from "@/lib/oauth/redirect";

export async function GET(req: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.redirect(
      redirectToAccounts(req, { error: "unauthorized" }),
    );
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      redirectToAccounts(req, { error: "linkedin_config" }),
    );
  }

  const state = generateOAuthState();
  const redirectUri = getLinkedInRedirectUri(buildAppUrl(req, "/").origin);
  const linkedInUrl = buildLinkedInAuthUrl({
    clientId,
    redirectUri,
    state,
  });

  const response = NextResponse.redirect(linkedInUrl);
  response.cookies.set(
    createOAuthStateCookie(OAUTH_STATE_COOKIE.linkedin, state),
  );

  return response;
}
