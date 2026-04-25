import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { prisma } from './auth';
import { decryptApiKey } from './encryption';

function getFallbackProvider() {
  const moonshot = createOpenAI({
     apiKey: process.env.MINIMAX_API_KEY || 'dummy_key',
     baseURL: 'https://api.minimaxi.chat/v1',
     fetch: async (url, options) => {
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
         } catch(e) {}
       }
       return fetch(url, options as RequestInit);
     }
  });
  return moonshot.chat('MiniMax-M2.7');
}

export async function getDynamicAIProvider(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        preferred_llm: true,
        openai_key: true,
        anthropic_key: true,
        openai_key_encrypted: true,
        anthropic_key_encrypted: true,
        google_key_encrypted: true,
      }
    });

    // Native unauthenticated route intercept
    if (!user) {
      return getFallbackProvider();
    }

    // Decrypt API keys if encrypted versions exist (preferred), fall back to plaintext for migration
    const openaiKey = user.openai_key_encrypted ? decryptApiKey(user.openai_key_encrypted) : user.openai_key ?? undefined;
    const anthropicKey = user.anthropic_key_encrypted ? decryptApiKey(user.anthropic_key_encrypted) : user.anthropic_key ?? undefined;
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

    // Default: Moonshot Kimi Native Test Implementation
    return getFallbackProvider();
    
  } catch (error) {
    console.error("Critical AI Routing Fault:", error);
    return getFallbackProvider();
  }
}
