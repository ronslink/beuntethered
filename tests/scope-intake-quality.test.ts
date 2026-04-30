import assert from "node:assert/strict";
import test from "node:test";
import { assessScopeIntake } from "../src/lib/scope-intake-quality.ts";

test("blocks vague requests that cannot become valid milestones", () => {
  const assessment = assessScopeIntake("Build me something cool");

  assert.equal(assessment.status, "needs_detail");
  assert.ok(assessment.issues.some((issue) => issue.code === "no_software_outcome"));
  assert.ok(assessment.guidingQuestions.some((question) => /website, app, dashboard/.test(question)));
});

test("explains why process-only work is not a standalone deliverable", () => {
  const assessment = assessScopeIntake("Testing and bug fixes");

  assert.equal(assessment.status, "needs_detail");
  assert.ok(assessment.issues.some((issue) => issue.code === "process_only"));
  assert.ok(assessment.guidingQuestions.some((question) => /tangible feature/.test(question)));
  assert.match(
    assessment.issues.find((issue) => issue.code === "process_only")?.why ?? "",
    /standalone escrow milestones/
  );
});

test("warns when a viable software scope is missing delivery constraints", () => {
  const assessment = assessScopeIntake(
    "Build a payroll application for employees and admins with automated tax calculations and payslip generation for US and Canada."
  );

  assert.equal(assessment.status, "ready");
  assert.equal(assessment.inputStyle, "delivery_scope");
  assert.ok(assessment.issues.some((issue) => issue.code === "missing_constraints"));
  assert.ok(assessment.guidingQuestions.some((question) => /budget, timeline/.test(question)));
  assert.match(assessment.suggestedPrompt, /Constraints include/);
});

test("detects business problem statements and asks workflow-specific questions", () => {
  const assessment = assessScopeIntake(
    "I want customer payments from my website to sync cleanly into QuickBooks so finance admins can review invoices."
  );

  assert.equal(assessment.status, "ready");
  assert.equal(assessment.inputStyle, "problem_statement");
  assert.equal(assessment.problemPattern?.id, "payment_accounting_sync");
  assert.equal(assessment.problemPattern?.label, "Payment + Accounting Sync");
  assert.ok(assessment.problemPattern?.proofExamples.some((proof) => /accounting sync log/.test(proof)));
  assert.ok(assessment.guidingQuestions.some((question) => /trigger the workflow/.test(question)));
  assert.ok(assessment.guidingQuestions.some((question) => /missing, duplicated, rejected/.test(question)));
  assert.match(assessment.suggestedPrompt, /Business problem:/);
  assert.match(assessment.suggestedPrompt, /Likely project pattern: Payment \+ Accounting Sync/);
  assert.match(assessment.suggestedPrompt, /Current systems:/);
  assert.match(assessment.suggestedPrompt, /accounting sync log/);
});

test("classifies common problem statement patterns beyond accounting", () => {
  const leadWorkflow = assessScopeIntake(
    "We need website leads from our contact form routed into HubSpot so the sales team can follow up without missing inquiries."
  );
  const reportingWorkflow = assessScopeIntake(
    "Our team spends hours copying data from spreadsheets into a weekly dashboard report for managers."
  );

  assert.equal(leadWorkflow.inputStyle, "problem_statement");
  assert.equal(leadWorkflow.problemPattern?.id, "lead_crm_routing");
  assert.ok(leadWorkflow.suggestedPrompt.includes("CRM record screenshot"));

  assert.equal(reportingWorkflow.inputStyle, "problem_statement");
  assert.equal(reportingWorkflow.problemPattern?.id, "reporting_automation");
  assert.ok(reportingWorkflow.suggestedPrompt.includes("generated report export"));
});

test("accepts a clear, verifiable software delivery prompt", () => {
  const assessment = assessScopeIntake(
    "Build a payroll application for employees and admins covering US and Canada with automated tax calculations, payslip generation, admin reporting dashboard, staging demo evidence with screenshots and QA reports, budget $15,000, and target timeline 30 days."
  );

  assert.equal(assessment.status, "ready");
  assert.equal(assessment.inputStyle, "delivery_scope");
  assert.equal(assessment.issues.length, 0);
  assert.equal(assessment.guidingQuestions.length, 0);
});
