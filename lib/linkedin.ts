const LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const LINKEDIN_USERINFO_URL = "https://api.linkedin.com/v2/userinfo";
const LINKEDIN_UGC_POSTS_URL = "https://api.linkedin.com/v2/ugcPosts";
const LINKEDIN_REGISTER_UPLOAD_URL =
  "https://api.linkedin.com/v2/assets?action=registerUpload";

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

/** Minimal account fields required to publish (from Prisma Account). */
export type LinkedInPublishAccount = {
  providerAccountId: string;
  access_token: string;
};

export type LinkedInPublishResult =
  | { success: true; postId: string }
  | { success: false; error: string };

type RegisterUploadResponse = {
  value?: {
    asset?: string;
    uploadMechanism?: {
      "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"?: {
        uploadUrl?: string;
        headers?: Record<string, string>;
      };
    };
  };
  message?: string;
};

function linkedInApiHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "X-Restli-Protocol-Version": "2.0.0",
  };
}

function mapLinkedInPublishError(status: number, body: string): string {
  if (status === 401) {
    return "LinkedIn token expired. Reconnect your account.";
  }

  const trimmed = body.trim();
  return trimmed || `LinkedIn publish failed (${status})`;
}

async function registerLinkedInImageUpload(params: {
  accessToken: string;
  ownerUrn: string;
}): Promise<{
  uploadUrl: string;
  assetUrn: string;
  uploadHeaders: Record<string, string>;
}> {
  const response = await fetch(LINKEDIN_REGISTER_UPLOAD_URL, {
    method: "POST",
    headers: linkedInApiHeaders(params.accessToken),
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
        owner: params.ownerUrn,
        serviceRelationships: [
          {
            relationshipType: "OWNER",
            identifier: "urn:li:userGeneratedContent",
          },
        ],
      },
    }),
  });

  const raw = await response.text();

  if (!response.ok) {
    throw new Error(mapLinkedInPublishError(response.status, raw));
  }

  const data = JSON.parse(raw) as RegisterUploadResponse;
  const uploadRequest =
    data.value?.uploadMechanism?.[
      "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
    ];
  const uploadUrl = uploadRequest?.uploadUrl;
  const assetUrn = data.value?.asset;

  if (!uploadUrl || !assetUrn) {
    throw new Error(
      data.message ?? "LinkedIn did not return an image upload URL",
    );
  }

  return {
    uploadUrl,
    assetUrn,
    uploadHeaders: uploadRequest?.headers ?? {},
  };
}

async function uploadImageBinaryToLinkedIn(params: {
  uploadUrl: string;
  uploadHeaders: Record<string, string>;
  imageUrl: string;
}): Promise<void> {
  const imageResponse = await fetch(params.imageUrl, { cache: "no-store" });

  if (!imageResponse.ok) {
    throw new Error("Failed to download image for LinkedIn upload");
  }

  const contentType =
    imageResponse.headers.get("content-type") ?? "application/octet-stream";
  const bytes = await imageResponse.arrayBuffer();

  const uploadResponse = await fetch(params.uploadUrl, {
    method: "PUT",
    headers: {
      ...params.uploadHeaders,
      "Content-Type": contentType,
    },
    body: bytes,
  });

  if (!uploadResponse.ok) {
    const err = await uploadResponse.text();
    throw new Error(
      mapLinkedInPublishError(uploadResponse.status, err) ||
        "Failed to upload image to LinkedIn",
    );
  }
}

function buildUgcPostBody(params: {
  authorUrn: string;
  content: string;
  assetUrn?: string;
}) {
  const shareContent = params.assetUrn
    ? {
        shareCommentary: { text: params.content },
        shareMediaCategory: "IMAGE",
        media: [
          {
            status: "READY",
            description: { text: params.content.slice(0, 200) },
            media: params.assetUrn,
            title: { text: "PostPilot image" },
          },
        ],
      }
    : {
        shareCommentary: { text: params.content },
        shareMediaCategory: "NONE",
      };

  return {
    author: params.authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": shareContent,
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };
}

/**
 * Publish text (and optional image) to the member's LinkedIn feed.
 * Image path: registerUpload → PUT bytes from R2 public URL → ugcPosts with asset URN.
 */
export async function publishToLinkedIn(
  account: LinkedInPublishAccount,
  content: string,
  imageUrl?: string | null,
): Promise<LinkedInPublishResult> {
  const trimmed = content.trim();

  if (!trimmed) {
    return { success: false, error: "Post content is required" };
  }

  if (!account.providerAccountId || !account.access_token) {
    return { success: false, error: "LinkedIn account is incomplete" };
  }

  const authorUrn = `urn:li:person:${account.providerAccountId}`;

  try {
    let assetUrn: string | undefined;

    if (imageUrl?.trim()) {
      const registered = await registerLinkedInImageUpload({
        accessToken: account.access_token,
        ownerUrn: authorUrn,
      });

      await uploadImageBinaryToLinkedIn({
        uploadUrl: registered.uploadUrl,
        uploadHeaders: registered.uploadHeaders,
        imageUrl: imageUrl.trim(),
      });

      assetUrn = registered.assetUrn;
    }

    const response = await fetch(LINKEDIN_UGC_POSTS_URL, {
      method: "POST",
      headers: linkedInApiHeaders(account.access_token),
      body: JSON.stringify(
        buildUgcPostBody({
          authorUrn,
          content: trimmed,
          assetUrn,
        }),
      ),
    });

    const raw = await response.text();

    if (!response.ok) {
      return {
        success: false,
        error: mapLinkedInPublishError(response.status, raw),
      };
    }

    const data = JSON.parse(raw) as { id?: string };

    if (!data.id) {
      return { success: false, error: "LinkedIn did not return a post id" };
    }

    return { success: true, postId: data.id };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "LinkedIn publish failed";

    if (message.toLowerCase().includes("token expired")) {
      return {
        success: false,
        error: "LinkedIn token expired. Reconnect your account.",
      };
    }

    return { success: false, error: message };
  }
}
