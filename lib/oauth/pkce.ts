import { createHash, randomBytes } from "crypto";

/**
 * PKCE (RFC 7636) pair for Twitter/X OAuth 2.0.
 * code_challenge = BASE64URL(SHA256(code_verifier))
 */
export function generatePkcePair(): {
  codeVerifier: string;
  codeChallenge: string;
} {
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  return { codeVerifier, codeChallenge };
}
