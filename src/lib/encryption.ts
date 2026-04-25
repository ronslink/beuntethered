import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;

// Derive a 32-byte key from the environment secret using scrypt
function deriveKey(secret: string): Buffer {
  const envSecret = process.env.ENCRYPTION_SECRET;
  if (!envSecret) {
    throw new Error("ENCRYPTION_SECRET environment variable is not set");
  }
  return scryptSync(envSecret, secret, 32);
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a base64 string containing: salt + iv + tag + ciphertext
 */
export function encrypt(plaintext: string, secret: string): string {
  const key = deriveKey(secret);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let ciphertext = cipher.update(plaintext, "utf8", "base64");
  ciphertext += cipher.final("base64");

  const tag = cipher.getAuthTag();

  // Pack salt + iv + tag + ciphertext into a single base64 string
  // Format: base64(salt:iv:tag:ciphertext)
  const salt = Buffer.from(secret, "utf8").slice(0, SALT_LENGTH);
  const combined = Buffer.concat([
    Buffer.from(salt.toString("base64"), "utf8"),
    Buffer.from(":", "utf8"),
    Buffer.from(iv.toString("base64"), "utf8"),
    Buffer.from(":", "utf8"),
    Buffer.from(tag.toString("base64"), "utf8"),
    Buffer.from(":", "utf8"),
    Buffer.from(ciphertext, "utf8"),
  ]);

  return combined.toString("base64");
}

/**
 * Decrypt a ciphertext string that was produced by `encrypt`.
 */
export function decrypt(encrypted: string, secret: string): string {
  const key = deriveKey(secret);
  const parts = Buffer.from(encrypted, "base64").toString("utf8").split(":");

  if (parts.length !== 5) {
    throw new Error("Invalid encrypted payload format");
  }

  const [_salt, ivB64, tagB64, ciphertextB64] = parts.slice(-4);
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ciphertext = ciphertextB64; // already base64 from the combined string

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let plaintext = decipher.update(ciphertext, "base64", "utf8");
  plaintext += decipher.final("utf8");

  return plaintext;
}

/**
 * Hash a password using bcrypt-compatible salt rounds.
 */
import bcrypt from "bcrypt";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── API Key Encryption (AES-256-GCM with ENCRYPTION_MASTER_KEY) ───────────────

const API_KEY_ALGORITHM = "aes-256-gcm";
const API_KEY_IV_LENGTH = 16;
const API_KEY_TAG_LENGTH = 16;

function getMasterKey(): Buffer | null {
  const key = process.env.ENCRYPTION_MASTER_KEY;
  if (!key) {
    // Key not configured — encryption unavailable. API key storage will be skipped.
    return null;
  }
  // Support both raw hex (64 chars = 32 bytes) and base64-encoded keys
  if (key.length === 64) {
    return Buffer.from(key, "hex");
  }
  return Buffer.from(key, "base64");
}

/**
 * Encrypt an API key using AES-256-GCM with ENCRYPTION_MASTER_KEY.
 * Returns a base64 string containing: iv:tag:ciphertext
 */
export function encryptApiKey(plaintext: string): string {
  const key = getMasterKey();
  // If master key is not configured, return empty string to allow graceful skip
  if (!key || !plaintext) return "";

  const iv = randomBytes(API_KEY_IV_LENGTH);
  const cipher = createCipheriv(API_KEY_ALGORITHM, key, iv);

  let ciphertext = cipher.update(plaintext, "utf8", "base64");
  ciphertext += cipher.final("base64");

  const tag = cipher.getAuthTag();

  return Buffer.from(
    `${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext}`
  ).toString("base64");
}

/**
 * Decrypt an API key that was produced by `encryptApiKey`.
 */
export function decryptApiKey(encrypted: string): string {
  const key = getMasterKey();
  const parts = Buffer.from(encrypted, "base64").toString("utf8").split(":");

  if (parts.length !== 3) {
    throw new Error("Invalid encrypted API key payload format");
  }

  const [ivB64, tagB64, ciphertextB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");

  const decipher = createDecipheriv(API_KEY_ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let plaintext = decipher.update(ciphertextB64, "base64", "utf8");
  plaintext += decipher.final("utf8");

  return plaintext;
}
