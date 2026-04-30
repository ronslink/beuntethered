import { put, del } from "@vercel/blob";
import type { AttachmentPurpose } from "@prisma/client";

/**
 * Escrowed Payload Storage Utility
 * Manages blob-backed delivery files via Vercel Blob.
 */

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_ATTACHMENT_COUNT = 5;

function shouldUseLocalStorageFallback() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  return !token || token.includes("fake") || token.includes("test_token");
}

function localBlobUrl(path: string) {
  return `https://local.blob/${path}`;
}

export function sanitizeAttachmentFilename(filename: string) {
  const fallback = "attachment";
  const baseName = filename.split(/[\\/]/).pop() || fallback;
  const cleaned = baseName
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .slice(0, 120);

  return cleaned || fallback;
}

export function isUploadFileEntry(value: FormDataEntryValue | null): value is File {
  return Boolean(
    value &&
      typeof value === "object" &&
      "arrayBuffer" in value &&
      "name" in value &&
      "size" in value
  );
}

export function assertAttachmentFile(
  file: File,
  options: { maxBytes?: number } = {}
) {
  const maxBytes = options.maxBytes ?? MAX_ATTACHMENT_BYTES;
  if (!file.name || file.size <= 0) {
    throw new Error("Choose a non-empty file to upload.");
  }
  if (file.size > maxBytes) {
    const limitLabel =
      maxBytes < 1024
        ? `${maxBytes}B`
        : maxBytes < 1024 * 1024
          ? `${Math.round(maxBytes / 1024)}KB`
          : `${Math.round(maxBytes / 1024 / 1024)}MB`;
    throw new Error(`File ${file.name} is larger than the ${limitLabel} limit.`);
  }
}

export function getUploadFilesFromFormData(
  formData: FormData,
  fieldName: string,
  options: { maxFiles?: number; maxBytes?: number } = {}
) {
  const maxFiles = options.maxFiles ?? MAX_ATTACHMENT_COUNT;
  const files = formData
    .getAll(fieldName)
    .filter(isUploadFileEntry)
    .filter((file) => file.name && file.size > 0);

  if (files.length > maxFiles) {
    throw new Error(`Upload up to ${maxFiles} files at a time.`);
  }

  files.forEach((file) => assertAttachmentFile(file, { maxBytes: options.maxBytes }));
  return files;
}

// If we are server-side uploading (smaller payloads or testing)
export async function uploadPayloadBuffer(filename: string, buffer: Buffer, milestoneId: string) {
  const safeFilename = sanitizeAttachmentFilename(filename);
  const blobPath = `escrow/${milestoneId}/${safeFilename}`;
  if (shouldUseLocalStorageFallback()) {
    return localBlobUrl(blobPath);
  }
  const blob = await put(`escrow/${milestoneId}/${safeFilename}`, buffer, {
    access: "public", // In a true production MVP with S3 this would be private. Vercel Blob by default makes URLs obscure but public. We use 'public' for Vercel, but for an Escrow system, obscure URL is the MVP "private".
  });
  return blob.url;
}

export async function uploadAttachmentFile({
  file,
  projectId,
  uploaderId,
  purpose,
  entityId,
  maxBytes,
}: {
  file: File;
  projectId?: string | null;
  uploaderId: string;
  purpose: AttachmentPurpose;
  entityId?: string | null;
  maxBytes?: number;
}) {
  assertAttachmentFile(file, { maxBytes });

  const safeFilename = sanitizeAttachmentFilename(file.name);
  const uniquePrefix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const blobPath = [
    "attachments",
    projectId || "unscoped",
    purpose.toLowerCase(),
    entityId || uploaderId,
    `${uniquePrefix}-${safeFilename}`,
  ].join("/");

  if (shouldUseLocalStorageFallback()) {
    return {
      name: safeFilename,
      url: localBlobUrl(blobPath),
      contentType: file.type || null,
      sizeBytes: file.size || null,
    };
  }

  const blob = await put(blobPath, Buffer.from(await file.arrayBuffer()), {
    access: "public",
  });

  return {
    name: safeFilename,
    url: blob.url,
    contentType: file.type || null,
    sizeBytes: file.size || null,
  };
}

// Emulated generation of a presigned Download URL
export async function generateSignedDownloadUrl(storagePath: string) {
  // For Vercel Blob, the URL is inherently obscure. In S3, we would generate a signed URL:
  // const command = new GetObjectCommand({ Bucket, Key: storagePath });
  // return await getSignedUrl(s3, command, { expiresIn: 3600 });
  return storagePath; // MVP shortcut: Vercel Blob obscure string
}

// Delete payload from storage.
export async function deletePayload(storagePath: string) {
  // Extract path from Vercel URL or run delete straight
  await del(storagePath);
  return true;
}
