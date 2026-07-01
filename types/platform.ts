export type PlatformId = "linkedin" | "facebook";

export type ConnectedAccount = {
  provider: PlatformId;
  connected: boolean;
  accountLabel: string | null;
  providerAccountId: string | null;
  connectedAt: string | null;
  expiresAt: number | null;
};

export type PlatformDefinition = {
  id: PlatformId;
  name: string;
  description: string;
  connectPath: string;
  available: boolean;
  comingSoon?: boolean;
};
