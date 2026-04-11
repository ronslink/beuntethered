import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

async function testMinimax() {
  try {
    const minimax = createOpenAI({
      apiKey: 'sk-cp-6iv2sCSdlBr8-Pz32KSuwHVcoSvrQ1n7W8DwcVb5HVTzA72uSm-9tAonRgbtQ0EfpDt3itq9VldikdLqPIl719Z-Y0du4vsGmHKP7U64kvjaqSkA72p39bE',
      baseURL: 'https://api.minimaxi.chat/v1' // International endpoint
    });
    
    const result = await generateText({
      model: minimax.chat('MiniMax-M2.5'),
      prompt: "Reply with the text: MINIMAX_TEST_SUCCESS"
    });
    console.log("SUCCESS:", result.text);
  } catch(e) {
    console.error("ERROR:");
    console.error(e?.message || e);
    console.error(e?.responseBody);
  }
}

testMinimax();
