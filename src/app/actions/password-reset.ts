"use server";

import { prisma } from "@/lib/auth";
import { Resend } from "resend";
import { randomBytes } from "crypto";
import { hashPassword } from "@/lib/encryption";

const resend = new Resend(process.env.RESEND_API_KEY);
const RESET_EXPIRY_HOURS = 1;

function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Request a password reset email.
 * Does NOT reveal whether the account exists — always returns success.
 */
export async function requestPasswordReset(email: string) {
  if (!isValidEmail(email)) {
    return { success: false, error: "Invalid email address" };
  }

  // Always succeed to prevent email enumeration
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.password_hash) {
    // Don't reveal account status — but still "succeed"
    return { success: true, message: "If an account exists, a reset email has been sent." };
  }

  // Invalidate any existing reset tokens for this email
  await prisma.passwordResetToken.updateMany({
    where: { email, used_at: null },
    data: { used_at: new Date() },
  });

  const token = generateToken();
  const expires = new Date(Date.now() + RESET_EXPIRY_HOURS * 60 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: { email, token, expires },
  });

  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;

  if (process.env.RESEND_API_KEY) {
    try {
      await resend.emails.send({
        from: "beuntethered <noreply@beuntethered.com>",
        to: email,
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
    console.log(`[DEV] Password reset token for ${email}: ${token}`);
    console.log(`[DEV] Reset URL: ${resetUrl}`);
  }

  return { success: true, message: "If an account exists, a reset email has been sent." };
}

/**
 * Reset the password using a valid token.
 */
export async function resetPassword(token: string, newPassword: string) {
  if (!token || !newPassword) {
    return { success: false, error: "Token and new password are required" };
  }

  if (newPassword.length < 8) {
    return { success: false, error: "Password must be at least 8 characters" };
  }

  const resetRecord = await prisma.passwordResetToken.findUnique({
    where: { token },
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
    where: { token },
    data: { used_at: new Date() },
  });

  // Update the user's password
  const password_hash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { email: resetRecord.email },
    data: { password_hash },
  });

  return { success: true };
}