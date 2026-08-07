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

export const ALLOWED_UPLOAD_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type AllowedUploadMimeType = (typeof ALLOWED_UPLOAD_MIME_TYPES)[number];
