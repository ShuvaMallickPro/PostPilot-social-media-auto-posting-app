export type PlatformId = "linkedin" | "twitter" | "facebook";

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

export const PLATFORM_IDS: readonly PlatformId[] = [
  "linkedin",
  "twitter",
  "facebook",
] as const;

export function isPlatformId(value: string): value is PlatformId {
  return (PLATFORM_IDS as readonly string[]).includes(value);
}
