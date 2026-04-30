import type { Prisma } from "@prisma/client";

export type BuyerProjectRole = "OWNER" | "ADMIN" | "MEMBER" | null;
export type BuyerActorScope = "PROJECT_OWNER" | "WORKSPACE_ADMIN" | "WORKSPACE_MEMBER" | "UNAUTHORIZED";

export function canManageBuyerProjectRole(role: BuyerProjectRole) {
  return role === "OWNER" || role === "ADMIN";
}

export function getBuyerActorScope(role: BuyerProjectRole): BuyerActorScope {
  if (role === "OWNER") return "PROJECT_OWNER";
  if (role === "ADMIN") return "WORKSPACE_ADMIN";
  if (role === "MEMBER") return "WORKSPACE_MEMBER";
  return "UNAUTHORIZED";
}

export function buildBuyerActivityMetadata(role: BuyerProjectRole) {
  return {
    actor_project_role: role ?? "NONE",
    actor_scope: getBuyerActorScope(role),
    workspace_admin_action: role === "ADMIN",
  };
}

export function getBuyerProjectRoleFromMembership({
  clientId,
  userId,
  members,
}: {
  clientId: string | null;
  userId: string;
  members: { user_id?: string; role: "OWNER" | "ADMIN" | "MEMBER" }[];
}): BuyerProjectRole {
  if (clientId === userId) return "OWNER";
  const membership = members.find(member => !member.user_id || member.user_id === userId);
  return membership?.role ?? null;
}

export function projectParticipantWhere(projectId: string, userId: string): Prisma.ProjectWhereInput {
  return {
    id: projectId,
    OR: [
      { client_id: userId },
      { creator_id: userId },
      { organization: { members: { some: { user_id: userId } } } },
      { milestones: { some: { facilitator_id: userId } } },
      { bids: { some: { developer_id: userId } } },
    ],
  };
}

export function projectMessagingAccessWhere(projectId: string, userId: string): Prisma.ProjectWhereInput {
  return {
    id: projectId,
    OR: [
      { client_id: userId },
      { creator_id: userId },
      { organization: { members: { some: { user_id: userId } } } },
      { milestones: { some: { facilitator_id: userId } } },
    ],
  };
}

export function projectBuyerAccessWhere(projectId: string, userId: string): Prisma.ProjectWhereInput {
  return {
    id: projectId,
    OR: [
      { client_id: userId },
      { organization: { members: { some: { user_id: userId } } } },
    ],
  };
}

export function buyerProjectListWhere(userId: string): Prisma.ProjectWhereInput {
  return {
    OR: [
      { client_id: userId },
      { organization: { members: { some: { user_id: userId } } } },
    ],
  };
}

export function buyerProjectManagerListWhere(userId: string): Prisma.ProjectWhereInput {
  return {
    OR: [
      { client_id: userId },
      { organization: { members: { some: { user_id: userId, role: { in: ["OWNER", "ADMIN"] } } } } },
    ],
  };
}
