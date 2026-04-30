type BYOCRecipientUser = {
  id: string;
  role: string;
};

export function validateBYOCInviteRecipient({
  invitedEmail,
  existingUser,
  facilitatorId,
}: {
  invitedEmail: string | null;
  existingUser: BYOCRecipientUser | null;
  facilitatorId: string;
}) {
  if (!invitedEmail || !existingUser) {
    return { valid: true as const };
  }

  if (existingUser.id === facilitatorId) {
    return {
      valid: false as const,
      code: "BYOC_CLIENT_EMAIL_IS_FACILITATOR",
      message: "Use the client buyer email here. This email belongs to your facilitator account.",
    };
  }

  if (existingUser.role !== "CLIENT") {
    return {
      valid: false as const,
      code: "BYOC_CLIENT_EMAIL_ROLE_INVALID",
      message: "Use a client buyer email here. BYOC invites cannot be sent to facilitator accounts.",
    };
  }

  return { valid: true as const };
}
