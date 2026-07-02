const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany();
  console.log('TENANTS:', tenants);

  const users = await prisma.user.findMany();
  console.log('USERS:', users);
}

main().finally(() => prisma.$disconnect());
