import { randomBytes, createHash } from "node:crypto";

/**
 * Generate PKCE code_verifier and S256 code_challenge (RFC 7636).
 * Used by OAuth flows that require PKCE (e.g. TikTok).
 */
export function generatePkce(): {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: "S256";
} {
  const codeVerifier = randomBytes(32).toString("base64url"); // 43 chars
  const digest = createHash("sha256").update(codeVerifier).digest();
  const codeChallenge = digest.toString("base64url");
  return { codeVerifier, codeChallenge, codeChallengeMethod: "S256" };
}
