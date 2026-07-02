const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const tenants = await prisma.tenant.findMany();
  if (tenants.length > 0) {
    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() - 16); // 16 days ago (trial is 14 days)
    
    await prisma.tenant.updateMany({
      data: { createdAt: expiredDate }
    });
    console.log('Tenant trial intentionally expired by backdating createdAt to:', expiredDate);
  }
}
run().catch(console.error).finally(() => prisma.$disconnect());
