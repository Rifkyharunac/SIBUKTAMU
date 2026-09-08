const ITERATIONS = 100_000;
const KEY_LENGTH = 32;

function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function derive(password: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: new Uint8Array(salt), iterations: ITERATIONS }, key, KEY_LENGTH * 8);
  return new Uint8Array(bits);
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt);
  return { hash: toBase64(hash), salt: toBase64(salt) };
}

export async function verifyPassword(password: string, expectedHash: string, salt: string) {
  const actual = await derive(password, fromBase64(salt));
  const expected = fromBase64(expectedHash);
  if (actual.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < actual.length; index += 1) mismatch |= actual[index] ^ expected[index];
  return mismatch === 0;
}

export async function stableHash(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function constantTimeTextEqual(left: string, right: string) {
  const [leftHash, rightHash] = await Promise.all([stableHash(left), stableHash(right)]);
  let mismatch = 0;
  for (let index = 0; index < leftHash.length; index += 1) mismatch |= leftHash.charCodeAt(index) ^ rightHash.charCodeAt(index);
  return mismatch === 0;
}

export function validatePassword(password: string) {
  if (typeof password !== "string" || password.length > 128) return "Sandi maksimal 128 karakter.";
  if (password.length < 10) return "Sandi minimal 10 karakter.";
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) return "Sandi harus memuat huruf besar dan huruf kecil.";
  if (!/\d/.test(password)) return "Sandi harus memuat minimal satu angka.";
  return null;
}
