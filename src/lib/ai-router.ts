import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { prisma } from './auth';

export async function getDynamicAIProvider(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferred_llm: true, openai_key: true, anthropic_key: true }
    });

    // Native unauthenticated route intercept
    if (!user) {
      const moonshot = createOpenAI({ 
         apiKey: process.env.MOONSHOT_API_KEY || 'dummy_key',
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

    // Default: Moonshot Kimi Native Test Implementation
    const moonshot = createOpenAI({ 
       apiKey: process.env.MOONSHOT_API_KEY || 'dummy_key',
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
    
  } catch (error) {
    console.error("Critical AI Routing Fault:", error);
    const fallback = createOpenAI({ 
       apiKey: process.env.MOONSHOT_API_KEY || 'dummy_key',
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
    return fallback.chat('MiniMax-M2.7');
  }
}
