import { isPlatformAdminEmail } from "./platform-admin.ts";

export type AttachmentAccessUser = {
  id: string;
  email?: string | null;
};

export type AttachmentAccessRecord = {
  uploader_id: string;
  project_id?: string | null;
  url: string;
  purpose?: string | null;
  project?: {
    client_id: string | null;
    creator_id: string;
    organization?: {
      members?: { user_id: string }[];
    } | null;
    milestones?: { facilitator_id: string | null }[];
  } | null;
  milestone?: {
    facilitator_id: string | null;
    status: string;
    payload_storage_path: string | null;
  } | null;
  dispute?: {
    client_id: string;
    facilitator_id: string;
  } | null;
};

export type EscrowPayloadAccessRecord = {
  facilitator_id: string | null;
  status: string;
  payload_storage_path: string | null;
  project: {
    client_id: string | null;
    creator_id: string;
    organization?: {
      members?: { user_id: string }[];
    } | null;
  };
};

export function isPlatformAdmin(user: AttachmentAccessUser, adminEmail?: string) {
  return isPlatformAdminEmail(user.email, adminEmail ? { ADMIN_EMAIL: adminEmail } : process.env);
}

export function isEscrowPayloadAttachment(attachment: AttachmentAccessRecord) {
  return Boolean(
    attachment.milestone?.payload_storage_path &&
      attachment.url === attachment.milestone.payload_storage_path
  );
}

function isBuyerSideProjectUser(
  userId: string,
  project?: AttachmentAccessRecord["project"] | EscrowPayloadAccessRecord["project"] | null
) {
  if (!project) return false;

  return (
    project.client_id === userId ||
    project.creator_id === userId ||
    Boolean(project.organization?.members?.some((member) => member.user_id === userId))
  );
}

function isBuyerSideUser(userId: string, attachment: AttachmentAccessRecord) {
  return isBuyerSideProjectUser(userId, attachment.project);
}

function isAssignedFacilitator(userId: string, attachment: AttachmentAccessRecord) {
  return (
    attachment.milestone?.facilitator_id === userId ||
    attachment.dispute?.facilitator_id === userId ||
    Boolean(attachment.project?.milestones?.some((milestone) => milestone.facilitator_id === userId))
  );
}

export function canAccessAttachment(
  user: AttachmentAccessUser,
  attachment: AttachmentAccessRecord,
  adminEmail?: string
) {
  const isUploader = attachment.uploader_id === user.id;
  const isAdmin = isPlatformAdmin(user, adminEmail);
  const isBuyer = isBuyerSideUser(user.id, attachment) || attachment.dispute?.client_id === user.id;
  const isFacilitator = isAssignedFacilitator(user.id, attachment);

  if (!isUploader && !isAdmin && !isBuyer && !isFacilitator) {
    return false;
  }

  if (
    isEscrowPayloadAttachment(attachment) &&
    !isUploader &&
    !isAdmin &&
    attachment.milestone?.status !== "APPROVED_AND_PAID"
  ) {
    return false;
  }

  return true;
}

export function isEscrowPayloadLockedForUser(
  user: AttachmentAccessUser,
  milestone: EscrowPayloadAccessRecord,
  adminEmail?: string
) {
  const isAdmin = isPlatformAdmin(user, adminEmail);
  const isFacilitator = milestone.facilitator_id === user.id;
  const isBuyer = isBuyerSideProjectUser(user.id, milestone.project);

  return Boolean(
    milestone.payload_storage_path &&
      isBuyer &&
      !isAdmin &&
      !isFacilitator &&
      milestone.status !== "APPROVED_AND_PAID"
  );
}

export function canAccessEscrowPayload(
  user: AttachmentAccessUser,
  milestone: EscrowPayloadAccessRecord,
  adminEmail?: string
) {
  if (!milestone.payload_storage_path) return false;

  const isAdmin = isPlatformAdmin(user, adminEmail);
  const isBuyer = isBuyerSideProjectUser(user.id, milestone.project);
  const isFacilitator = milestone.facilitator_id === user.id;

  if (!isAdmin && !isBuyer && !isFacilitator) return false;
  if (isEscrowPayloadLockedForUser(user, milestone, adminEmail)) return false;

  return true;
}
