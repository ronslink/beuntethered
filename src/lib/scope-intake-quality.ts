export type ScopeIntakeIssue = {
  code: string;
  label: string;
  why: string;
  hint: string;
  severity: "blocker" | "warning";
};

export type ScopeIntakeAssessment = {
  status: "ready" | "needs_detail";
  inputStyle: "delivery_scope" | "problem_statement";
  score: number;
  issues: ScopeIntakeIssue[];
  guidingQuestions: string[];
  suggestedPrompt: string;
};

const SOFTWARE_TERMS =
  /\b(app|application|software|platform|dashboard|portal|workflow|api|integration|automation|chatbot|agent|website|web app|mobile|system|tool|database|reporting|analytics|payroll|crm|billing|payment|payslip|tax|compliance)\b/i;

const OUTCOME_TERMS =
  /\b(build|create|develop|modernize|integrate|connect|sync|capture|import|export|route|reconcile|automate|generate|calculate|track|report|launch|deliver|enable|support|covering|with)\b/i;

const USER_TERMS =
  /\b(user|users|customer|customers|client|clients|employee|employees|admin|admins|manager|managers|team|teams|buyer|operator|staff|facilitator)\b/i;

const VERIFICATION_TERMS =
  /\b(preview|staging|demo|screenshot|screenshots|report|reports|logs|source|repo|repository|test|tests|qa|evidence|acceptance|export|file|files|handoff|documentation|runbook|dashboard|payslip|api|endpoint)\b/i;

const CONSTRAINT_TERMS =
  /\b(budget|timeline|deadline|days|weeks|months|by\s+\w+|usd|\$|compliance|country|countries|market|markets|region|regions|launch-readiness|launch ready)\b/i;

const PROBLEM_STATEMENT_TERMS =
  /\b(i|we|our|my)\s+(want|need|would like|have to|are trying|struggle|spend|lose|miss)|\b(problem|pain|manual|lost|broken|struggling|too much time|so that|directly into)\b/i;

const PROBLEM_ACTION_TERMS =
  /\b(integrate|connect|sync|capture|automate|import|export|route|notify|reconcile|reduce|avoid|eliminate|replace)\b/i;

const SYSTEM_INTEGRATION_TERMS =
  /\b(quickbooks|xero|stripe|shopify|woocommerce|crm|salesforce|hubspot|website|store|booking|invoice|accounting|api|database|spreadsheet|excel|google sheets|payment|payments)\b/i;

const TRIGGER_TERMS =
  /\b(when|whenever|after|on\s+(payment|checkout|signup|order|booking|submission|invoice)|trigger|event|webhook|submit|submission|checkout|scheduled|weekly|daily)\b/i;

const SUCCESS_RESULT_TERMS =
  /\b(so that|to\s+(capture|sync|reduce|avoid|ensure|track|report|reconcile|eliminate)|success|successful|automatically|directly|cleanly|accurate|accurately)\b/i;

const EXCEPTION_TERMS =
  /\b(error|failed|failure|duplicate|retry|exception|manual review|reconciliation|rollback|audit|log|logs|missing|rejected)\b/i;

const PURE_PROCESS_PATTERNS = [
  /\b(testing|qa|bug fixes?|debugging|polish|support|maintenance|meetings?|consultation|advice)\b/i,
];

const QUESTION_BY_ISSUE: Record<string, string> = {
  too_short: "What should exist after the work is done, and what would make you say it was successful?",
  no_software_outcome: "Is this a website, app, dashboard, integration, automation, database, report, or discovery handoff?",
  no_actionable_outcome: "What should the facilitator build, automate, integrate, configure, generate, modernize, or launch?",
  missing_users: "Who will use this first: customers, employees, admins, managers, operators, or another group?",
  missing_verification: "What evidence would let you approve the work: staging link, screenshots, reports, logs, source archive, QA results, or documentation?",
  missing_constraints: "What budget, timeline, markets, systems, or compliance boundaries do you already know?",
  process_only: "What tangible feature, release, report, or handoff package should the testing or bug fixing prove is ready?",
};

