export const AI_PROVIDER_IDS = [
  "minimax",
  "gpt-4o",
  "claude-3-5-sonnet",
  "gemini-1.5-pro",
  "gemma-4-server",
] as const;

export type AIProviderId = (typeof AI_PROVIDER_IDS)[number];

export function isSupportedAIProvider(value: string): value is AIProviderId {
  return (AI_PROVIDER_IDS as readonly string[]).includes(value);
}

export const BASIC_AI_PROVIDER_IDS = ["groq", "gemma-4-server", "minimax"] as const;
export type BasicAIProviderId = (typeof BASIC_AI_PROVIDER_IDS)[number];

export const BASIC_AI_TASK_IDS = [
  "prompt_triage",
  "classification",
  "normalization",
  "summary",
] as const;

export const TRUSTED_AI_TASK_IDS = [
  "sow_generation",
  "milestone_audit",
  "dispute_review",
  "payment_decision",
  "bid_scoring",
] as const;

export type BasicAITaskId = (typeof BASIC_AI_TASK_IDS)[number];
export type TrustedAITaskId = (typeof TRUSTED_AI_TASK_IDS)[number];
export type AITaskId = BasicAITaskId | TrustedAITaskId;

export function isBasicAIProvider(value: string): value is BasicAIProviderId {
  return (BASIC_AI_PROVIDER_IDS as readonly string[]).includes(value);
}

export function isBasicAITask(value: string): value is BasicAITaskId {
  return (BASIC_AI_TASK_IDS as readonly string[]).includes(value);
}

type AIProviderEnv = NodeJS.ProcessEnv | Partial<Record<
  | "AI_BASIC_PROVIDER"
  | "GEMMA_BASE_URL"
  | "GEMMA_API_KEY"
  | "GEMMA_MODEL"
  | "GROQ_API_KEY"
  | "GROQ_BASE_URL"
  | "GROQ_MODEL",
  string
>>;

export function getBasicAIProviderPreference(env: AIProviderEnv = process.env): BasicAIProviderId {
  const configured = env.AI_BASIC_PROVIDER?.trim();
  if (configured && isBasicAIProvider(configured)) {
    return configured;
  }

  return "groq";
}

export function resolveBasicAIProvider({
  preference,
  groqConfigured,
  gemmaConfigured,
}: {
  preference: BasicAIProviderId;
  groqConfigured: boolean;
  gemmaConfigured: boolean;
}): BasicAIProviderId {
  if (preference === "minimax") {
    return "minimax";
  }

  if (preference === "gemma-4-server" && gemmaConfigured) {
    return "gemma-4-server";
  }

  if (preference === "groq" && groqConfigured) {
    return "groq";
  }

  if (groqConfigured) {
    return "groq";
  }

  if (gemmaConfigured) {
    return "gemma-4-server";
  }

  return "minimax";
}

export function getGroqConfig(env: AIProviderEnv = process.env) {
  const apiKey = env.GROQ_API_KEY?.trim();
  const baseURL = (env.GROQ_BASE_URL?.trim() || "https://api.groq.com/openai/v1").replace(/\/+$/, "");
  const model = env.GROQ_MODEL?.trim() || "llama-3.1-8b-instant";

  return {
    configured: Boolean(apiKey),
    apiKey,
    baseURL,
    model,
  };
}

export function isGroqConfigured(env: AIProviderEnv = process.env) {
  return getGroqConfig(env).configured;
}

export function getGemmaServerConfig(env: AIProviderEnv = process.env) {
  const baseURL = env.GEMMA_BASE_URL?.trim().replace(/\/+$/, "");
  const model = env.GEMMA_MODEL?.trim() || "gemma-4-26b-it";
  const apiKey = env.GEMMA_API_KEY?.trim() || "local-gemma";

  return {
    configured: Boolean(baseURL),
    baseURL,
    model,
    apiKey,
  };
}

export function isServerGemmaConfigured(env: AIProviderEnv = process.env) {
  return getGemmaServerConfig(env).configured;
}
