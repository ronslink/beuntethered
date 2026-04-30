import { getBasicAIProviderPreference, getGemmaServerConfig, getGroqConfig, resolveBasicAIProvider } from "./ai-provider-config.ts";
import { getEmailConfiguration } from "./email-config.ts";
import { getPlatformAdminEmail } from "./platform-admin.ts";
import { getStripeSecretKey, getStripeWebhookSecret } from "./stripe.ts";

type ReadinessEnv = Record<string, string | undefined>;

export type ReadinessStatus = "READY" | "WARNING" | "BLOCKED";

export type ReadinessCheck = {
  id: string;
  area: string;
  label: string;
  status: ReadinessStatus;
  detail: string;
  remediation?: string;
};

export type PlatformReadinessReport = {
  generatedAt: string;
  overallStatus: ReadinessStatus;
  checks: ReadinessCheck[];
  summary: Record<ReadinessStatus, number>;
};

type PlatformReadinessOptions = {
  platformAdminAccountExists?: boolean;
};

function readEnv(env: ReadinessEnv, key: string) {
  const value = env[key]?.trim();
  return value ? value : undefined;
}

function isPlaceholder(value: string | undefined) {
  if (!value) return true;
  const lower = value.toLowerCase();
  return lower.includes("replace-with") || lower.includes("your-") || lower.includes("placeholder") || lower.includes("test_token");
}

function isHexSecret(value: string | undefined, length: number) {
  return Boolean(value && value.length === length && /^[a-f0-9]+$/i.test(value));
}

function checkSecret({
  id,
  area,
  label,
  value,
  minLength = 32,
  remediation,
}: {
  id: string;
  area: string;
  label: string;
  value: string | undefined;
  minLength?: number;
  remediation: string;
}): ReadinessCheck {
  if (!value || isPlaceholder(value)) {
    return { id, area, label, status: "BLOCKED", detail: "Missing or placeholder secret.", remediation };
  }
  if (value.length < minLength) {
    return { id, area, label, status: "WARNING", detail: `Configured, but shorter than ${minLength} characters.`, remediation };
  }
  return { id, area, label, status: "READY", detail: "Configured." };
}

