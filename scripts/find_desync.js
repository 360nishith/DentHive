const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDesync() {
  const appts = await prisma.appointment.findMany({
    where: { 
      status: { in: ['SCHEDULED', 'CONFIRMED', 'RESCHEDULE_REQUESTED'] },
      treatmentStage: { status: 'COMPLETED' }
    },
    include: {
      patient: true,
      treatmentStage: true
    }
  });
  
  if (appts.length > 0) {
    console.log(`Found ${appts.length} desynced appointments! Fixing them now...`);
    for (const appt of appts) {
      await prisma.appointment.update({
        where: { id: appt.id },
        data: { status: 'COMPLETED' }
      });
      console.log(`Fixed appointment ${appt.id}`);
    }
  } else {
    console.log("No desynced appointments found. Database is perfectly consistent.");
  }
}

checkDesync().finally(() => prisma.$disconnect());
