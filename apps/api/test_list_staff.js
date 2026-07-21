const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({
    where: { tenantId: '6f9aea97-0fa8-4270-a777-f7b2864b8850', status: 'ACTIVE' },
    select: { id: true, authId: true, email: true, firstName: true, lastName: true, roleId: true, status: true, role: true }
  });
  console.log(JSON.stringify(users, null, 2));
}
main().finally(() => prisma.$disconnect());
