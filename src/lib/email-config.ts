const DEFAULT_TRANSACTIONAL_FROM = "Untether <notifications@untether.network>";

type EmailEnv = Record<string, string | undefined>;

export type EmailConfiguration = {
  provider: "resend";
  enabled: boolean;
  defaultFrom: string;
  missing: string[];
};

function normalizeEnvValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function getEmailConfiguration(env: EmailEnv = process.env): EmailConfiguration {
  const apiKey = normalizeEnvValue(env.RESEND_API_KEY);
  const defaultFrom = normalizeEnvValue(env.EMAIL_FROM) ?? DEFAULT_TRANSACTIONAL_FROM;

  return {
    provider: "resend",
    enabled: Boolean(apiKey),
    defaultFrom,
    missing: apiKey ? [] : ["RESEND_API_KEY"],
  };
}

export function getResendApiKey(env: EmailEnv = process.env) {
  return normalizeEnvValue(env.RESEND_API_KEY);
}
