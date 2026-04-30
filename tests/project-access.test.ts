import assert from "node:assert/strict";
import test from "node:test";
import {
  canManageBuyerProjectRole,
  buyerProjectListWhere,
  buyerProjectManagerListWhere,
  buildBuyerActivityMetadata,
  getBuyerProjectRoleFromMembership,
  projectBuyerAccessWhere,
  projectMessagingAccessWhere,
  projectParticipantWhere,
} from "../src/lib/project-access-rules.ts";

test("project participant access includes organization members", () => {
  const where = projectParticipantWhere("project_1", "user_1");

  assert.equal(where.id, "project_1");
  assert.deepEqual(where.OR?.at(2), {
    organization: { members: { some: { user_id: "user_1" } } },
  });
});

test("buyer activity metadata marks workspace admin actions", () => {
  assert.deepEqual(buildBuyerActivityMetadata("OWNER"), {
    actor_project_role: "OWNER",
    actor_scope: "PROJECT_OWNER",
    workspace_admin_action: false,
  });

  assert.deepEqual(buildBuyerActivityMetadata("ADMIN"), {
    actor_project_role: "ADMIN",
    actor_scope: "WORKSPACE_ADMIN",
    workspace_admin_action: true,
  });
});

test("buyer project list rules include all members but manager list excludes viewers", () => {
  assert.deepEqual(buyerProjectListWhere("user_1").OR?.at(1), {
    organization: { members: { some: { user_id: "user_1" } } },
  });

  assert.deepEqual(buyerProjectManagerListWhere("user_1").OR?.at(1), {
    organization: { members: { some: { user_id: "user_1", role: { in: ["OWNER", "ADMIN"] } } } },
  });
});

test("buyer project access excludes facilitator bid participation", () => {
  const where = projectBuyerAccessWhere("project_1", "user_1");

  assert.equal(where.id, "project_1");
  assert.equal(where.OR?.length, 2);
  assert.deepEqual(where.OR?.at(1), {
    organization: { members: { some: { user_id: "user_1" } } },
  });
});

test("project message access excludes bid-only participants", () => {
  const where = projectMessagingAccessWhere("project_1", "user_1");

  assert.equal(where.id, "project_1");
  assert.equal(where.OR?.length, 4);
  assert.deepEqual(where.OR?.at(3), {
    milestones: { some: { facilitator_id: "user_1" } },
  });
  assert.equal(JSON.stringify(where).includes("developer_id"), false);
});

test("buyer project role rules separate managers from viewers", () => {
  assert.equal(getBuyerProjectRoleFromMembership({
    clientId: "owner_1",
    userId: "owner_1",
    members: [],
  }), "OWNER");

  assert.equal(getBuyerProjectRoleFromMembership({
    clientId: "owner_1",
    userId: "admin_1",
    members: [{ user_id: "admin_1", role: "ADMIN" }],
  }), "ADMIN");

  assert.equal(canManageBuyerProjectRole("OWNER"), true);
  assert.equal(canManageBuyerProjectRole("ADMIN"), true);
  assert.equal(canManageBuyerProjectRole("MEMBER"), false);
  assert.equal(canManageBuyerProjectRole(null), false);
});
