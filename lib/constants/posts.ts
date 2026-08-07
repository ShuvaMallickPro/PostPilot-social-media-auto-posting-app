/** LinkedIn hard limit; used as the shared editor ceiling for MVP. */
export const POST_CONTENT_MAX_LENGTH = 3000;

/** Post-level lifecycle statuses (string column — keep values stable). */
export const POST_STATUS = {
  draft: "draft",
  publishing: "publishing",
  published: "published",
  failed: "failed",
} as const;

export type PostStatus = (typeof POST_STATUS)[keyof typeof POST_STATUS];

/** Per-platform publish row statuses. */
export const POST_PLATFORM_STATUS = {
  pending: "pending",
  published: "published",
  failed: "failed",
} as const;

export type PostPlatformStatus =
  (typeof POST_PLATFORM_STATUS)[keyof typeof POST_PLATFORM_STATUS];

export const POST_STATUS_LABELS: Record<PostStatus, string> = {
  draft: "Draft",
  publishing: "Publishing",
  published: "Published",
  failed: "Failed",
};

export const POST_PLATFORM_STATUS_LABELS: Record<PostPlatformStatus, string> = {
  pending: "Pending",
  published: "Published",
  failed: "Failed",
};

export const HISTORY_CONTENT_PREVIEW_LENGTH = 140;

export const ALLOWED_UPLOAD_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type AllowedUploadMimeType = (typeof ALLOWED_UPLOAD_MIME_TYPES)[number];

export function isPostStatus(value: string): value is PostStatus {
  return Object.values(POST_STATUS).includes(value as PostStatus);
}

export function isPostPlatformStatus(
  value: string,
): value is PostPlatformStatus {
  return Object.values(POST_PLATFORM_STATUS).includes(
    value as PostPlatformStatus,
  );
}
