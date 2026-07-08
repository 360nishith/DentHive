const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAdvance() {
  const tenantId = 'a965e088-e5f5-4bc3-87f3-ab6a9c4f43b3';
  const journeyId = '80bfe9f1-6692-44d8-9761-8c45a6484082';
  const currentStageOrder = 1;

  try {
    const journey = await prisma.treatmentJourney.findFirst({
      where: { id: journeyId, tenantId },
      include: { stages: { orderBy: { sequenceOrder: 'asc' } } }
    });

    if (!journey) throw new Error('Journey not found');
    
    const currentStage = journey.stages.find((s) => s.sequenceOrder === currentStageOrder);
    console.log("Current Stage Found:", currentStage?.name);

    await prisma.$transaction(async (tx) => {
      await tx.treatmentStage.updateMany({
        where: { id: currentStage.id },
        data: { status: 'COMPLETED', completedAt: new Date() }
      });

      const apptsToCancel = await tx.appointment.findMany({
        where: { 
          treatmentStageId: currentStage.id, 
          status: { in: ['SCHEDULED', 'CONFIRMED', 'RESCHEDULE_REQUESTED'] } 
        }
      });
      console.log("Appts to cancel:", apptsToCancel.length);

      await tx.appointment.updateMany({
        where: { 
          treatmentStageId: currentStage.id, 
          status: { in: ['SCHEDULED', 'CONFIRMED', 'RESCHEDULE_REQUESTED'] } 
        },
        data: { status: 'COMPLETED' }
      });
      
      const nextStage = journey.stages.find((s) => s.sequenceOrder > currentStageOrder);
      if (nextStage) {
        await tx.treatmentJourney.updateMany({
          where: { id: journeyId },
          data: { currentStageId: nextStage.id }
        });
      }
    });

    console.log("Transaction Success");
  } catch (e) {
    console.error("Transaction Error:", e);
  }
}

testAdvance().finally(() => prisma.$disconnect());
