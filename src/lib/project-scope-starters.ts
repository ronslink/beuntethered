export type ProjectScopeStarter = {
  label: string;
  icon: string;
  budget: number;
  days: number;
  prompt: string;
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

export function buildStarterPrompt(starter: ProjectScopeStarter) {
  return `${starter.prompt} Budget is $${starter.budget.toLocaleString("en-US")} and target timeline is ${starter.days} days.`;
}
