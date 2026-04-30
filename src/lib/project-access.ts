import { prisma } from "@/lib/auth";
import {
  canManageBuyerProjectRole,
  buyerProjectListWhere,
  buyerProjectManagerListWhere,
  buildBuyerActivityMetadata,
  getBuyerProjectRoleFromMembership,
  projectBuyerAccessWhere,
  projectMessagingAccessWhere,
  projectParticipantWhere,
} from "@/lib/project-access-rules";

export {
  canManageBuyerProjectRole,
  buyerProjectListWhere,
  buyerProjectManagerListWhere,
  buildBuyerActivityMetadata,
  getBuyerProjectRoleFromMembership,
  projectBuyerAccessWhere,
  projectMessagingAccessWhere,
  projectParticipantWhere,
};

export const PROJECT_MESSAGE_ACCESS_DENIED = "You do not have access to project messages.";

export async function userCanAccessProject(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: projectParticipantWhere(projectId, userId),
    select: { id: true },
  });

  return Boolean(project);
}

export async function assertProjectParticipantAccess(projectId: string, userId: string) {
  const hasAccess = await userCanAccessProject(projectId, userId);
  if (!hasAccess) {
    throw new Error("You do not have access to this project.");
  }
}

export async function userCanAccessProjectMessages(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: projectMessagingAccessWhere(projectId, userId),
    select: { id: true },
  });

  return Boolean(project);
}

export async function assertProjectMessageAccess(projectId: string, userId: string) {
  const hasAccess = await userCanAccessProjectMessages(projectId, userId);
  if (!hasAccess) {
    throw new Error(PROJECT_MESSAGE_ACCESS_DENIED);
  }
}

export async function userCanAccessBuyerProject(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: projectBuyerAccessWhere(projectId, userId),
    select: { id: true },
  });

  return Boolean(project);
}

export async function getProjectBuyerRole(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      client_id: true,
      organization: {
        select: {
          members: {
            where: { user_id: userId },
            select: { user_id: true, role: true },
          },
        },
      },
    },
  });

  if (!project) return null;
  return getBuyerProjectRoleFromMembership({
    clientId: project.client_id,
    userId,
    members: project.organization?.members ?? [],
  });
}

export async function userCanManageBuyerProject(projectId: string, userId: string) {
  const role = await getProjectBuyerRole(projectId, userId);
  return canManageBuyerProjectRole(role);
}

export async function assertProjectBuyerManager(projectId: string, userId: string) {
  const canManage = await userCanManageBuyerProject(projectId, userId);
  if (!canManage) {
    throw new Error("You need owner or admin access to manage this project.");
  }
}

export async function getProjectBuyerActivityMetadata(projectId: string, userId: string) {
  const role = await getProjectBuyerRole(projectId, userId);
  return buildBuyerActivityMetadata(role);
}
