import fs from 'fs';
const content = fs.readFileSync('node_modules/@ai-sdk/openai/dist/index.d.ts', 'utf-8');
const search = "interface openaiLanguageModelChatOptions";
const index = content.indexOf("openaiLanguageModelChatOptions");
console.log(content.substring(index, index + 1000));
