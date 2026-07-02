const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetDB() {
  console.log('Starting Production Database Sterilization...');
  
  try {
    // We want to delete all tenants except the Master Admin one (if it exists)
    // First, find the Master Admin user
    const masterAdmin = await prisma.user.findUnique({
      where: { email: 'nishithdharmaraj@gmail.com' }
    });
    
    let masterTenantId = null;
    if (masterAdmin) {
      masterTenantId = masterAdmin.tenantId;
      console.log(`Preserving Master Admin Tenant: ${masterTenantId}`);
    } else {
      console.log('No Master Admin found. Wiping ALL tenants.');
    }

    const tenantWhere = masterTenantId ? { id: { not: masterTenantId } } : {};

    // 1. Delete all Webhook Logs
    await prisma.webhookLog.deleteMany({});
    console.log('Wiped Webhook Logs');

    // 2. Delete all records associated with non-master tenants
    // Prisma cascading deletes should handle this if they were set up, 
    // but we use onDelete: Restrict for safety, so we must delete children manually.
    
    // Delete Appointments & Reminders
    const tenantsToDelete = await prisma.tenant.findMany({ where: tenantWhere, select: { id: true } });
    const tenantIds = tenantsToDelete.map(t => t.id);

    if (tenantIds.length === 0) {
      console.log('No test tenants found to delete. Database is clean.');
      return;
    }

    console.log(`Deleting data for ${tenantIds.length} test tenants...`);

    const condition = { tenantId: { in: tenantIds } };

    await prisma.appointmentReminder.deleteMany({ where: condition });
    await prisma.appointment.deleteMany({ where: condition });
    console.log('Wiped Appointments');

    await prisma.payment.deleteMany({ where: condition });
    console.log('Wiped Payments');

    await prisma.whatsappMessage.deleteMany({ where: condition });
    console.log('Wiped WhatsApp Messages');

    await prisma.followUp.deleteMany({ where: condition });
    await prisma.recallList.deleteMany({ where: condition });
    console.log('Wiped Automations & Recalls');

    await prisma.treatmentStage.deleteMany({ where: condition });
    await prisma.treatmentJourney.deleteMany({ where: condition });
    console.log('Wiped Journeys');

    await prisma.templateStage.deleteMany({ where: { template: condition } });
    await prisma.treatmentTemplate.deleteMany({ where: condition });
    console.log('Wiped Templates');

    await prisma.file.deleteMany({ where: condition });
    await prisma.patient.deleteMany({ where: condition });
    console.log('Wiped Patients');

    await prisma.subscription.deleteMany({ where: condition });
    console.log('Wiped Subscriptions');

    await prisma.auditLog.deleteMany({ where: condition });
    await prisma.notification.deleteMany({ where: condition });
    console.log('Wiped Logs & Notifications');

    await prisma.user.deleteMany({ where: condition });
    console.log('Wiped Users (except Master Admin)');

    await prisma.tenant.deleteMany({ where: condition });
    console.log('Wiped Test Tenants');

    console.log('\n✅ Database is successfully sterilized and ready for Production.');

  } catch (err) {
    console.error('Error during DB reset:', err);
  } finally {
    await prisma.$disconnect();
  }
}

resetDB();
