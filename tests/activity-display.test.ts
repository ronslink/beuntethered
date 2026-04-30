import assert from "node:assert/strict";
import test from "node:test";
import {
  buildActivityNotificationCopy,
  getActivityEvidenceDetails,
  getActivityLabel,
  getActorScopeLabel,
  getProjectActivityHref,
  isWorkspaceAdminActivity,
} from "../src/lib/activity-display.ts";

test("activity labels use operation metadata for system events", () => {
  assert.equal(getActivityLabel("SYSTEM_EVENT", { operation: "SOW_UPDATED" }), "Scope updated");
  assert.equal(getActivityLabel("PROJECT_CREATED", { operation: "BYOC_INVITE_CREATED" }), "BYOC invite created");
  assert.equal(getActivityLabel("SYSTEM_EVENT", { operation: "BYOC_INVITE_CLAIMED" }), "BYOC invite claimed");
  assert.equal(
    getActivityLabel("SYSTEM_EVENT", { operation: "BYOC_INVITE_DELIVERY_RECORDED" }),
    "BYOC invite delivery recorded",
  );
  assert.equal(
    getActivityLabel("PROJECT_CREATED", { operation: "BYOC_REGISTERED_CLIENT_PROJECT_CREATED" }),
    "BYOC client project created",
  );
  assert.equal(getActivityLabel("BID_SHORTLISTED"), "Bid shortlisted");
});

test("activity scope labels distinguish workspace admin actions", () => {
  const metadata = {
    actor_scope: "WORKSPACE_ADMIN",
    actor_project_role: "ADMIN",
    workspace_admin_action: true,
  };

  assert.equal(getActorScopeLabel(metadata), "Workspace admin");
  assert.equal(isWorkspaceAdminActivity(metadata), true);
});

test("activity notification copy includes project and actor context", () => {
  assert.deepEqual(
    buildActivityNotificationCopy({
      action: "SYSTEM_EVENT",
      metadata: {
        operation: "LISTING_ARCHIVED",
        actor_scope: "PROJECT_OWNER",
        workspace_admin_action: false,
      },
      projectTitle: "Enterprise Portal",
      actorName: "Avery Buyer",
      actorRole: "CLIENT",
    }),
    {
      message: 'Listing archived on "Enterprise Portal"',
      detail: "Avery Buyer - Project owner",
      isWorkspaceAdmin: false,
    }
  );
});

test("activity hrefs route open bidding projects to proposal review", () => {
  assert.equal(getProjectActivityHref({ id: "project_1", status: "OPEN_BIDDING" }), "/projects/project_1");
  assert.equal(getProjectActivityHref({ id: "project_2", status: "ACTIVE" }), "/command-center/project_2");
});

test("activity evidence details make BYOC delivery and claim events readable", () => {
  assert.deepEqual(
    getActivityEvidenceDetails({
      operation: "BYOC_INVITE_DELIVERY_RECORDED",
      existing_client_account: true,
      email_delivery_sent: false,
      email_delivery_skipped: "RESEND_API_KEY_MISSING",
      in_app_notification_sent: true,
    }),
    [
      { label: "Email", value: "resend api key missing", tone: "attention" },
      { label: "Buyer account", value: "existing", tone: "positive" },
      { label: "In-app action", value: "created", tone: "positive" },
    ],
  );

  assert.deepEqual(
    getActivityEvidenceDetails({
      operation: "BYOC_INVITE_CLAIMED",
      transition_mode: "running project",
      first_milestone_title: "Operations repair handoff",
      first_milestone_amount_cents: 280000,
      next_action: "FUND_FIRST_MILESTONE",
    }),
    [
      { label: "Transition", value: "running project", tone: "neutral" },
      { label: "First milestone", value: "Operations repair handoff", tone: "neutral" },
      { label: "Funding target", value: "$2,800", tone: "neutral" },
      { label: "Next action", value: "fund first milestone", tone: "attention" },
    ],
  );
});
