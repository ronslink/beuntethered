export type ProjectScopeStarter = {
  label: string;
  icon: string;
  prompt: string;
};

export type ProjectProblemStarter = {
  label: string;
  icon: string;
  problem: string;
  prompt: string;
};

export const PROJECT_SCOPE_STARTERS: readonly ProjectScopeStarter[] = [
  {
    label: "Web App MVP",
    icon: "web_asset",
    prompt:
      "Build a SaaS web app MVP for customers and admins with account creation, role-based access, Stripe billing, core dashboard screens, audit logs, staging demo evidence, screenshots, QA report, and launch handoff documentation.",
  },
  {
    label: "Customer Portal",
    icon: "account_box",
    prompt:
      "Build a customer portal for clients and admins with secure login, profile management, document upload, status tracking, notification preferences, admin review dashboard, staging link, screenshots, QA evidence, and handoff notes.",
  },
  {
    label: "Marketplace",
    icon: "storefront",
    prompt:
      "Build a two-sided marketplace for buyers, providers, and admins with listings, search, proposal submission, milestone checkout, messaging, admin reporting, audit logs, staging demo, source archive, QA report, and launch documentation.",
  },
  {
    label: "Mobile + Backend",
    icon: "smartphone",
    prompt:
      "Build an iOS and Android app with a mobile app backend for customers and admins, including authentication, core user workflow, push notification readiness, admin management dashboard, API documentation, test evidence, screenshots, and release handoff.",
  },
  {
    label: "AI Assistant",
    icon: "psychology",
    prompt:
      "Build an AI assistant for employees and admins with a knowledge base, guarded response flow, conversation history, admin content controls, analytics dashboard, test prompts, evaluation report, staging demo, and handoff documentation.",
  },
  {
    label: "Database Migration",
    icon: "database",
    prompt:
      "Migrate the existing database to a new production-ready schema with source mapping, data validation, rollback plan, staged cutover checklist, admin verification report, migration logs, and post-migration handoff documentation.",
  },
] as const;

export const PROJECT_PROBLEM_STARTERS: readonly ProjectProblemStarter[] = [
  {
    label: "Manual Workflow",
    icon: "work_history",
    problem:
      "A recurring manual process is taking too much time, creating mistakes, or making it hard to see status.",
    prompt:
      "Solve this business problem: the client has a recurring manual business workflow that wastes time, creates mistakes, or makes status hard to track. Build a focused software workflow for the people who run and review the process, including input screens or forms, data validation, status tracking, exception review, admin reporting, audit logs, screenshots, QA evidence, and launch handoff documentation.",
  },
  {
    label: "System Connection",
    icon: "sync_alt",
    problem:
      "Important data is trapped in separate tools, spreadsheets, websites, or databases that need to stay in sync.",
    prompt:
      "Solve this business problem: the client has two or more business systems, data sources, websites, spreadsheets, or databases that need to exchange information reliably. Build a verified system connection for admins and operators, including source-to-target mapping, authentication or configuration setup, event-based or scheduled sync, validation rules, exception review, audit logs, test records, screenshots, QA evidence, rollback notes, and launch handoff documentation.",
  },
  {
    label: "Self-Service Workflow",
    icon: "account_tree",
    problem:
      "Customers, employees, partners, or vendors need a clearer online path to complete an important task.",
    prompt:
      "Solve this business problem: the client needs a guided digital workflow for customers, employees, partners, or vendors to complete an important task online with less back-and-forth. Build a secure self-service workflow with role-appropriate access, guided forms or screens, status updates, notifications, admin review controls, reviewable exports, audit logs, screenshots, QA evidence, and launch handoff documentation.",
  },
] as const;

export function buildStarterPrompt(starter: ProjectScopeStarter) {
  return starter.prompt;
}
