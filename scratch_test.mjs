import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

async function test() {
  try {
    const moonshot = createOpenAI({
      apiKey: process.env.MOONSHOT_API_KEY || 'sk-kimi-XfTcbaWFM6YQf7E0X4w89OTjWtIZ35fB7IiRVSnPVOPRzJfG9yhOBQEzulhwoL1t',
      baseURL: 'https://api.moonshot.cn/v1',
      compatibility: 'compatible'
    });
    
    const result = await generateText({
      model: moonshot.chat('moonshot-v1-8k'),
      prompt: "Hello world"
    });
    console.log(result.text);
  } catch(e) {
    console.error(e);
  }
}

test();
