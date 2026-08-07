const TWITTER_AUTH_URL = "https://twitter.com/i/oauth2/authorize";
const TWITTER_TOKEN_URL = "https://api.x.com/2/oauth2/token";
const TWITTER_USERS_ME_URL = "https://api.x.com/2/users/me";
const TWITTER_TWEETS_URL = "https://api.x.com/2/tweets";
const TWITTER_MEDIA_UPLOAD_URL =
  "https://upload.twitter.com/1.1/media/upload.json";

/** X free/basic tweet text ceiling for MVP (LinkedIn editor allows 3000). */
export const TWITTER_POST_MAX_LENGTH = 280;

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

/** Minimal account fields required to publish (from Prisma Account). */
export type TwitterPublishAccount = {
  access_token: string;
};

export type TwitterPublishResult =
  | { success: true; postId: string }
  | { success: false; error: string };

function mapTwitterPublishError(status: number, body: string): string {
  if (status === 401) {
    return "Twitter / X token expired. Reconnect your account.";
  }

  if (status === 403) {
    return (
      "Twitter / X rejected the post (403). Check app permissions and API tier — " +
      "tweet.write often requires a paid Basic plan."
    );
  }

  const trimmed = body.trim();
  return trimmed || `Twitter / X publish failed (${status})`;
}

/**
 * Simple image upload (< ~5MB) via v1.1 media endpoint using the user OAuth 2.0 token.
 * Chunked INIT/APPEND/FINALIZE can be added later for large videos.
 */
async function uploadTwitterMedia(
  accessToken: string,
  imageUrl: string,
): Promise<string> {
  const imageResponse = await fetch(imageUrl, { cache: "no-store" });

  if (!imageResponse.ok) {
    throw new Error("Failed to download image for Twitter upload");
  }

  const contentType =
    imageResponse.headers.get("content-type") ?? "application/octet-stream";
  const bytes = await imageResponse.arrayBuffer();
  const extension = contentType.includes("png")
    ? "png"
    : contentType.includes("gif")
      ? "gif"
      : contentType.includes("webp")
        ? "webp"
        : "jpg";

  const form = new FormData();
  form.append(
    "media",
    new Blob([bytes], { type: contentType }),
    `upload.${extension}`,
  );

  const response = await fetch(TWITTER_MEDIA_UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: form,
  });

  const raw = await response.text();

  if (!response.ok) {
    throw new Error(mapTwitterPublishError(response.status, raw));
  }

  const data = JSON.parse(raw) as {
    media_id_string?: string;
    media_id?: number;
  };

  const mediaId =
    data.media_id_string ??
    (data.media_id != null ? String(data.media_id) : undefined);

  if (!mediaId) {
    throw new Error("Twitter did not return a media id");
  }

  return mediaId;
}

/**
 * Publish text (and optional image) as a tweet.
 * Returns the same success shape as LinkedIn (`postId`) for the Step 21 orchestrator.
 */
export async function publishToTwitter(
  account: TwitterPublishAccount,
  content: string,
  imageUrl?: string | null,
): Promise<TwitterPublishResult> {
  const trimmed = content.trim();

  if (!trimmed) {
    return { success: false, error: "Post content is required" };
  }

  if (trimmed.length > TWITTER_POST_MAX_LENGTH) {
    return {
      success: false,
      error: `Twitter / X posts must be at most ${TWITTER_POST_MAX_LENGTH} characters`,
    };
  }

  if (!account.access_token) {
    return { success: false, error: "Twitter / X account is incomplete" };
  }

  try {
    let mediaId: string | undefined;

    if (imageUrl?.trim()) {
      mediaId = await uploadTwitterMedia(account.access_token, imageUrl.trim());
    }

    const body: {
      text: string;
      media?: { media_ids: string[] };
    } = { text: trimmed };

    if (mediaId) {
      body.media = { media_ids: [mediaId] };
    }

    const response = await fetch(TWITTER_TWEETS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${account.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const raw = await response.text();

    if (!response.ok) {
      return {
        success: false,
        error: mapTwitterPublishError(response.status, raw),
      };
    }

    const data = JSON.parse(raw) as { data?: { id?: string } };
    const tweetId = data.data?.id;

    if (!tweetId) {
      return { success: false, error: "Twitter did not return a tweet id" };
    }

    return { success: true, postId: tweetId };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Twitter / X publish failed";

    if (message.toLowerCase().includes("token expired")) {
      return {
        success: false,
        error: "Twitter / X token expired. Reconnect your account.",
      };
    }

    return { success: false, error: message };
  }
}
