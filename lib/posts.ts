import { POST_CONTENT_MAX_LENGTH } from "@/lib/constants/posts";
import { PLATFORM_DEFINITIONS } from "@/lib/constants/platforms";
import { prisma } from "@/lib/prisma";
import { isPlatformId, type PlatformId } from "@/types/platform";

export type CreatePostInput = {
  content: string;
  imageUrl?: string | null;
  platforms: PlatformId[];
};

type ValidationResult =
  | { ok: true; data: CreatePostInput }
  | { ok: false; error: string };

export function validateCreatePostBody(body: unknown): ValidationResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body" };
  }

  const record = body as {
    content?: unknown;
    imageUrl?: unknown;
    platforms?: unknown;
  };

  if (typeof record.content !== "string") {
    return { ok: false, error: "content is required" };
  }

  const content = record.content.trim();

  if (!content) {
    return { ok: false, error: "content is required" };
  }

  if (content.length > POST_CONTENT_MAX_LENGTH) {
    return {
      ok: false,
      error: `content must be at most ${POST_CONTENT_MAX_LENGTH} characters`,
    };
  }

  let imageUrl: string | null = null;

  if (record.imageUrl != null) {
    if (typeof record.imageUrl !== "string") {
      return { ok: false, error: "imageUrl must be a string or null" };
    }

    const trimmed = record.imageUrl.trim();
    imageUrl = trimmed.length > 0 ? trimmed : null;
  }

  if (!Array.isArray(record.platforms) || record.platforms.length === 0) {
    return { ok: false, error: "Select at least one platform" };
  }

  const platforms: PlatformId[] = [];

  for (const value of record.platforms) {
    if (typeof value !== "string" || !isPlatformId(value)) {
      return { ok: false, error: "Invalid platform selected" };
    }

    if (!PLATFORM_DEFINITIONS[value].available) {
      return {
        ok: false,
        error: `${PLATFORM_DEFINITIONS[value].name} is not available yet`,
      };
    }

    if (!platforms.includes(value)) {
      platforms.push(value);
    }
  }

  if (platforms.length === 0) {
    return { ok: false, error: "Select at least one platform" };
  }

  return { ok: true, data: { content, imageUrl, platforms } };
}

export async function createPostForUser(
  userId: string,
  input: CreatePostInput,
) {
  return prisma.post.create({
    data: {
      userId,
      content: input.content,
      imageUrl: input.imageUrl,
      status: "draft",
      platforms: {
        create: input.platforms.map((platform) => ({
          platform,
          status: "pending",
        })),
      },
    },
    include: {
      platforms: true,
    },
  });
}

export async function listPostsForUser(userId: string) {
  return prisma.post.findMany({
    where: { userId },
    include: {
      platforms: true,
    },
    orderBy: { createdAt: "desc" },
  });
}
