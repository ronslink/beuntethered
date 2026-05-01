import assert from "node:assert/strict";
import test from "node:test";
import {
  applySowGuardrails,
  buildSowGuardrailReport,
  getSowGuardrailReportFromMetadata,
  isSowGuardrailReport,
} from "../src/lib/sow-guardrails.ts";

const payrollConstraints = {
  regions: ["North America", "Middle East", "Asia"],
  targets: ["Admin dashboard"],
  components: [
    "automated tax calculations",
    "payslip generation",
    "AI chatbot for employee inquiries",
    "admin reporting dashboard",
  ],
  budget: "$15,000",
  budgetAmount: 15000,
  timelineDays: 30,
};

test("guards generated SOWs against ignored buyer budget, timeline, regions, and components", () => {
  const guarded = applySowGuardrails(
    {
      title: "Payroll App",
      executiveSummary:
        "Multi-country payroll application covering US, Canada, UAE, and Philippines with compliance features.",
      milestones: [
        {
          title: "Payroll Configuration Workflow",
          description: "Build the payroll setup workflow so admins can configure employee payroll rules and verify regional settings.",
          deliverables: ["Payroll setup workflow", "Regional payroll configuration screen"],
          acceptance_criteria: [
            "Admin can configure payroll rules in a staging preview.",
            "Submission includes screenshots and setup notes for regional payroll settings.",
          ],
          estimated_duration_days: 7,
          amount: 2000,
        },
        {
          title: "Employee Payslip Download",
          description: "Create employee payslip generation for buyer review.",
          deliverables: ["Payslip generation screen", "Payslip download flow"],
          acceptance_criteria: [
            "Employee can download a payslip from the staging preview.",
            "Submission includes screenshot evidence and generated payslip files.",
          ],
          estimated_duration_days: 7,
          amount: 3000,
        },
      ],
      totalAmount: 5000,
    },
    payrollConstraints
  );

  const milestones = guarded.milestones as Array<{ amount: number; estimated_duration_days: number }>;
  const totalAmount = milestones.reduce((sum, milestone) => sum + Number(milestone.amount), 0);
  const totalDays = milestones.reduce((sum, milestone) => sum + Number(milestone.estimated_duration_days), 0);
  const serialized = JSON.stringify(guarded);

  assert.equal(totalAmount, 15000);
  assert.equal(guarded.totalAmount, 15000);
  assert.equal(totalDays, 30);
  assert.doesNotMatch(String(guarded.executiveSummary), /\bUS\b|Canada|UAE|Philippines/);
  assert.match(String(guarded.executiveSummary), /North America, Middle East, Asia/);
  assert.match(serialized, /automated tax calculations/);
  assert.match(serialized, /payslip generation/);
  assert.match(serialized, /AI chatbot for employee inquiries/);
  assert.match(serialized, /admin reporting dashboard/);

  const report = buildSowGuardrailReport(guarded, payrollConstraints);
  assert.equal(report.overallStatus, "passed");
  assert.equal(report.items.find((item) => item.key === "budget")?.status, "passed");
  assert.equal(report.items.find((item) => item.key === "timeline")?.status, "passed");
  assert.equal(report.items.find((item) => item.key === "regions")?.missing?.length, 0);
  assert.equal(report.items.find((item) => item.key === "components")?.missing?.length, 0);
});

test("guards generated milestones against process-only deliverables", () => {
  const guarded = applySowGuardrails(
    {
      title: "Checkout Fix",
      executiveSummary: "Fix the checkout workflow.",
      milestones: [
        {
          title: "Payment Checkout Flow",
          description: "Build a checkout flow where buyers can complete payment and see confirmation.",
          deliverables: ["Testing and bug fixes"],
          acceptance_criteria: "Buyer can complete checkout in staging.",
          estimated_duration_days: 2,
          amount: 100,
        },
      ],
    },
    {
      regions: [],
      targets: ["Payment or billing system"],
      components: ["checkout confirmation"],
      budget: "$1,000",
      budgetAmount: 1000,
      timelineDays: 5,
    }
  );

  const [milestone] = guarded.milestones as Array<{
    deliverables: string[];
    acceptance_criteria: string;
    amount: number;
    estimated_duration_days: number;
  }>;

  assert.equal(milestone.deliverables.some((deliverable) => /testing|bug fix/i.test(deliverable)), false);
  assert.ok(milestone.deliverables.length >= 2);
  assert.equal(milestone.amount, 1000);
  assert.equal(milestone.estimated_duration_days, 5);
  assert.match(milestone.acceptance_criteria, /preview|evidence|handoff|source|screenshot|log/i);
});

test("reports unresolved guardrail gaps for buyer review", () => {
  const report = buildSowGuardrailReport(
    {
      executiveSummary: "Build a payroll app for North America.",
      milestones: [
        {
          title: "Payroll Setup",
          description: "Create the payroll setup workflow.",
          deliverables: ["Payroll setup workflow"],
          acceptance_criteria: "Admin can review setup.",
          estimated_duration_days: 5,
          amount: 2000,
        },
      ],
    },
    payrollConstraints
  );

  assert.equal(report.overallStatus, "needs_attention");
  assert.equal(report.items.find((item) => item.key === "budget")?.status, "needs_attention");
  assert.equal(report.items.find((item) => item.key === "timeline")?.status, "needs_attention");
  assert.deepEqual(report.items.find((item) => item.key === "regions")?.missing, ["Middle East", "Asia"]);
  assert.ok(report.items.find((item) => item.key === "components")?.missing?.includes("AI chatbot for employee inquiries"));
  assert.equal(report.items.find((item) => item.key === "milestoneEvidence")?.status, "needs_attention");
});

test("recognizes persisted SOW guardrail reports in activity metadata", () => {
  const report = buildSowGuardrailReport(
    {
      executiveSummary: "Build a payroll app for North America, Middle East, and Asia.",
      milestones: [
        {
          title: "Payroll Evidence Slice",
          description: "Build a staging payroll slice covering automated tax calculations, payslip generation, AI chatbot for employee inquiries, and admin reporting dashboard.",
          deliverables: ["Payroll staging preview", "Audit evidence packet"],
          acceptance_criteria: [
            "Buyer can inspect screenshots, source links, and staging proof.",
            "Submission includes evidence for each named component.",
          ],
          estimated_duration_days: 30,
          amount: 15000,
        },
      ],
    },
    payrollConstraints
  );

  assert.equal(isSowGuardrailReport(report), true);
  assert.deepEqual(getSowGuardrailReportFromMetadata({ scope_validation_report: report }), report);
  assert.equal(getSowGuardrailReportFromMetadata({ scope_validation_report: { ...report, overallStatus: "unknown" } }), null);
  assert.equal(isSowGuardrailReport({ ...report, overallStatus: "unknown" }), false);
  assert.equal(isSowGuardrailReport({ ...report, items: [{ key: "budget", status: "passed" }] }), false);
  assert.equal(isSowGuardrailReport(null), false);
});
