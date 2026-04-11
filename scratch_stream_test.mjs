import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

async function testStreamText() {
  const minimax = createOpenAI({
      apiKey: 'sk-cp-6iv2sCSdlBr8-Pz32KSuwHVcoSvrQ1n7W8DwcVb5HVTzA72uSm-9tAonRgbtQ0EfpDt3itq9VldikdLqPIl719Z-Y0du4vsGmHKP7U64kvjaqSkA72p39bE',
      baseURL: 'https://api.minimaxi.chat/v1',
      fetch: async (url, options) => {
        return fetch(url, options); // Removed schema stripper because streamText doesn't use schemas!
      }
  });

  try {
     const { textStream } = await streamText({
        model: minimax.chat('MiniMax-M2.7'),
        prompt: "Say 'hi'"
     });
     
     console.log("STREAM STARTED");
     for await (const chunk of textStream) {
        process.stdout.write(chunk);
     }
  } catch (e) {
     console.error("Stream failed:", e.message || e);
  }
}
testStreamText();
