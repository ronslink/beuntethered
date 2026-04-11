import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { openai as defaultOpenAI } from '@ai-sdk/openai';
import { prisma } from './auth';

export async function getDynamicAIProvider(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferred_llm: true, openai_key: true, anthropic_key: true }
    });

    // Native unauthenticated route intercept
    if (!user) return defaultOpenAI('gpt-4o-mini');

    // Route 1: Anthropic Custom Node Mapping
    if (user.preferred_llm === 'claude-3-5-sonnet' && user.anthropic_key) {
      const anthropic = createAnthropic({ apiKey: user.anthropic_key });
      return anthropic('claude-3-5-sonnet');
    }

    // Route 2: OpenAI Custom Payload Allocation
    if (user.preferred_llm === 'gpt-4o' && user.openai_key) {
      const customOpenAI = createOpenAI({ apiKey: user.openai_key });
      return customOpenAI('gpt-4o');
    }

    // Route 3: Secure Platform Fallback constraints protecting Global limits
    return defaultOpenAI('gpt-4o-mini');
  } catch (error) {
    console.error("Critical AI Routing Fault:", error);
    return defaultOpenAI('gpt-4o-mini'); // Fallback natively to cheap compute on crash
  }
}
