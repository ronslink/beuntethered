import fs from 'fs';
const content = fs.readFileSync('node_modules/@ai-sdk/openai/dist/index.d.ts', 'utf-8');
const search = "interface OpenAIProviderSettings";
const index = content.indexOf(search);
console.log(content.substring(index, index + 500));
