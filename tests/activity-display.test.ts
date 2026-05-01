import assert from "node:assert/strict";
import test from "node:test";
import {
  buildActivityNotificationCopy,
  getActivityEvidenceDetails,
  getActivityLabel,
  getActivityNarrative,
  getActorScopeLabel,
  getProjectActivityHref,
  isWorkspaceAdminActivity,
} from "../src/lib/activity-display.ts";

test("activity labels use operation metadata for system events", () => {
  assert.equal(getActivityLabel("SYSTEM_EVENT", { operation: "SOW_UPDATED" }), "Scope updated");
  assert.equal(getActivityLabel("PROJECT_CREATED", { operation: "BYOC_INVITE_CREATED" }), "BYOC invite created");
  assert.equal(getActivityLabel("SYSTEM_EVENT", { operation: "BYOC_INVITE_CLAIMED" }), "BYOC invite claimed");
  assert.equal(getActivityLabel("SYSTEM_EVENT", { operation: "MILESTONE_CHECKOUT_STARTED" }), "Escrow checkout started");
  assert.equal(getActivityLabel("SYSTEM_EVENT", { operation: "ARBITRATION_REFUND" }), "Arbitration refund");
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

test("activity evidence details make payment checkout lifecycle readable", () => {
  assert.deepEqual(
    getActivityEvidenceDetails({
      operation: "MILESTONE_CHECKOUT_CANCELLED",
      payment_status: "CANCELLED",
      gross_amount_cents: 120000,
      platform_fee_cents: 9600,
      client_total_cents: 129600,
      fee_model: "MARKETPLACE",
    }),
    [
      { label: "Fee model", value: "marketplace", tone: "neutral" },
      { label: "Escrow", value: "$1,200", tone: "neutral" },
      { label: "Client fee", value: "$96", tone: "neutral" },
      { label: "Total due", value: "$1,296", tone: "neutral" },
      { label: "Status", value: "cancelled", tone: "attention" },
    ],
  );
});

test("activity evidence details make arbitration outcomes readable", () => {
  const metadata = {
    operation: "ARBITRATION_REFUND",
    standing: "CLIENT",
    client_refund_cents: 453600,
    latest_audit_score: 64,
    latest_audit_passing: false,
    resolution_note: "Preview failed and required evidence was missing.",
    evidence_summary: {
      submitted_evidence_count: 2,
      release_attestation_count: 1,
    },
  };

  assert.deepEqual(getActivityEvidenceDetails(metadata), [
    { label: "Ruling", value: "client", tone: "attention" },
    { label: "Client refund", value: "$4,536", tone: "attention" },
    { label: "Audit", value: "64% failed", tone: "attention" },
    { label: "Evidence", value: "2", tone: "neutral" },
    { label: "Attestations", value: "1", tone: "positive" },
  ]);
  assert.equal(getActivityNarrative(metadata), "Preview failed and required evidence was missing.");
});

test("activity evidence details show posted scope validation", () => {
  const metadata = {
    operation: "PROJECT_POSTED",
    milestone_count: 2,
    scope_validation_report: {
      overallStatus: "passed",
      items: [
        { key: "budget", label: "Budget lock", status: "passed", detail: "Budget matched." },
        { key: "timeline", label: "Timeline lock", status: "passed", detail: "Timeline matched." },
        { key: "regions", label: "Region coverage", status: "passed", detail: "Regions matched." },
        { key: "components", label: "Component coverage", status: "passed", detail: "Components matched." },
        { key: "milestoneEvidence", label: "Milestone evidence", status: "passed", detail: "Evidence ready." },
      ],
    },
  };

  assert.deepEqual(getActivityEvidenceDetails(metadata), [
    { label: "Scope validation", value: "passed", tone: "positive" },
    { label: "Milestones", value: "2", tone: "neutral" },
    { label: "Budget", value: "passed", tone: "positive" },
    { label: "Timeline", value: "passed", tone: "positive" },
    { label: "Regions", value: "passed", tone: "positive" },
    { label: "Components", value: "passed", tone: "positive" },
    { label: "Evidence", value: "passed", tone: "positive" },
  ]);
  assert.equal(getActivityNarrative(metadata), "Scope validation passed before marketplace posting.");
});

test("activity evidence details flag posted scope validation gaps", () => {
  const metadata = {
    operation: "PROJECT_POSTED",
    milestone_count: 1,
    scope_validation_report: {
      overallStatus: "needs_attention",
      items: [
        { key: "budget", label: "Budget lock", status: "passed", detail: "Budget matched." },
        { key: "timeline", label: "Timeline lock", status: "needs_attention", detail: "Timeline mismatch." },
        { key: "milestoneEvidence", label: "Milestone evidence", status: "needs_attention", detail: "Evidence needs work." },
      ],
    },
  };

  const details = getActivityEvidenceDetails(metadata);

  assert.deepEqual(details.slice(0, 4), [
    { label: "Scope validation", value: "needs attention", tone: "attention" },
    { label: "Milestones", value: "1", tone: "neutral" },
    { label: "Budget", value: "passed", tone: "positive" },
    { label: "Timeline", value: "needs attention", tone: "attention" },
  ]);
  assert.equal(getActivityNarrative(metadata), "Scope validation found items to review before facilitator delivery.");
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
