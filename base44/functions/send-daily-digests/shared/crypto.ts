// Cryptographic helpers for reporter tokens and public issue codes.
// Uses the Web Crypto API available in the Deno runtime.

// Crockford Base32 alphabet (excludes I, L, O, U to avoid ambiguity).
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** Public issue code: "FI-" + 6 uppercase Crockford Base32 characters. */
export function randomIssueCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let code = "";
  for (const b of bytes) {
    code += CROCKFORD[b % 32];
  }
  return `FI-${code}`;
}

/** 32 cryptographically random bytes, base64url-encoded. Returned to the reporter only once. */
export function generateTrackingToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** SHA-256 of a string, returned as lowercase hex. Used to store only the token hash. */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
