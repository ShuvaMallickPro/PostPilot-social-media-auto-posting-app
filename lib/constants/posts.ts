/** LinkedIn hard limit; used as the shared editor ceiling for MVP. */
export const POST_CONTENT_MAX_LENGTH = 3000;

export const ALLOWED_UPLOAD_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type AllowedUploadMimeType = (typeof ALLOWED_UPLOAD_MIME_TYPES)[number];