function checkStripe(env: ReadinessEnv): ReadinessCheck[] {
  const checks: ReadinessCheck[] = [];

  try {
    getStripeSecretKey(env);
    checks.push({
      id: "stripe-secret",
      area: "Payments",
      label: "Stripe secret key",
      status: "READY",
      detail: "Secret key format is valid.",
    });
  } catch (error) {
    checks.push({
      id: "stripe-secret",
      area: "Payments",
      label: "Stripe secret key",
      status: "BLOCKED",
      detail: error instanceof Error ? error.message : "Stripe secret key is not usable.",
      remediation: "Set STRIPE_SECRET_KEY to a live or test Stripe secret key.",
    });
  }

  try {
    getStripeWebhookSecret(env);
    checks.push({
      id: "stripe-webhook",
      area: "Payments",
      label: "Stripe webhook signing secret",
      status: "READY",
      detail: "Webhook signing secret format is valid.",
    });
  } catch (error) {
    checks.push({
      id: "stripe-webhook",
      area: "Payments",
      label: "Stripe webhook signing secret",
      status: "BLOCKED",
      detail: error instanceof Error ? error.message : "Stripe webhook signing secret is not usable.",
      remediation: "Create a Stripe webhook endpoint and set STRIPE_WEBHOOK_SECRET.",
    });
  }

  const publishableKey = readEnv(env, "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
  checks.push(
    publishableKey?.startsWith("pk_")
      ? {
          id: "stripe-publishable",
          area: "Payments",
          label: "Stripe publishable key",
          status: "READY",
          detail: "Publishable key format is valid.",
        }
      : {
          id: "stripe-publishable",
          area: "Payments",
          label: "Stripe publishable key",
          status: "BLOCKED",
          detail: "Missing or invalid publishable key.",
          remediation: "Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY for checkout UI flows.",
        }
  );

  return checks;
}

function checkAI(env: ReadinessEnv): ReadinessCheck[] {
  const groq = getGroqConfig(env);
  const gemma = getGemmaServerConfig(env);
  const basicProvider = resolveBasicAIProvider({
    preference: getBasicAIProviderPreference(env),
    groqConfigured: groq.configured,
    gemmaConfigured: gemma.configured,
  });
  const minimaxKey = readEnv(env, "MINIMAX_API_KEY");

  return [
    minimaxKey
      ? {
          id: "ai-trusted",
          area: "AI",
          label: "Trusted AI lane",
          status: "READY",
          detail: "MiniMax key is configured for SOW, audit, bid scoring, and dispute workflows.",
        }
      : {
          id: "ai-trusted",
          area: "AI",
          label: "Trusted AI lane",
          status: "BLOCKED",
          detail: "MiniMax key is missing.",
          remediation: "Set MINIMAX_API_KEY for trust-sensitive AI workflows.",
        },
    basicProvider === "minimax" && !minimaxKey
      ? {
          id: "ai-basic",
          area: "AI",
          label: "Basic AI lane",
          status: "BLOCKED",
          detail: "No Groq or Gemma route is configured and MiniMax fallback is also unavailable.",
          remediation: "Set GROQ_API_KEY, GEMMA_BASE_URL, or MINIMAX_API_KEY.",
        }
      : {
          id: "ai-basic",
          area: "AI",
          label: "Basic AI lane",
          status: "READY",
          detail: `Low-risk AI tasks route to ${basicProvider}.`,
        },
  ];
}

function checkStorage(env: ReadinessEnv): ReadinessCheck {
  const token = readEnv(env, "BLOB_READ_WRITE_TOKEN");
  if (!token || token.includes("fake") || token.includes("test_token")) {
    return {
      id: "attachment-storage",
      area: "Storage",
      label: "Attachment storage",
      status: "WARNING",
      detail: "Using local/test attachment fallback.",
      remediation: "Set a production Vercel Blob BLOB_READ_WRITE_TOKEN before accepting real delivery artifacts.",
    };
  }

  return {
    id: "attachment-storage",
    area: "Storage",
    label: "Attachment storage",
    status: "READY",
    detail: "Vercel Blob token is configured.",
  };
}

function checkTrustOperations(env: ReadinessEnv, options: PlatformReadinessOptions): ReadinessCheck[] {
  if (typeof options.platformAdminAccountExists !== "boolean") return [];

  const adminEmail = getPlatformAdminEmail(env);
  return [
    options.platformAdminAccountExists
      ? {
          id: "platform-admin-account",
          area: "Trust Operations",
          label: "Platform admin account",
          status: "READY",
          detail: `Admin user ${adminEmail} exists for arbitration and verification notifications.`,
        }
      : {
          id: "platform-admin-account",
          area: "Trust Operations",
          label: "Platform admin account",
          status: "BLOCKED",
          detail: `Configured admin email ${adminEmail} does not match an application user.`,
          remediation: "Create or promote the configured ADMIN_EMAIL user before relying on admin alerts.",
        },
  ];
}

export function buildPlatformReadinessReport(
  env: ReadinessEnv = process.env,
  now = new Date(),
  options: PlatformReadinessOptions = {}
): PlatformReadinessReport {
  const email = getEmailConfiguration(env);
  const checks: ReadinessCheck[] = [
    {
      id: "database-url",
      area: "Core",
      label: "Database",
      status: readEnv(env, "DATABASE_URL") ? "READY" : "BLOCKED",
      detail: readEnv(env, "DATABASE_URL") ? "DATABASE_URL is configured." : "DATABASE_URL is missing.",
      remediation: readEnv(env, "DATABASE_URL") ? undefined : "Set DATABASE_URL to the Postgres connection string.",
    },
    {
      id: "app-url",
      area: "Core",
      label: "Canonical app URL",
      status: readEnv(env, "NEXT_PUBLIC_APP_URL") || readEnv(env, "NEXTAUTH_URL") || readEnv(env, "VERCEL_URL") ? "READY" : "WARNING",
      detail: readEnv(env, "NEXT_PUBLIC_APP_URL") || readEnv(env, "NEXTAUTH_URL") || readEnv(env, "VERCEL_URL")
        ? "Application URL is configured for redirects and emails."
        : "Falling back to local app URL.",
      remediation: "Set NEXT_PUBLIC_APP_URL to the deployed application URL.",
    },
    checkSecret({
      id: "nextauth-secret",
      area: "Core",
      label: "NextAuth secret",
      value: readEnv(env, "NEXTAUTH_SECRET"),
      remediation: "Set NEXTAUTH_SECRET to a strong random value.",
    }),
    {
      id: "encryption-master-key",
      area: "Security",
      label: "API key encryption",
      status: isHexSecret(readEnv(env, "ENCRYPTION_MASTER_KEY"), 64) && !isPlaceholder(readEnv(env, "ENCRYPTION_MASTER_KEY")) ? "READY" : "BLOCKED",
      detail: isHexSecret(readEnv(env, "ENCRYPTION_MASTER_KEY"), 64)
        ? "Encryption master key is a 64-character hex secret."
        : "Encryption master key must be a 64-character hex secret.",
      remediation: "Generate ENCRYPTION_MASTER_KEY with openssl rand -hex 32.",
    },
    checkSecret({
      id: "internal-api-secret",
      area: "Security",
      label: "Internal API secret",
      value: readEnv(env, "INTERNAL_API_SECRET"),
      remediation: "Set INTERNAL_API_SECRET to protect internal AI and agent routes.",
    }),
    checkSecret({
      id: "cron-secret",
      area: "Security",
      label: "Cron secret",
      value: readEnv(env, "CRON_SECRET"),
      remediation: "Set CRON_SECRET for scheduled saved-search alert jobs.",
    }),
    ...checkTrustOperations(env, options),
    ...checkStripe(env),
    ...checkAI(env),
    {
      id: "email-provider",
      area: "Notifications",
      label: "Transactional email",
      status: email.enabled ? "READY" : "WARNING",
      detail: email.enabled ? `Resend is configured with sender ${email.defaultFrom}.` : "Resend is not configured; emails will be skipped.",
      remediation: email.enabled ? undefined : "Set RESEND_API_KEY and EMAIL_FROM before launch.",
    },
    checkStorage(env),
    {
      id: "github-webhook",
      area: "Integrations",
      label: "GitHub webhook secret",
      status: readEnv(env, "GITHUB_WEBHOOK_SECRET") ? "READY" : "WARNING",
      detail: readEnv(env, "GITHUB_WEBHOOK_SECRET") ? "GitHub webhook signature validation is configured." : "GitHub webhook secret is missing.",
      remediation: "Set GITHUB_WEBHOOK_SECRET before enabling repository sync webhooks.",
    },
  ];

  const summary = checks.reduce<Record<ReadinessStatus, number>>(
    (acc, check) => {
      acc[check.status] += 1;
      return acc;
    },
    { READY: 0, WARNING: 0, BLOCKED: 0 }
  );

  const overallStatus: ReadinessStatus =
    summary.BLOCKED > 0 ? "BLOCKED" : summary.WARNING > 0 ? "WARNING" : "READY";

  return {
    generatedAt: now.toISOString(),
    overallStatus,
    checks,
    summary,
  };
}
