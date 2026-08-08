import {
  fetchLinkedInProfile,
  getLinkedInDisplayName,
} from "@/lib/linkedin";
import {
  fetchTwitterProfile,
  getTwitterDisplayName,
  refreshTwitterAccessToken,
  TWITTER_RECONNECT_MESSAGE,
} from "@/lib/twitter";
import { prisma } from "@/lib/prisma";
import {
  PLATFORM_DEFINITIONS,
  PLATFORM_ORDER,
} from "@/lib/constants/platforms";
import type { ConnectedAccount, PlatformId } from "@/types/platform";

type DbAccount = {
  provider: string;
  providerAccountId: string;
  access_token: string;
  expires_at: number | null;
  createdAt: Date;
};

async function resolveAccountLabel(account: DbAccount): Promise<string | null> {
  if (account.provider === "linkedin") {
    try {
      const profile = await fetchLinkedInProfile(account.access_token);
      return getLinkedInDisplayName(profile);
    } catch {
      return "LinkedIn account";
    }
  }

  if (account.provider === "twitter") {
    try {
      const profile = await fetchTwitterProfile(account.access_token);
      return getTwitterDisplayName(profile);
    } catch {
      return "Twitter account";
    }
  }

  return null;
}

export async function getConnectedAccountsForUser(
  userId: string,
): Promise<ConnectedAccount[]> {
  const accounts = await prisma.account.findMany({
    where: { userId },
    select: {
      provider: true,
      providerAccountId: true,
      access_token: true,
      expires_at: true,
      createdAt: true,
    },
  });

  const accountMap = new Map(
    accounts.map((account) => [account.provider, account]),
  );

  return Promise.all(
    PLATFORM_ORDER.map(async (platformId) => {
      const account = accountMap.get(platformId);

      if (!account) {
        return {
          provider: platformId,
          connected: false,
          accountLabel: null,
          providerAccountId: null,
          connectedAt: null,
          expiresAt: null,
        };
      }

      const accountLabel = await resolveAccountLabel(account);

      return {
        provider: platformId,
        connected: true,
        accountLabel,
        providerAccountId: account.providerAccountId,
        connectedAt: account.createdAt.toISOString(),
        expiresAt: account.expires_at,
      };
    }),
  );
}

export async function disconnectUserAccount(
  userId: string,
  provider: PlatformId,
): Promise<boolean> {
  const result = await prisma.account.deleteMany({
    where: { userId, provider },
  });

  return result.count > 0;
}

export async function upsertLinkedInAccount(params: {
  userId: string;
  providerAccountId: string;
  accessToken: string;
  expiresAt: number;
  tokenType?: string;
  scope?: string;
}) {
  return prisma.account.upsert({
    where: {
      provider_providerAccountId: {
        provider: "linkedin",
        providerAccountId: params.providerAccountId,
      },
    },
    update: {
      userId: params.userId,
      access_token: params.accessToken,
      expires_at: params.expiresAt,
      token_type: params.tokenType,
      scope: params.scope,
    },
    create: {
      userId: params.userId,
      provider: "linkedin",
      providerAccountId: params.providerAccountId,
      access_token: params.accessToken,
      expires_at: params.expiresAt,
      token_type: params.tokenType,
      scope: params.scope,
    },
  });
}

export async function upsertTwitterAccount(params: {
  userId: string;
  providerAccountId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  tokenType?: string;
  scope?: string;
}) {
  return prisma.account.upsert({
    where: {
      provider_providerAccountId: {
        provider: "twitter",
        providerAccountId: params.providerAccountId,
      },
    },
    update: {
      userId: params.userId,
      access_token: params.accessToken,
      refresh_token: params.refreshToken,
      expires_at: params.expiresAt,
      token_type: params.tokenType,
      scope: params.scope,
    },
    create: {
      userId: params.userId,
      provider: "twitter",
      providerAccountId: params.providerAccountId,
      access_token: params.accessToken,
      refresh_token: params.refreshToken,
      expires_at: params.expiresAt,
      token_type: params.tokenType,
      scope: params.scope,
    },
  });
}

/**
 * Returns a usable Twitter access token, refreshing when near expiry.
 * Refresh cannot add new scopes (e.g. media.write) — user must reconnect for that.
 */
export async function resolveTwitterAccountForPublish(userId: string): Promise<
  | {
      providerAccountId: string;
      access_token: string;
      scope: string | null;
    }
  | null
> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "twitter" },
    select: {
      id: true,
      providerAccountId: true,
      access_token: true,
      refresh_token: true,
      expires_at: true,
      scope: true,
    },
  });

  if (!account) {
    return null;
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const expiresSoon =
    account.expires_at != null && account.expires_at <= nowSec + 60;

  if (!expiresSoon) {
    return {
      providerAccountId: account.providerAccountId,
      access_token: account.access_token,
      scope: account.scope,
    };
  }

  if (!account.refresh_token) {
    throw new Error(TWITTER_RECONNECT_MESSAGE);
  }

  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Twitter / X credentials are not configured.");
  }

  try {
    const tokenData = await refreshTwitterAccessToken({
      refreshToken: account.refresh_token,
      clientId,
      clientSecret,
    });

    const expiresAt = Math.floor(Date.now() / 1000) + tokenData.expires_in;

    await prisma.account.update({
      where: { id: account.id },
      data: {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token ?? account.refresh_token,
        expires_at: expiresAt,
        scope: tokenData.scope ?? account.scope,
        token_type: tokenData.token_type ?? "Bearer",
      },
    });

    return {
      providerAccountId: account.providerAccountId,
      access_token: tokenData.access_token,
      scope: tokenData.scope ?? account.scope,
    };
  } catch {
    throw new Error(TWITTER_RECONNECT_MESSAGE);
  }
}

export function getPlatformDefinitions() {
  return PLATFORM_ORDER.map((id) => PLATFORM_DEFINITIONS[id]);
}
