const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const role = await prisma.role.findUnique({ where: { id: 'c2f70eb2-9d3e-4fb1-a08b-6df633000002' } });
  console.log("ROLE IN DB IS:", role);
}
main().finally(() => prisma.$disconnect());
