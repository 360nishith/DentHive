const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({
    where: { OR: [{ email: 'doctordemo@denthive.in' }, { email: 'j@j' }] },
    select: { email: true, firstName: true, tenantId: true, role: true }
  });
  console.log(JSON.stringify(users, null, 2));
}
main();
