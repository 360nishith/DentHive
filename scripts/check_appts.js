const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const appts = await prisma.appointment.findMany({
    where: { status: 'SCHEDULED' },
    include: {
      treatmentStage: true
    }
  });
  console.log(JSON.stringify(appts, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
