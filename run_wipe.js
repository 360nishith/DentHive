const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetDB() {
  console.log('Starting Production Database Sterilization...');
  
  try {
    const masterAdmin = await prisma.user.findFirst({
      where: { 
        firstName: 'Nishith', 
        lastName: 'Dharmaraj' 
      }
    });
    
    let masterTenantId = null;
    if (masterAdmin) {
      masterTenantId = masterAdmin.tenantId;
      console.log('Preserving Master Admin Tenant: ' + masterTenantId + ' (Nishith Dharmaraj)');
    } else {
      console.log('No Master Admin found. Wiping ALL tenants.');
    }

    const tenantWhere = masterTenantId ? { id: { not: masterTenantId } } : {};

    // 1. Delete all Webhook Logs
    await prisma.webhookLog.deleteMany({});
    console.log('Wiped Webhook Logs');
    
    const tenantsToDelete = await prisma.tenant.findMany({ where: tenantWhere, select: { id: true } });
    const tenantIds = tenantsToDelete.map(t => t.id);

    if (tenantIds.length === 0) {
      console.log('No test tenants found to delete. Database is clean.');
      return;
    }

    console.log('Deleting data for ' + tenantIds.length + ' test tenants...');
    const condition = { tenantId: { in: tenantIds } };

    await prisma.appointmentReminder.deleteMany({ where: condition });
    await prisma.appointment.deleteMany({ where: condition });
    await prisma.payment.deleteMany({ where: condition });
    await prisma.whatsAppMessage.deleteMany({ where: condition });
    await prisma.followUp.deleteMany({ where: condition });
    await prisma.recallList.deleteMany({ where: condition });
    await prisma.treatmentStage.deleteMany({ where: condition });
    await prisma.treatmentJourney.deleteMany({ where: condition });
    
    // For templateStage, it's not tenantId directly, it's through template
    // But earlier I had: await prisma.templateStage.deleteMany({ where: { template: condition } });
    const templates = await prisma.treatmentTemplate.findMany({ where: condition, select: { id: true } });
    const templateIds = templates.map(t => t.id);
    if(templateIds.length > 0) {
       await prisma.templateStage.deleteMany({ where: { templateId: { in: templateIds } } });
    }
    
    await prisma.treatmentTemplate.deleteMany({ where: condition });
    await prisma.file.deleteMany({ where: condition });
    await prisma.patient.deleteMany({ where: condition });
    await prisma.subscription.deleteMany({ where: condition });
    await prisma.auditLog.deleteMany({ where: condition });
    await prisma.notification.deleteMany({ where: condition });
    await prisma.user.deleteMany({ where: condition });
    await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } });

    console.log('\n? Database is successfully sterilized and ready for Production.');
  } catch (err) {
    console.error('Error during DB reset:', err);
  } finally {
    await prisma.$disconnect();
  }
}
resetDB();
