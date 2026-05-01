"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import {
  organizationMemberInputSchema,
  organizationMemberRemovalInputSchema,
  organizationProfileInputSchema,
} from "@/lib/validators";
import { assertDurableRateLimit, isRateLimitError, rateLimitKey } from "@/lib/rate-limit";

async function organizationRateLimit(action: string, userId: string) {
  try {
    await assertDurableRateLimit({
      key: rateLimitKey(action, userId),
      limit: 30,
      windowMs: 60 * 60 * 1000,
    });
    return null;
  } catch (error) {
    if (isRateLimitError(error)) {
      return { success: false, code: error.code, error: error.message, retryAfterSeconds: error.retryAfterSeconds };
    }
    throw error;
  }
}

function normalizeOrganizationProfileInput(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  const data = input as Record<string, unknown>;
  const rawWebsite = typeof data.website === "string" ? data.website.trim() : data.website;
  const website =
    typeof rawWebsite === "string" && rawWebsite && !/^https?:\/\//i.test(rawWebsite)
      ? `https://${rawWebsite}`
      : rawWebsite;

  return {
    ...data,
    website,
    billingEmail: typeof data.billingEmail === "string" ? data.billingEmail.trim() : data.billingEmail,
    name: typeof data.name === "string" ? data.name.trim() : data.name,
    type: typeof data.type === "string" ? data.type.trim() : data.type,
  };
}

function getOrganizationProfileError(input: unknown) {
  const normalized = normalizeOrganizationProfileInput(input);
  const parsed = organizationProfileInputSchema.safeParse(normalized);
  if (parsed.success) return null;

  const fields = new Set(parsed.error.issues.map((issue) => String(issue.path[0] ?? "")));
  if (fields.has("name")) return "Enter a workspace name with at least 2 characters.";
  if (fields.has("website")) return "Enter a valid website, for example company.com or https://company.com.";
  if (fields.has("billingEmail")) return "Enter a valid billing email address.";
  return "Enter valid workspace details before saving.";
}

