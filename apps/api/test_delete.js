const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    const tenantId = '2206a6ee-213a-4817-9839-18f7d29f4cbb';
    const targetUserId = '231225e7-4220-4369-85a8-eacb422b6914';
    await prisma.$executeRaw`
      UPDATE appointments
      SET status = 'CANCELLED'
      WHERE "tenantId" = ${tenantId}::uuid
        AND status = 'SCHEDULED'
        AND "scheduledStart" > NOW()
        AND (
          "doctorId" = ${targetUserId}::uuid
          OR ("doctorId" IS NULL AND "patientId" IN (SELECT id FROM patients WHERE "doctorId" = ${targetUserId}::uuid))
        )
    `;
    console.log('SUCCESS Appointment');
    
    await prisma.$executeRaw`
      UPDATE patients
      SET "doctorId" = NULL
      WHERE "tenantId" = ${tenantId}::uuid AND "doctorId" = ${targetUserId}::uuid
    `;
    console.log('SUCCESS Patient');
  } catch(e) {
    console.error('ERROR:', e);
  }
}
main().finally(() => prisma.$disconnect());
