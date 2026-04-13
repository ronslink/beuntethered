import { put, del } from '@vercel/blob';

/**
 * Escrowed Payload Storage Utility
 * Manages Zero-Knowledge blob files via Vercel Blob
 */

// If we are server-side uploading (smaller payloads or testing)
export async function uploadPayloadBuffer(filename: string, buffer: Buffer, milestoneId: string) {
  const blob = await put(`escrow/${milestoneId}/${filename}`, buffer, {
    access: 'public', // In a true production MVP with S3 this would be private. Vercel Blob by default makes URLs obscure but public. We use 'public' for Vercel, but for an Escrow system, obscure URL is the MVP "private".
  });
  return blob.url;
}

// Emulated generation of a presigned Download URL
export async function generateSignedDownloadUrl(storagePath: string) {
  // For Vercel Blob, the URL is inherently obscure. In S3, we would generate a signed URL:
  // const command = new GetObjectCommand({ Bucket, Key: storagePath });
  // return await getSignedUrl(s3, command, { expiresIn: 3600 });
  return storagePath; // MVP shortcut: Vercel Blob obscure string
}

// Delete payload physically
export async function deletePayload(storagePath: string) {
  // Extract path from Vercel URL or run delete straight
  await del(storagePath);
  return true;
}