export async function updateOrganizationProfile(input: unknown) {
  const user = await getCurrentUser();
  if (!user || user.role !== "CLIENT") {
    return { success: false, code: "UNAUTHORIZED", error: "Only client accounts can manage workspace identity." };
  }
  const limited = await organizationRateLimit("organization.profile", user.id);
  if (limited) return limited;

  const normalizedInput = normalizeOrganizationProfileInput(input);
  const parsed = organizationProfileInputSchema.safeParse(normalizedInput);
  if (!parsed.success) {
    return { success: false, code: "INVALID_ORGANIZATION", error: getOrganizationProfileError(input) ?? "Enter valid workspace details before saving." };
  }

  const data = parsed.data;
  const normalized = {
    name: data.name,
    type: data.type || null,
    website: data.website || null,
    billing_email: data.billingEmail || null,
  };

  const organization = await prisma.$transaction(async (tx) => {
    let editableOrganizationId = data.organizationId || null;

    if (editableOrganizationId) {
      const membership = await tx.organizationMember.findFirst({
        where: {
          organization_id: editableOrganizationId,
          user_id: user.id,
          role: { in: ["OWNER", "ADMIN"] },
        },
        select: { organization_id: true },
      });
      editableOrganizationId = membership?.organization_id ?? null;
    }

    if (!editableOrganizationId) {
      const ownedOrganization = await tx.organization.findFirst({
        where: { owner_id: user.id },
        orderBy: { created_at: "asc" },
        select: { id: true },
      });
      editableOrganizationId = ownedOrganization?.id ?? null;
    }

    const saved = editableOrganizationId
      ? await tx.organization.update({
          where: { id: editableOrganizationId },
          data: normalized,
        })
      : await tx.organization.create({
          data: {
            owner_id: user.id,
            ...normalized,
            members: {
              create: {
                user_id: user.id,
                role: "OWNER",
              },
            },
          },
        });

    await tx.user.update({
      where: { id: user.id },
      data: {
        company_name: normalized.name,
        company_type: normalized.type,
      },
    });

    const verification = await tx.verification.upsert({
      where: {
        user_id_type: {
          user_id: user.id,
          type: "BUSINESS",
        },
      },
      create: {
        user_id: user.id,
        type: "BUSINESS",
        status: "PENDING",
        evidence: {
          organization_id: saved.id,
          website: normalized.website,
          billing_email: normalized.billing_email,
        },
      },
      update: {
        evidence: {
          organization_id: saved.id,
          website: normalized.website,
          billing_email: normalized.billing_email,
        },
      },
    });

    return { saved, verificationStatus: verification.status };
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");

  return { success: true, organizationId: organization.saved.id, businessVerificationStatus: organization.verificationStatus };
}

export async function addOrganizationMember(input: unknown) {
  const user = await getCurrentUser();
  if (!user || user.role !== "CLIENT") {
    return { success: false, code: "UNAUTHORIZED", error: "Only client workspace admins can add teammates." };
  }
  const limited = await organizationRateLimit("organization.member.add", user.id);
  if (limited) return limited;

  const parsed = organizationMemberInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, code: "INVALID_MEMBER", error: "Enter a valid teammate email and role." };
  }

  const { organizationId, email, role } = parsed.data;

  const result = await prisma.$transaction(async (tx) => {
    const actorMembership = await tx.organizationMember.findFirst({
      where: {
        organization_id: organizationId,
        user_id: user.id,
        role: { in: ["OWNER", "ADMIN"] },
      },
      select: { role: true },
    });

    if (!actorMembership) {
      return { success: false, code: "FORBIDDEN", error: "You need owner or admin access to manage this workspace." };
    }

    const teammate = await tx.user.findUnique({
      where: { email },
      select: { id: true, role: true },
    });

    if (!teammate || teammate.role !== "CLIENT") {
      return { success: false, code: "USER_NOT_FOUND", error: "Invite a registered client user to this workspace." };
    }

    const existing = await tx.organizationMember.findUnique({
      where: {
        organization_id_user_id: {
          organization_id: organizationId,
          user_id: teammate.id,
        },
      },
      select: { id: true, role: true },
    });

    if (existing?.role === "OWNER") {
      return { success: false, code: "OWNER_LOCKED", error: "Workspace owners cannot be reassigned from this panel." };
    }

    const membership = existing
      ? await tx.organizationMember.update({
          where: { id: existing.id },
          data: { role },
          select: { id: true },
        })
      : await tx.organizationMember.create({
          data: {
            organization_id: organizationId,
            user_id: teammate.id,
            role,
          },
          select: { id: true },
        });

    return { success: true, membershipId: membership.id };
  });

  if (result.success) {
    revalidatePath("/settings");
  }

  return result;
}

export async function removeOrganizationMember(input: unknown) {
  const user = await getCurrentUser();
  if (!user || user.role !== "CLIENT") {
    return { success: false, code: "UNAUTHORIZED", error: "Only client workspace admins can remove teammates." };
  }
  const limited = await organizationRateLimit("organization.member.remove", user.id);
  if (limited) return limited;

  const parsed = organizationMemberRemovalInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, code: "INVALID_MEMBER", error: "Choose a valid workspace member to remove." };
  }

  const { organizationId, memberId } = parsed.data;

  const result = await prisma.$transaction(async (tx) => {
    const actorMembership = await tx.organizationMember.findFirst({
      where: {
        organization_id: organizationId,
        user_id: user.id,
        role: { in: ["OWNER", "ADMIN"] },
      },
      select: { role: true },
    });

    if (!actorMembership) {
      return { success: false, code: "FORBIDDEN", error: "You need owner or admin access to manage this workspace." };
    }

    const targetMembership = await tx.organizationMember.findFirst({
      where: {
        id: memberId,
        organization_id: organizationId,
      },
      select: { id: true, role: true, user_id: true },
    });

    if (!targetMembership) {
      return { success: false, code: "NOT_FOUND", error: "That teammate is no longer in this workspace." };
    }

    if (targetMembership.role === "OWNER") {
      return { success: false, code: "OWNER_LOCKED", error: "Workspace owners cannot be removed." };
    }

    if (targetMembership.role === "ADMIN" && actorMembership.role !== "OWNER") {
      return { success: false, code: "OWNER_REQUIRED", error: "Only workspace owners can remove admins." };
    }

    await tx.organizationMember.delete({ where: { id: targetMembership.id } });
    return { success: true };
  });

  if (result.success) {
    revalidatePath("/settings");
  }

  return result;
}
