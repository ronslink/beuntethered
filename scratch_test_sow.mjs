import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

async function generateSOW() {
  const prompt = "I am building a new web application. The core features I need are:a clock app that helps contractors at a jobsite manage their time would like it in two weeks";
  
  const minimax = createOpenAI({
      apiKey: 'sk-cp-6iv2sCSdlBr8-Pz32KSuwHVcoSvrQ1n7W8DwcVb5HVTzA72uSm-9tAonRgbtQ0EfpDt3itq9VldikdLqPIl719Z-Y0du4vsGmHKP7U64kvjaqSkA72p39bE',
      baseURL: 'https://api.minimaxi.chat/v1'
    });

  try {
      console.log('Generating raw Text payload with MiniMax-M2.7 natively...');
      const start = Date.now();
      const { text } = await generateText({
          model: minimax.chat('MiniMax-M2.7'), 
          system: "You must output strictly JSON.",
          prompt: `Generate JSON:\n\n${prompt}`
        });

      console.log(`Generation Completed in: ${(Date.now() - start)/1000}s`);
      console.log("Raw Response:", text);

  } catch(error) {
     console.error("AI Generation Error:", error.message || error);
  }
}

generateSOW();
