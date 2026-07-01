import {
  fetchLinkedInProfile,
  getLinkedInDisplayName,
} from "@/lib/linkedin";
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

async function resolveAccountLabel(
  account: DbAccount,
): Promise<string | null> {
  if (account.provider === "linkedin") {
    try {
      const profile = await fetchLinkedInProfile(account.access_token);
      return getLinkedInDisplayName(profile);
    } catch {
      return "LinkedIn account";
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

  const accountMap = new Map(accounts.map((account) => [account.provider, account]));

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

export function getPlatformDefinitions() {
  return PLATFORM_ORDER.map((id) => PLATFORM_DEFINITIONS[id]);
}
