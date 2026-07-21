const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ include: { role: true, tenant: true } });
  console.log(JSON.stringify(users, null, 2));
}
main().finally(() => prisma.$disconnect());
