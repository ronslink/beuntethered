import assert from "node:assert/strict";
import test from "node:test";
import { applySowGuardrails } from "../src/lib/sow-guardrails.ts";

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
          title: "Payroll Setup",
          description: "Build the payroll setup workflow for admins.",
          deliverables: ["Payroll setup workflow"],
          acceptance_criteria: "Admin can review payroll setup in a staging preview.",
          estimated_duration_days: 7,
          amount: 2000,
        },
        {
          title: "Employee Payslips",
          description: "Create employee payslip generation for buyer review.",
          deliverables: ["Payslip generation screen"],
          acceptance_criteria: "Employee can download a payslip and the submission includes screenshot evidence.",
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
