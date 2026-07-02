const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const tenant = await prisma.tenant.findUnique({
    where: { id: '094858ec-b61f-4c68-855a-31631d530e83' },
    include: { subscriptions: true }
  });
  console.log(JSON.stringify(tenant, null, 2));
}
run().catch(console.error).finally(() => prisma.$disconnect());
