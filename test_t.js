const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const tenants = await prisma.tenant.findMany();
  console.log(JSON.stringify(tenants, null, 2));
}
run().catch(console.error).finally(() => prisma.$disconnect());
