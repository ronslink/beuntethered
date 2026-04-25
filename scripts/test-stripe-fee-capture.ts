import { prisma } from '../src/lib/auth';

async function main() {
  console.log('--- STRIPE FEE CAPTURE SIMULATION ---');

  // Find a pending milestone to test
  const milestone = await prisma.milestone.findFirst({
    where: { status: 'PENDING' },
    include: { project: true },
  });

  if (!milestone) {
    console.log('No pending milestones found in the database. Creating a mock one...');
    
    // Test Mock 1: Regular Marketplace (8% fee)
    testFeeCalculation({
      id: 'mock-1',
      title: 'Mock Milestone (Regular)',
      amount: 1000,
      project: {
        id: 'mock-proj-1',
        title: 'Regular Project',
        is_byoc: false,
        billing_type: 'FIXED_MILESTONE'
      }
    });

    // Test Mock 2: BYOC (5% fee)
    testFeeCalculation({
      id: 'mock-2',
      title: 'Mock Milestone (BYOC)',
      amount: 5000,
      project: {
        id: 'mock-proj-2',
        title: 'BYOC Project',
        is_byoc: true,
        billing_type: 'FIXED_MILESTONE'
      }
    });

    return;
  }

  // If a real milestone exists, test that
  console.log(`\nFound real pending milestone: ${milestone.id}`);
  testFeeCalculation(milestone);
}

function testFeeCalculation(milestone: any) {
  console.log(`\nCalculating fees for: ${milestone.project.title} - ${milestone.title}`);
  
  // The logic mirrored from api/stripe/checkout/route.ts
  const isByoc = milestone.project.is_byoc;
  const feeRate = isByoc ? 0.05 : 0.08;
  const milestoneAmountCents = Math.round(Number(milestone.amount) * 100);
  const applicationFee = Math.round(milestoneAmountCents * feeRate);

  console.log('----------------------------------------------------');
  console.log(`Project BYOC Status: ${isByoc ? 'YES (5% Fee Tier)' : 'NO (8% Fee Tier)'}`);
  console.log(`Milestone Amount:    $${Number(milestone.amount).toFixed(2)} (${milestoneAmountCents} cents)`);
  console.log(`Application Fee:     $${(applicationFee / 100).toFixed(2)} (${applicationFee} cents)`);
  console.log('----------------------------------------------------');
  console.log(`Payload ready for Stripe Checkout session application_fee_amount: ${applicationFee}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
