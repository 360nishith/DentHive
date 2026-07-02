const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  await p.appointment.deleteMany();
  await p.treatmentStage.deleteMany();
  await p.treatmentJourney.deleteMany();
  await p.templateStage.deleteMany();
  await p.treatmentTemplate.deleteMany();
  await p.patient.deleteMany();
  await p.user.deleteMany();
  const r = await p.tenant.deleteMany();
  console.log('✅ All test data cleaned up. Deleted', r.count, 'tenant(s). Fresh start ready!');
}

main().catch(console.error).finally(() => p.$disconnect());
