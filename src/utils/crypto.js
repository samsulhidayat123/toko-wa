// SHA-256 hashing untuk password admin.
// Catatan: ini hanya melindungi terhadap kebocoran data spreadsheet,
// bukan pengganti backend proper auth.

const HASH_PREFIX = "sha256$";

export async function hashPassword(plainPassword) {
  const password = String(plainPassword || "");
  if (!password) return "";

  const data = new TextEncoder().encode(password);
  const buffer = await crypto.subtle.digest("SHA-256", data);
  const hex = Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return `${HASH_PREFIX}${hex}`;
}

export function isHashedPassword(value) {
  return typeof value === "string" && value.startsWith(HASH_PREFIX);
}

// Constant-time comparison untuk mencegah timing attack
export function safeCompare(a, b) {
  const strA = String(a || "");
  const strB = String(b || "");
  if (strA.length !== strB.length) return false;

  let mismatch = 0;
  for (let i = 0; i < strA.length; i++) {
    mismatch |= strA.charCodeAt(i) ^ strB.charCodeAt(i);
  }
  return mismatch === 0;
}

export function generateSessionToken() {
  if (globalThis.crypto?.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback untuk environment lama
  return Array.from({ length: 4 }, () =>
    Math.random().toString(36).slice(2)
  ).join("");
}
