const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const subs = await prisma.subscription.findMany();
  console.log(JSON.stringify(subs, null, 2));
}
run().catch(console.error).finally(() => prisma.$disconnect());
