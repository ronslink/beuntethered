import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { embed } from 'ai'
import { openai } from '@ai-sdk/openai'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const archetypes = [
  {
    name: "Frontend Specialist",
    email: "frontend@beuntethered.io",
    bio: "Expert UI/UX engineer specializing in React, Next.js, Tailwind, and pixel-perfect Figma conversions."
  },
  {
    name: "Backend Architect",
    email: "backend@beuntethered.io",
    bio: "Senior Database Architect specializing in PostgreSQL, Prisma, Node.js, and complex API integrations."
  },
  {
    name: "Infrastructure Expert",
    email: "devops@beuntethered.io",
    bio: "Cloud infrastructure specialist focusing on AWS, Docker, CI/CD pipelines, and high-availability server deployments."
  },
  {
    name: "AI & Data Engineer",
    email: "mlengine@beuntethered.io",
    bio: "Machine Learning engineer skilled in Python, RAG pipelines, OpenAI integrations, and vector databases."
  }
];

async function main() {
  console.log("Vectorizing RAG Candidate Pools...");

  for (const profile of archetypes) {
    // Scaffold User Record resolving missing gaps natively
    let user = await prisma.user.findUnique({
      where: { email: profile.email }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          role: "FACILITATOR",
          stripe_account_id: 'acct_1MockStripeConnected123'
        }
      });
      console.log(`[+] Created new profile structure: ${profile.name}`);
    }

    // Ping OpenAI resolving dimensional mapping
    console.log(`Fetching 1536-dimensional array for: ${profile.name}...`);
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: profile.bio
    });

    // Explicit generic formatting securely escaping parameters dynamically avoiding syntax crashes natively in Postgres
    const vectorLiteral = `[${embedding.join(',')}]`;

    // Drop native interpolation resolving pg vector dependencies securely escaping string literal mappings
    await prisma.$executeRaw`
      UPDATE "User"
      SET expertise_embedding = ${vectorLiteral}::vector
      WHERE id = ${user.id}
    `;
    
    console.log(`✅ Properties efficiently parameterized for [${profile.name}]`);
  }

  console.log("\n🚀 Vector Seed Successfully Overhauled!");
}

main()
  .catch(e => {
    console.error("Fatal Vector Generation Loop:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    pool.end();
  });
