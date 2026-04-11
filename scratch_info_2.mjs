import fs from 'fs';
const content = fs.readFileSync('node_modules/@ai-sdk/openai/dist/index.d.ts', 'utf-8');
console.log(content.substring(0, 3000));
