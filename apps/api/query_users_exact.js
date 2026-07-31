const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, authId: true, email: true, firstName: true, lastName: true, roleId: true, status: true, role: true }
  });
  console.log(JSON.stringify(users, null, 2));
}
main();
