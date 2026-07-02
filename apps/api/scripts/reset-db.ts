import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Starting database cleanup...');

  // We delete in reverse order of dependencies to avoid foreign key constraints
  
  console.log('Deleting WebhookLogs...');
  await prisma.webhookLog.deleteMany({});
  
  console.log('Deleting WhatsAppMessages...');
  await prisma.whatsAppMessage.deleteMany({});
  
  console.log('Deleting Payments...');
  await prisma.payment.deleteMany({});
  
  console.log('Deleting FollowUps...');
  await prisma.followUp.deleteMany({});
  
  console.log('Deleting AppointmentReminders...');
  await prisma.appointmentReminder.deleteMany({});
  
  console.log('Deleting Appointments...');
  await prisma.appointment.deleteMany({});
  
  console.log('Deleting TreatmentStages...');
  await prisma.treatmentStage.deleteMany({});
  
  console.log('Deleting TreatmentJourneys...');
  await prisma.treatmentJourney.deleteMany({});
  
  console.log('Deleting Files...');
  await prisma.file.deleteMany({});
  
  console.log('Deleting RecallLists...');
  await prisma.recallList.deleteMany({});
  
  console.log('Deleting Patients...');
  await prisma.patient.deleteMany({});

  console.log('✅ Database successfully reset for testing!');
  console.log('Note: Tenants, Users, Roles, and Treatment Templates were preserved.');
}

main()
  .catch((e) => {
    console.error('Error resetting database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
