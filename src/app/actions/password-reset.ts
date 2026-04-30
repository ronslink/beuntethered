"use server";

import { prisma } from "@/lib/auth";
import { randomBytes } from "crypto";
import { hashPassword } from "@/lib/encryption";
import { buildAppUrl } from "@/lib/app-url";
import { sendTransactionalEmail } from "@/lib/resend";
import { assertDurableRateLimit, isRateLimitError, rateLimitKey } from "@/lib/rate-limit";
import { passwordResetInputSchema, passwordResetRequestInputSchema } from "@/lib/validators";

const RESET_EXPIRY_HOURS = 1;

function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Request a password reset email.
 * Does NOT reveal whether the account exists — always returns success.
 */
export async function requestPasswordReset(email: unknown) {
  const parsed = passwordResetRequestInputSchema.safeParse({ email });
  if (!parsed.success) {
    return { success: false, error: "Invalid email address" };
  }
  const normalizedEmail = parsed.data.email;

  try {
    await assertDurableRateLimit({
      key: rateLimitKey("auth.password-reset.request", normalizedEmail),
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });
  } catch (error) {
    if (isRateLimitError(error)) {
      return { success: false, error: error.message, code: error.code, retryAfterSeconds: error.retryAfterSeconds };
    }
    throw error;
  }

  // Always succeed to prevent email enumeration
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (!user || !user.password_hash) {
    // Don't reveal account status — but still "succeed"
    return { success: true, message: "If an account exists, a reset email has been sent." };
  }

  // Invalidate any existing reset tokens for this email
  await prisma.passwordResetToken.updateMany({
    where: { email: normalizedEmail, used_at: null },
    data: { used_at: new Date() },
  });

  const token = generateToken();
  const expires = new Date(Date.now() + RESET_EXPIRY_HOURS * 60 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: { email: normalizedEmail, token, expires },
  });

  const resetUrl = buildAppUrl(`/reset-password?token=${token}`);

  if (process.env.RESEND_API_KEY) {
    try {
      await sendTransactionalEmail({
        from: "beuntethered <noreply@beuntethered.com>",
        to: normalizedEmail,
        subject: "Reset your beuntethered password",
        html: `
          <p>You requested a password reset for your beuntethered account.</p>
          <p>Click the link below to set a new password (expires in ${RESET_EXPIRY_HOURS} hour):</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>If you didn't request this, you can safely ignore this email.</p>
        `,
      });
    } catch (err) {
      console.error("Failed to send reset email:", err);
    }
  } else {
    // Dev mode — log the token
    console.log(`[DEV] Password reset token for ${normalizedEmail}: ${token}`);
    console.log(`[DEV] Reset URL: ${resetUrl}`);
  }

  return { success: true, message: "If an account exists, a reset email has been sent." };
}

/**
 * Reset the password using a valid token.
 */
export async function resetPassword(token: unknown, newPassword: unknown) {
  const parsed = passwordResetInputSchema.safeParse({ token, newPassword });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Token and new password are required" };
  }
  const resetToken = parsed.data.token;
  const password = parsed.data.newPassword;

  try {
    await assertDurableRateLimit({
      key: rateLimitKey("auth.password-reset.submit", resetToken.slice(0, 16)),
      limit: 10,
      windowMs: 60 * 60 * 1000,
    });
  } catch (error) {
    if (isRateLimitError(error)) {
      return { success: false, error: error.message, code: error.code, retryAfterSeconds: error.retryAfterSeconds };
    }
    throw error;
  }

  const resetRecord = await prisma.passwordResetToken.findUnique({
    where: { token: resetToken },
  });

  if (!resetRecord) {
    return { success: false, error: "Invalid or expired reset token" };
  }

  if (resetRecord.used_at) {
    return { success: false, error: "This reset link has already been used" };
  }

  if (new Date() > resetRecord.expires) {
    return { success: false, error: "This reset link has expired" };
  }

  // Mark as used
  await prisma.passwordResetToken.update({
    where: { token: resetToken },
    data: { used_at: new Date() },
  });

  // Update the user's password
  const password_hash = await hashPassword(password);
  await prisma.user.update({
    where: { email: resetRecord.email },
    data: { password_hash },
  });

  return { success: true };
}