function normalize(text: string) {
  return text.trim().replace(/\s+/g, " ");
}

function appendIssue(issues: ScopeIntakeIssue[], issue: ScopeIntakeIssue) {
  if (!issues.some((existing) => existing.code === issue.code)) issues.push(issue);
}

function detectInputStyle(text: string): ScopeIntakeAssessment["inputStyle"] {
  return PROBLEM_STATEMENT_TERMS.test(text) &&
    (PROBLEM_ACTION_TERMS.test(text) || SYSTEM_INTEGRATION_TERMS.test(text))
    ? "problem_statement"
    : "delivery_scope";
}

function buildProblemStatementQuestions(text: string) {
  const questions: string[] = [];

  if (!SYSTEM_INTEGRATION_TERMS.test(text)) {
    questions.push("What systems are involved today, and which system should become the source of truth?");
  }

  if (!TRIGGER_TERMS.test(text)) {
    questions.push("What event should trigger the workflow: checkout, form submission, booking, invoice update, file upload, or schedule?");
  }

  if (!USER_TERMS.test(text)) {
    questions.push("Who needs to use or review the result: customers, finance admins, sales reps, operators, or managers?");
  }

  if (!SUCCESS_RESULT_TERMS.test(text)) {
    questions.push("What should be true when the problem is solved, and what manual work should disappear?");
  }

  if (!EXCEPTION_TERMS.test(text)) {
    questions.push("What should happen when data is missing, duplicated, rejected, or fails to sync?");
  }

  if (!VERIFICATION_TERMS.test(text)) {
    questions.push("What proof would let you approve it: staging test transaction, sync logs, screenshots, reports, or handoff notes?");
  }

  return questions;
}

function buildGuidingQuestions(
  issues: ScopeIntakeIssue[],
  text: string,
  inputStyle: ScopeIntakeAssessment["inputStyle"]
) {
  const priority = new Map([
    ["process_only", 0],
    ["no_software_outcome", 1],
    ["no_actionable_outcome", 2],
    ["too_short", 3],
    ["missing_users", 4],
    ["missing_verification", 5],
    ["missing_constraints", 6],
  ]);
  const questions = [...issues]
    .sort((a, b) => (priority.get(a.code) ?? 99) - (priority.get(b.code) ?? 99))
    .map((issue) => QUESTION_BY_ISSUE[issue.code])
    .filter(Boolean);

  const problemQuestions = inputStyle === "problem_statement"
    ? buildProblemStatementQuestions(text)
    : [];

  return Array.from(new Set([...problemQuestions, ...questions])).slice(0, 5);
}

