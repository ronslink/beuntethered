import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { prisma } from './auth';
import { decryptApiKey } from './encryption';
import {
  type AITaskId,
  getBasicAIProviderPreference,
  getGemmaServerConfig,
  getGroqConfig,
  isBasicAITask,
  isGroqConfigured,
  isServerGemmaConfigured,
  resolveBasicAIProvider,
} from "./ai-provider-config.ts";

// Shared fetch wrapper that strips $schema keys (MiniMax rejects them)
function createMinimaxFetch() {
  return async (url: string | URL | Request, options?: any) => {
    if (options?.body && typeof options.body === 'string') {
      try {
        const body = JSON.parse(options.body);
        const removeSchema = (obj: any) => {
          if (Array.isArray(obj)) obj.forEach(removeSchema);
          else if (obj !== null && typeof obj === 'object') {
            delete obj['$schema'];
            Object.values(obj).forEach(removeSchema);
          }
        };
        removeSchema(body);
        options.body = JSON.stringify(body);
      } catch {}
    }
    return fetch(url, options as RequestInit);
  };
}

function getMinimaxApiKey() {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    throw new Error("MINIMAX_API_KEY is not configured.");
  }
  return apiKey;
}

function createMinimaxProvider() {
  const apiKey = getMinimaxApiKey();
  const minimax = createOpenAI({
    apiKey,
    baseURL: process.env.MINIMAX_BASE_URL || 'https://api.minimax.io/v1',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    fetch: createMinimaxFetch(),
  });
  return minimax;
}

function getFallbackProvider() {
  const minimax = createMinimaxProvider();
  return minimax.chat('MiniMax-M2.7');
}

function getServerGemmaProvider() {
  const config = getGemmaServerConfig();
  if (!config.configured || !config.baseURL) {
    throw new Error("GEMMA_BASE_URL is not configured.");
  }

  const gemma = createOpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });

  return gemma.chat(config.model);
}

function getGroqProvider() {
  const config = getGroqConfig();
  if (!config.configured || !config.apiKey) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  const groq = createOpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });

  return groq.chat(config.model);
}

/**
 * M2.7-highspeed: identical output quality, faster inference.
 * Used for triage/classification where sub-second latency matters.
 * Automatic cache support — no configuration needed.
 */
export function getHighspeedProvider() {
  const minimax = createMinimaxProvider();
  return minimax.chat('MiniMax-M2.7-highspeed');
}

/**
 * Task-level routing keeps low-risk classification work cheap while preserving
 * the stronger default/BYOK lane for trust-sensitive generation and audit flows.
 */
export function getTaskAIProvider(task: AITaskId) {
  if (!isBasicAITask(task)) {
    return getFallbackProvider();
  }

  const provider = resolveBasicAIProvider({
    preference: getBasicAIProviderPreference(),
    groqConfigured: isGroqConfigured(),
    gemmaConfigured: isServerGemmaConfigured(),
  });

  if (provider === "minimax") {
    return getHighspeedProvider();
  }

  if (provider === "gemma-4-server") {
    return getServerGemmaProvider();
  }

  return getGroqProvider();
}

export async function getDynamicAIProvider(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        preferred_llm: true,
        openai_key_encrypted: true,
        anthropic_key_encrypted: true,
        google_key_encrypted: true,
      }
    });

    // Native unauthenticated route intercept
    if (!user) {
      return getFallbackProvider();
    }

    const openaiKey = user.openai_key_encrypted ? decryptApiKey(user.openai_key_encrypted) : undefined;
    const anthropicKey = user.anthropic_key_encrypted ? decryptApiKey(user.anthropic_key_encrypted) : undefined;
    const googleKey = user.google_key_encrypted ? decryptApiKey(user.google_key_encrypted) : undefined;

    // Route 1: Anthropic Custom Node Mapping
    if (user.preferred_llm === 'claude-3-5-sonnet' && anthropicKey) {
      const anthropic = createAnthropic({ apiKey: anthropicKey });
      return anthropic('claude-3-5-sonnet');
    }

    // Route 2: OpenAI Custom Payload Allocation
    if (user.preferred_llm === 'gpt-4o' && openaiKey) {
      const customOpenAI = createOpenAI({ apiKey: openaiKey });
      return customOpenAI('gpt-4o');
    }

    // Route 3: Google Gemini Allocation
    if (user.preferred_llm === 'gemini-1.5-pro' && googleKey) {
      const google = createGoogleGenerativeAI({ apiKey: googleKey });
      return google('gemini-1.5-pro-latest');
    }

    // Route 4: self-hosted Gemma server through an OpenAI-compatible endpoint.
    // Works with vLLM, llama.cpp, Ollama /v1, NVIDIA NIM, or a private gateway.
    if (user.preferred_llm === 'gemma-4-server') {
      return getServerGemmaProvider();
    }

    // Default: Moonshot Kimi Native Test Implementation
    return getFallbackProvider();
    
  } catch (error) {
    console.error("Critical AI Routing Fault:", error);
    return getFallbackProvider();
  }
}
