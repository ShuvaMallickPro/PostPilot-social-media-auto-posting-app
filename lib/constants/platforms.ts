import type { PlatformDefinition, PlatformId } from "@/types/platform";

export const PLATFORM_DEFINITIONS: Record<PlatformId, PlatformDefinition> = {
  linkedin: {
    id: "linkedin",
    name: "LinkedIn",
    description: "Publish posts to your LinkedIn profile.",
    connectPath: "/api/auth/linkedin",
    available: true,
  },
  twitter: {
    id: "twitter",
    name: "Twitter / X",
    description: "Publish posts to your X (Twitter) timeline.",
    connectPath: "/api/auth/twitter",
    available: true,
  },
  facebook: {
    id: "facebook",
    name: "Facebook",
    description: "Publish posts to your Facebook Page.",
    connectPath: "/api/auth/facebook",
    available: false,
    comingSoon: true,
  },
};

export const PLATFORM_ORDER: PlatformId[] = ["linkedin", "twitter", "facebook"];

/** CSRF state cookies (all OAuth providers). */
export const OAUTH_STATE_COOKIE = {
  linkedin: "linkedin_oauth_state",
  twitter: "twitter_oauth_state",
} as const;

/** PKCE code_verifier cookie (Twitter/X only). */
export const OAUTH_PKCE_COOKIE = {
  twitter: "twitter_oauth_code_verifier",
} as const;

export const ACCOUNT_ERROR_CODES = {
  invalid_state: "OAuth state mismatch. Please try connecting again.",
  missing_code: "Authorization code was missing. Please try connecting again.",
  missing_verifier:
    "OAuth security verifier was missing. Please try connecting again.",
  token_exchange_failed:
    "Failed to exchange the authorization code for an access token.",
  profile_fetch_failed: "Failed to fetch your social profile.",
  linkedin_config: "LinkedIn credentials are not configured.",
  twitter_config: "Twitter / X credentials are not configured.",
  unauthorized: "You must be signed in to connect accounts.",
  disconnect_failed: "Failed to disconnect the account.",
  unknown: "Something went wrong. Please try again.",
} as const;

export type AccountErrorCode = keyof typeof ACCOUNT_ERROR_CODES;

export const ACCOUNT_SUCCESS_CODES = {
  linkedin: "LinkedIn account connected successfully.",
  twitter: "Twitter / X account connected successfully.",
  disconnected: "Account disconnected successfully.",
} as const;

export type AccountSuccessCode = keyof typeof ACCOUNT_SUCCESS_CODES;
