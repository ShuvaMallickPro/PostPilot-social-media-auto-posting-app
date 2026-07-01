const LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const LINKEDIN_USERINFO_URL = "https://api.linkedin.com/v2/userinfo";

export const LINKEDIN_SCOPES = [
  "openid",
  "profile",
  "w_member_social",
  "email",
] as const;

export type LinkedInTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type?: string;
  scope?: string;
};

export type LinkedInProfile = {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  picture?: string;
};

export function getLinkedInRedirectUri(origin: string): string {
  return `${origin}/api/auth/linkedin/callback`;
}

export function buildLinkedInAuthUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const url = new URL(LINKEDIN_AUTH_URL);

  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("scope", LINKEDIN_SCOPES.join(" "));
  url.searchParams.set("state", params.state);

  return url.toString();
}

export async function exchangeLinkedInCode(params: {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}): Promise<LinkedInTokenResponse> {
  const response = await fetch(LINKEDIN_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: params.code,
      redirect_uri: params.redirectUri,
      client_id: params.clientId,
      client_secret: params.clientSecret,
    }),
  });

  const data = (await response.json()) as LinkedInTokenResponse & {
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !data.access_token) {
    throw new Error(
      data.error_description ?? data.error ?? "LinkedIn token exchange failed",
    );
  }

  return data;
}

export async function fetchLinkedInProfile(
  accessToken: string,
): Promise<LinkedInProfile> {
  const response = await fetch(LINKEDIN_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  const data = (await response.json()) as LinkedInProfile & {
    message?: string;
  };

  if (!response.ok || !data.sub) {
    throw new Error(data.message ?? "Failed to fetch LinkedIn profile");
  }

  return data;
}

export function getLinkedInDisplayName(profile: LinkedInProfile): string {
  if (profile.name?.trim()) return profile.name.trim();
  if (profile.given_name || profile.family_name) {
    return [profile.given_name, profile.family_name].filter(Boolean).join(" ");
  }
  return "LinkedIn account";
}