export function assessScopeIntake(prompt: string): ScopeIntakeAssessment {
  const text = normalize(prompt);
  const issues: ScopeIntakeIssue[] = [];
  const inputStyle = detectInputStyle(text);

  if (text.length < 30) {
    appendIssue(issues, {
      code: "too_short",
      label: "Too little detail to price or verify",
      why: "A facilitator cannot turn this into a fair milestone because the delivered outcome, users, and proof of completion are unclear.",
      hint: "Add the product or workflow, who will use it, the main features, and what the client should be able to review at the end.",
      severity: "blocker",
    });
  }

  if (!SOFTWARE_TERMS.test(text)) {
    appendIssue(issues, {
      code: "no_software_outcome",
      label: "No clear software or digital delivery outcome",
      why: "Untether milestones need something a facilitator can deliver remotely and prove with a link, file, report, repository, or working flow.",
      hint: "Frame the request as a software product, workflow, integration, dashboard, automation, or discovery handoff.",
      severity: "blocker",
    });
  }

  if (!OUTCOME_TERMS.test(text)) {
    appendIssue(issues, {
      code: "no_actionable_outcome",
      label: "The requested outcome is not actionable yet",
      why: "A valid milestone needs a clear change in the world: something built, integrated, automated, configured, generated, or launched.",
      hint: "Use action language such as build, automate, integrate, generate, modernize, or launch, then name the expected result.",
      severity: "blocker",
    });
  }

  if (!USER_TERMS.test(text)) {
    appendIssue(issues, {
      code: "missing_users",
      label: "Target users are missing",
      why: "Milestones are easier to verify when they name who can do what after delivery.",
      hint: "Add users such as employees, admins, customers, managers, or operators, and describe what each group needs to do.",
      severity: "warning",
    });
  }

  if (!VERIFICATION_TERMS.test(text)) {
    appendIssue(issues, {
      code: "missing_verification",
      label: "No obvious approval evidence",
      why: "The platform promise depends on milestone evidence. Without proof artifacts, approval and disputes become subjective.",
      hint: "Add reviewable evidence such as a staging link, screenshots, generated files, reports, logs, test evidence, source archive, or handoff notes.",
      severity: "warning",
    });
  }

  if (!CONSTRAINT_TERMS.test(text)) {
    appendIssue(issues, {
      code: "missing_constraints",
      label: "Delivery constraints are not stated",
      why: "Budget, markets, compliance needs, or timeline help the system produce realistic milestone sizes instead of generic phases.",
      hint: "Add any budget, target launch date, countries/regions, required systems, or compliance boundaries you already know.",
      severity: "warning",
    });
  }

  if (
    PURE_PROCESS_PATTERNS.some((pattern) => pattern.test(text)) &&
    !/\b(build|release|screen|flow|dashboard|app|api|report|file|link|repository|source|deliverable)\b/i.test(text)
  ) {
    appendIssue(issues, {
      code: "process_only",
      label: "This reads like process work, not a deliverable",
      why: "Testing, debugging, meetings, or support are useful, but they do not work as standalone escrow milestones unless attached to a tangible release or evidence package.",
      hint: "Describe the working feature or artifact being tested, then include QA as acceptance evidence.",
      severity: "blocker",
    });
  }

  const blockerCount = issues.filter((issue) => issue.severity === "blocker").length;
  const warningCount = issues.length - blockerCount;
  const score = Math.max(0, 100 - blockerCount * 35 - warningCount * 12);

  return {
    status: blockerCount > 0 ? "needs_detail" : "ready",
    inputStyle,
    score,
    issues,
    guidingQuestions: buildGuidingQuestions(issues, text, inputStyle),
    suggestedPrompt: buildSuggestedScopePrompt(text, issues, inputStyle),
  };
}

export function buildSuggestedScopePrompt(
  prompt: string,
  issues: ScopeIntakeIssue[],
  inputStyle: ScopeIntakeAssessment["inputStyle"] = "delivery_scope"
) {
  if (inputStyle === "problem_statement") {
    return [
      `Business problem: ${prompt}${prompt.endsWith(".") ? "" : "."}`,
      "Desired outcome: [what should happen automatically when the work is complete].",
      "Current systems: [website/store/booking flow/source system] and [accounting/CRM/reporting/target system].",
      "Primary users: [customers/employees/admins/managers] need to [main actions].",
      "Exceptions: [missing data, duplicate records, failed syncs, refunds, retries, manual review].",
      "Approval evidence: [staging test transaction, screenshots, sync logs, reports, QA evidence, handoff notes].",
      "Constraints: [budget], [timeline], [countries/regions], and [required systems/compliance needs].",
    ].join(" ");
  }

  const needsUsers = issues.some((issue) => issue.code === "missing_users");
  const needsVerification = issues.some((issue) => issue.code === "missing_verification");
  const needsConstraints = issues.some((issue) => issue.code === "missing_constraints");

  const additions: string[] = [];
  if (needsUsers) additions.push("Primary users are [employees/admins/customers] who need to [main actions].");
  if (needsVerification) additions.push("Approval evidence should include [staging link/screenshots/reports/logs/source archive/handoff notes].");
  if (needsConstraints) additions.push("Constraints include [budget], [timeline], [countries/regions], and [required systems/compliance needs].");

  if (additions.length === 0) {
    return prompt;
  }

  return `${prompt}${prompt.endsWith(".") ? "" : "."} ${additions.join(" ")}`;
}
