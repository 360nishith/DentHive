const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const t = await prisma.template.findMany();
  console.log(JSON.stringify(t.map(x => x.name), null, 2));
}
run().finally(() => prisma.$disconnect());
