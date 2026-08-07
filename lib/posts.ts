import {
  POST_CONTENT_MAX_LENGTH,
  POST_PLATFORM_STATUS,
  POST_STATUS,
} from "@/lib/constants/posts";
import { PLATFORM_DEFINITIONS } from "@/lib/constants/platforms";
import { publishToLinkedIn } from "@/lib/linkedin";
import { prisma } from "@/lib/prisma";
import { publishToTwitter } from "@/lib/twitter";
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
    if (trimmed.length === 0) {
      imageUrl = null;
    } else if (!trimmed.startsWith("https://")) {
      return { ok: false, error: "imageUrl must be a valid HTTPS URL" };
    } else {
      imageUrl = trimmed;
    }
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
      status: POST_STATUS.draft,
      platforms: {
        create: input.platforms.map((platform) => ({
          platform,
          status: POST_PLATFORM_STATUS.pending,
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

export type PublishPostResult =
  | {
      ok: true;
      post: Awaited<ReturnType<typeof getPostForUser>>;
      allSucceeded: boolean;
    }
  | { ok: false; error: string; status: number };

async function getPostForUser(userId: string, postId: string) {
  return prisma.post.findFirst({
    where: { id: postId, userId },
    include: { platforms: true },
  });
}

async function publishPlatformRow(input: {
  platformRowId: string;
  platform: string;
  content: string;
  imageUrl: string | null;
  account:
    | {
        provider: string;
        providerAccountId: string;
        access_token: string;
      }
    | undefined;
}): Promise<
  | { platform: string; success: true }
  | { platform: string; success: false; error: string }
> {
  const { platformRowId, platform, content, imageUrl, account } = input;

  try {
    if (!account) {
      throw new Error(`No connected account for ${platform}`);
    }

    let result:
      | { success: true; postId: string }
      | { success: false; error: string };

    if (platform === "linkedin") {
      result = await publishToLinkedIn(account, content, imageUrl);
    } else if (platform === "twitter") {
      result = await publishToTwitter(account, content, imageUrl);
    } else {
      const label = isPlatformId(platform)
        ? PLATFORM_DEFINITIONS[platform].name
        : platform;
      throw new Error(`${label} publishing is not available`);
    }

    if (!result.success) {
      throw new Error(result.error);
    }

    await prisma.postPlatform.update({
      where: { id: platformRowId },
      data: {
        status: POST_PLATFORM_STATUS.published,
        publishedAt: new Date(),
        error: null,
      },
    });

    return { platform, success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Publish failed";

    await prisma.postPlatform.update({
      where: { id: platformRowId },
      data: {
        status: POST_PLATFORM_STATUS.failed,
        error: message,
      },
    });

    return { platform, success: false, error: message };
  }
}

/**
 * Orchestrates parallel publish to each pending platform (LinkedIn + Twitter).
 * Updates PostPlatform rows and overall Post status.
 */
export async function publishPostForUser(
  userId: string,
  postId: string,
): Promise<PublishPostResult> {
  const post = await getPostForUser(userId, postId);

  if (!post) {
    return { ok: false, error: "Not found", status: 404 };
  }

  const pendingPlatforms = post.platforms.filter(
    (pp) => pp.status === POST_PLATFORM_STATUS.pending,
  );

  if (pendingPlatforms.length === 0) {
    const alreadyDone = post.platforms.every(
      (pp) => pp.status === POST_PLATFORM_STATUS.published,
    );

    if (alreadyDone) {
      return { ok: true, post, allSucceeded: true };
    }

    return {
      ok: false,
      error: "No pending platforms to publish",
      status: 400,
    };
  }

  await prisma.post.update({
    where: { id: postId },
    data: { status: POST_STATUS.publishing },
  });

  const accounts = await prisma.account.findMany({
    where: { userId },
    select: {
      provider: true,
      providerAccountId: true,
      access_token: true,
    },
  });

  const settled = await Promise.allSettled(
    pendingPlatforms.map((pp) =>
      publishPlatformRow({
        platformRowId: pp.id,
        platform: pp.platform,
        content: post.content,
        imageUrl: post.imageUrl,
        account: accounts.find((a) => a.provider === pp.platform),
      }),
    ),
  );

  const outcomes = settled.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }

    const platform = pendingPlatforms[index]?.platform ?? "unknown";
    const message =
      result.reason instanceof Error ? result.reason.message : "Publish failed";

    return { platform, success: false as const, error: message };
  });

  const allSucceeded = outcomes.every((outcome) => outcome.success);

  await prisma.post.update({
    where: { id: postId },
    data: {
      status: allSucceeded ? POST_STATUS.published : POST_STATUS.failed,
    },
  });

  const updated = await getPostForUser(userId, postId);

  if (!updated) {
    return { ok: false, error: "Not found", status: 404 };
  }

  return { ok: true, post: updated, allSucceeded };
}
