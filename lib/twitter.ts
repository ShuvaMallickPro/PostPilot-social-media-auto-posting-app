const TWITTER_AUTH_URL = "https://twitter.com/i/oauth2/authorize";
const TWITTER_TOKEN_URL = "https://api.x.com/2/oauth2/token";
const TWITTER_USERS_ME_URL = "https://api.x.com/2/users/me";

export const TWITTER_SCOPES = [
  "tweet.read",
  "tweet.write",
  "users.read",
  "offline.access",
] as const;

export type TwitterTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type?: string;
  scope?: string;
};

export type TwitterProfile = {
  id: string;
  name?: string;
  username?: string;
};

export function getTwitterRedirectUri(origin: string): string {
  return `${origin}/api/auth/twitter/callback`;
}

export function buildTwitterAuthUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const url = new URL(TWITTER_AUTH_URL);

  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("scope", TWITTER_SCOPES.join(" "));
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");

  return url.toString();
}

function buildBasicAuthHeader(clientId: string, clientSecret: string): string {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  );
  return `Basic ${credentials}`;
}

export async function exchangeTwitterCode(params: {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
  codeVerifier: string;
}): Promise<TwitterTokenResponse> {
  const response = await fetch(TWITTER_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: buildBasicAuthHeader(params.clientId, params.clientSecret),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: params.code,
      redirect_uri: params.redirectUri,
      code_verifier: params.codeVerifier,
      client_id: params.clientId,
    }),
  });

  const data = (await response.json()) as TwitterTokenResponse & {
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !data.access_token) {
    throw new Error(
      data.error_description ?? data.error ?? "Twitter token exchange failed",
    );
  }

  return data;
}

export async function fetchTwitterProfile(
  accessToken: string,
): Promise<TwitterProfile> {
  const response = await fetch(TWITTER_USERS_ME_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  const data = (await response.json()) as {
    data?: TwitterProfile;
    detail?: string;
    title?: string;
  };

  if (!response.ok || !data.data?.id) {
    throw new Error(
      data.detail ?? data.title ?? "Failed to fetch Twitter profile",
    );
  }

  return data.data;
}

export function getTwitterDisplayName(profile: TwitterProfile): string {
  if (profile.name?.trim()) return profile.name.trim();
  if (profile.username?.trim()) return `@${profile.username.trim()}`;
  return "Twitter account";
}
