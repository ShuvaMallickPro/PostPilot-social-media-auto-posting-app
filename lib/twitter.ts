const TWITTER_AUTH_URL = "https://twitter.com/i/oauth2/authorize";
const TWITTER_TOKEN_URL = "https://api.x.com/2/oauth2/token";
const TWITTER_USERS_ME_URL = "https://api.x.com/2/users/me";
const TWITTER_TWEETS_URL = "https://api.x.com/2/tweets";
/** v1.1 media upload is deprecated; v2 requires OAuth 2.0 + media.write. */
const TWITTER_MEDIA_UPLOAD_URL = "https://api.x.com/2/media/upload";

/** X free/basic tweet text ceiling for MVP (LinkedIn editor allows 3000). */
export const TWITTER_POST_MAX_LENGTH = 280;

export const TWITTER_SCOPES = [
  "tweet.read",
  "tweet.write",
  "users.read",
  "offline.access",
  "media.write",
] as const;

const MEDIA_APPEND_CHUNK_BYTES = 4 * 1024 * 1024;

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

/** Refresh a user access token (requires offline.access + stored refresh_token). */
export async function refreshTwitterAccessToken(params: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}): Promise<TwitterTokenResponse> {
  const response = await fetch(TWITTER_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: buildBasicAuthHeader(params.clientId, params.clientSecret),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: params.refreshToken,
      client_id: params.clientId,
    }),
  });

  const data = (await response.json()) as TwitterTokenResponse & {
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !data.access_token) {
    throw new Error(
      data.error_description ??
        data.error ??
        "Twitter / X token refresh failed. Reconnect your account.",
    );
  }

  return data;
}

export const TWITTER_RECONNECT_MESSAGE =
  "Twitter / X session expired or missing permissions. Go to Accounts → Disconnect Twitter / X → Connect again.";


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
  let detail = "";

  try {
    const parsed = JSON.parse(body) as {
      detail?: string;
      title?: string;
      error?: string;
      errors?: Array<{ message?: string }>;
    };
    detail =
      parsed.detail ??
      parsed.title ??
      parsed.error ??
      parsed.errors?.[0]?.message ??
      "";
  } catch {
    detail = body.trim();
  }

  if (status === 401) {
    return TWITTER_RECONNECT_MESSAGE;
  }

  if (status === 403) {
    const hint =
      "Common fixes: (1) Disconnect & reconnect Twitter so media.write is granted, " +
      "(2) Developer Portal app must be Read and write, " +
      "(3) Posting often needs a paid X API Basic plan.";
    return detail
      ? `Twitter / X rejected the request (403): ${detail}. ${hint}`
      : `Twitter / X rejected the request (403). ${hint}`;
  }

  return detail || `Twitter / X publish failed (${status})`;
}

function resolveMediaCategory(contentType: string): string {
  if (contentType.includes("gif")) return "tweet_gif";
  return "tweet_image";
}

async function twitterMediaJson(
  accessToken: string,
  body: Record<string, string | number>,
): Promise<{ id: string; raw: string; status: number }> {
  const response = await fetch(TWITTER_MEDIA_UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const raw = await response.text();

  if (!response.ok) {
    throw new Error(mapTwitterPublishError(response.status, raw));
  }

  const data = JSON.parse(raw) as {
    data?: { id?: string };
    media_id_string?: string;
  };
  const id = data.data?.id ?? data.media_id_string;

  if (!id) {
    throw new Error("Twitter media upload did not return an id");
  }

  return { id, raw, status: response.status };
}

/**
 * Upload an image via X API v2 (INIT → APPEND → FINALIZE).
 * Requires OAuth 2.0 user token with media.write (reconnect after scope add).
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
    imageResponse.headers.get("content-type")?.split(";")[0]?.trim() ||
    "application/octet-stream";
  const bytes = Buffer.from(await imageResponse.arrayBuffer());
  const mediaCategory = resolveMediaCategory(contentType);

  const initialized = await twitterMediaJson(accessToken, {
    command: "INIT",
    media_type: contentType,
    total_bytes: bytes.byteLength,
    media_category: mediaCategory,
  });

  const mediaId = initialized.id;

  for (
    let offset = 0, segmentIndex = 0;
    offset < bytes.byteLength;
    offset += MEDIA_APPEND_CHUNK_BYTES, segmentIndex += 1
  ) {
    const chunk = bytes.subarray(offset, offset + MEDIA_APPEND_CHUNK_BYTES);
    const form = new FormData();
    form.append("command", "APPEND");
    form.append("media_id", mediaId);
    form.append("segment_index", String(segmentIndex));
    form.append(
      "media",
      new Blob([new Uint8Array(chunk)], { type: contentType }),
      `chunk-${segmentIndex}`,
    );

    const appendResponse = await fetch(TWITTER_MEDIA_UPLOAD_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    });

    if (!appendResponse.ok) {
      const raw = await appendResponse.text();
      throw new Error(mapTwitterPublishError(appendResponse.status, raw));
    }
  }

  const finalized = await twitterMediaJson(accessToken, {
    command: "FINALIZE",
    media_id: mediaId,
  });

  // Images are usually ready immediately; poll briefly if processing_info appears.
  try {
    const finalizePayload = JSON.parse(finalized.raw) as {
      data?: {
        processing_info?: {
          state?: string;
          check_after_secs?: number;
        };
      };
    };
    const processing = finalizePayload.data?.processing_info;

    if (processing?.state && processing.state !== "succeeded") {
      const waitMs = Math.max(1, processing.check_after_secs ?? 1) * 1000;
      await new Promise((resolve) => setTimeout(resolve, waitMs));

      const statusUrl = new URL(TWITTER_MEDIA_UPLOAD_URL);
      statusUrl.searchParams.set("command", "STATUS");
      statusUrl.searchParams.set("media_id", mediaId);

      const statusResponse = await fetch(statusUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });

      if (!statusResponse.ok) {
        const raw = await statusResponse.text();
        throw new Error(mapTwitterPublishError(statusResponse.status, raw));
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("403")) {
      throw error;
    }
    // Non-fatal if STATUS parse fails for simple images.
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

    if (message.toLowerCase().includes("token expired") || message.includes("Reconnect")) {
      return {
        success: false,
        error: TWITTER_RECONNECT_MESSAGE,
      };
    }

    return { success: false, error: message };
  }
}
