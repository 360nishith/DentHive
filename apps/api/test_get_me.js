const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findUnique({
    where: { id: 'ac20d469-00bf-49e3-9d86-2200f1893b14' },
    select: { id: true, firstName: true, lastName: true, email: true, role: true }
  });
  console.log('Prisma output:', JSON.stringify(user));
}
main().finally(() => prisma.$disconnect());
