import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Clearing existing data...')
  await prisma.milestone.deleteMany()
  await prisma.changeOrder.deleteMany()
  await prisma.message.deleteMany()
  await prisma.bid.deleteMany()
  await prisma.project.deleteMany()
  await prisma.user.deleteMany()

  console.log('Seeding Database...')

  // 1. Generate Core Users
  const developer = await prisma.user.create({
    data: {
      email: 'expert@beuntethered.io',
      name: 'Erik Vens (Expert)',
      role: 'FACILITATOR',
      stripe_account_id: 'acct_1MockStripeConnected123',
    }
  })

  const client1 = await prisma.user.create({
    data: {
      email: 'client1@corporate.com',
      name: 'Sarah Chen (BYOC Client)',
      role: 'CLIENT',
    }
  })

  const client2 = await prisma.user.create({
    data: {
      email: 'client2@startup.io',
      name: 'Marcus Startup (Marketplace Client)',
      role: 'CLIENT',
    }
  })

  console.log(`Created Expert: \x1b[32m${developer.name}\x1b[0m with Mock Stripe Connect`)

  // 2. Provision Projects mapping Escrow overrides
  
  // Project A: BYOC Flow
  const projectA = await prisma.project.create({
    data: {
      title: 'API Gateway Integration',
      ai_generated_sow: 'Deep architecture evaluation optimizing for minimal sub-10ms latency thresholds via optimized neural caching paths.',
      is_byoc: true,
      status: 'ACTIVE',
      client_id: client1.id,
    }
  })

  // Project B: Marketplace Flow
  const projectB = await prisma.project.create({
    data: {
      title: 'Decentralized Data Visualizer',
      ai_generated_sow: 'Front-end slicing of blockchain state via robust real-time SVG charting constraints. Bidding sourced via Untether Platform.',
      is_byoc: false,
      status: 'ACTIVE',
      client_id: client2.id,
    }
  })

  console.log('Synchronized \x1b[36mProject A (BYOC: true)\x1b[0m and \x1b[35mProject B (BYOC: false)\x1b[0m')

  // 3. Provision Milestones dictating exact Escrow status mapping to the UI
  
  // Project A Milestones
  await prisma.milestone.create({
    data: {
      project_id: projectA.id,
      title: 'Initial Architecture Audit',
      amount: 4500.00,
      status: 'APPROVED_AND_PAID',
    }
  })

  await prisma.milestone.create({
    data: {
      project_id: projectA.id,
      title: 'Core Latency Benchmarking',
      amount: 6000.00,
      status: 'FUNDED_IN_ESCROW',
      stripe_payment_intent_id: 'pi_mock_12345'
    }
  })

  // Project B Milestones
  await prisma.milestone.create({
    data: {
      project_id: projectB.id,
      title: 'UAT & Final Handover',
      amount: 8500.00,
      status: 'PENDING',
    }
  })

  await prisma.milestone.create({
    data: {
      project_id: projectB.id,
      title: 'Full-Stack Web App Migration',
      amount: 3200.00,
      status: 'DISPUTED',
    }
  })

  console.log('\n\x1b[32mSeeding completed successfully!\x1b[0m The Wallet UI will now render dense metric states based off these entries.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
