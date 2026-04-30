export type ProjectScopeStarter = {
  label: string;
  icon: string;
  budget: number;
  days: number;
  prompt: string;
};

export type ProjectProblemStarter = ProjectScopeStarter & {
  problem: string;
};

export const PROJECT_SCOPE_STARTERS: readonly ProjectScopeStarter[] = [
  {
    label: "Web App MVP",
    icon: "web_asset",
    budget: 42000,
    days: 112,
    prompt:
      "Build a SaaS web app MVP for customers and admins with account creation, role-based access, Stripe billing, core dashboard screens, audit logs, staging demo evidence, screenshots, QA report, and launch handoff documentation.",
  },
  {
    label: "Customer Portal",
    icon: "account_box",
    budget: 33000,
    days: 88,
    prompt:
      "Build a customer portal for clients and admins with secure login, profile management, document upload, status tracking, notification preferences, admin review dashboard, staging link, screenshots, QA evidence, and handoff notes.",
  },
  {
    label: "Marketplace",
    icon: "storefront",
    budget: 34500,
    days: 90,
    prompt:
      "Build a two-sided marketplace for buyers, providers, and admins with listings, search, proposal submission, milestone checkout, messaging, admin reporting, audit logs, staging demo, source archive, QA report, and launch documentation.",
  },
  {
    label: "Mobile + Backend",
    icon: "smartphone",
    budget: 50500,
    days: 144,
    prompt:
      "Build an iOS and Android app with a mobile app backend for customers and admins, including authentication, core user workflow, push notification readiness, admin management dashboard, API documentation, test evidence, screenshots, and release handoff.",
  },
  {
    label: "AI Assistant",
    icon: "psychology",
    budget: 38500,
    days: 104,
    prompt:
      "Build an AI assistant for employees and admins with a knowledge base, guarded response flow, conversation history, admin content controls, analytics dashboard, test prompts, evaluation report, staging demo, and handoff documentation.",
  },
  {
    label: "Database Migration",
    icon: "database",
    budget: 29500,
    days: 79,
    prompt:
      "Migrate the existing database to a new production-ready schema with source mapping, data validation, rollback plan, staged cutover checklist, admin verification report, migration logs, and post-migration handoff documentation.",
  },
] as const;

export const PROJECT_PROBLEM_STARTERS: readonly ProjectProblemStarter[] = [
  {
    label: "Payment + Accounting Sync",
    icon: "sync_alt",
    budget: 41500,
    days: 112,
    problem:
      "I want customer payments from my website, store, or booking flow to sync cleanly into my accounting system, such as QuickBooks or Xero.",
    prompt:
      "Solve this business problem: the client wants customer payments from a website, store, or booking flow synced cleanly into an accounting system such as QuickBooks or Xero with accurate customer, invoice, transaction, tax, and reconciliation data. Build a secure payment-to-accounting integration for customers, finance admins, and site admins, including accounting platform connection, payment event capture from the website checkout, invoice or sales receipt creation rules, payment status reconciliation, error handling queue, admin sync dashboard, audit logs, staging test transactions, screenshots, QA evidence, rollback notes, and launch handoff documentation.",
  },
  {
    label: "Manual Reporting Automation",
    icon: "monitoring",
    budget: 22000,
    days: 56,
    problem:
      "My team spends hours copying data between tools to create weekly operating reports.",
    prompt:
      "Solve this business problem: the client wants to eliminate manual weekly reporting by pulling data from existing business systems into a verified operations reporting workflow. Build automated data import, normalization, scheduled report generation, admin review controls, exportable dashboards, exception tracking, audit logs, screenshots, QA evidence, and launch handoff documentation for managers and operations admins.",
  },
  {
    label: "Lead Capture To CRM",
    icon: "assignment_ind",
    budget: 44000,
    days: 126,
    problem:
      "Website leads are getting lost before they reach sales because forms, email, and CRM are not connected.",
    prompt:
      "Solve this business problem: the client wants website inquiries captured reliably into their CRM with clear sales ownership and follow-up tracking. Build a lead capture integration for website visitors, sales reps, and admins, including form validation, CRM contact and opportunity creation, duplicate detection, notification routing, admin mapping controls, error handling, audit logs, staging test submissions, screenshots, QA evidence, and launch handoff documentation.",
  },
] as const;

export function buildStarterPrompt(starter: ProjectScopeStarter) {
  return `${starter.prompt} Budget is $${starter.budget.toLocaleString("en-US")} and target timeline is ${starter.days} days.`;
}
