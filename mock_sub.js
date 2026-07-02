const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const tenantId = '094858ec-b61f-4c68-855a-31631d530e83'; // adhishree dental
  const newPeriodEnd = new Date();
  newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1); // 1 month from now

  await prisma.subscription.create({
    data: {
      tenantId,
      planTier: 'BYOS',
      status: 'ACTIVE',
      currentPeriodEnd: newPeriodEnd,
      razorpaySubId: 'sub_test_mock123'
    }
  });

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { status: 'ACTIVE' }
  });

  console.log('Successfully inserted active mock subscription for tenant!');
}
run().catch(console.error).finally(() => prisma.$disconnect());
