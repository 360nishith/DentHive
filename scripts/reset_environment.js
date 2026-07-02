const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

// Load env vars from apps/api/.env
dotenv.config({ path: path.join(__dirname, '../apps/api/.env') });

const prisma = new PrismaClient();
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function resetEnvironment() {
  console.log('=============================================');
  console.log('   STARTING FULL ENVIRONMENT STERILIZATION   ');
  console.log('=============================================\n');

  try {
    // 1. Identify Master Admin
    const superAdminEmail = 'nishithdharmaraj@gmail.com';
    
    // Check if master admin exists in Prisma
    const masterAdmin = await prisma.user.findFirst({
      where: { 
        firstName: 'Nishith', 
        lastName: 'Dharmaraj' 
      }
    });

    let masterTenantId = masterAdmin ? masterAdmin.tenantId : null;
    if (masterTenantId) {
      console.log(`✅ Preserving Master Admin Tenant: ${masterTenantId} (Nishith Dharmaraj)`);
    } else {
      console.log('⚠️ No Master Admin found in Prisma. Wiping ALL tenants.');
    }

    // 2. Wipe Prisma Database
    console.log('\n--- Step 1: Wiping Prisma Database ---');
    const tenantWhere = masterTenantId ? { id: { not: masterTenantId } } : {};
    
    await prisma.webhookLog.deleteMany({});
    
    const tenantsToDelete = await prisma.tenant.findMany({ where: tenantWhere, select: { id: true } });
    const tenantIds = tenantsToDelete.map(t => t.id);

    if (tenantIds.length > 0) {
      console.log(`Deleting data for ${tenantIds.length} test tenants...`);
      const condition = { tenantId: { in: tenantIds } };

      await prisma.appointmentReminder.deleteMany({ where: condition });
      await prisma.appointment.deleteMany({ where: condition });
      await prisma.payment.deleteMany({ where: condition });
      await prisma.whatsAppMessage.deleteMany({ where: condition });
      await prisma.followUp.deleteMany({ where: condition });
      await prisma.recallList.deleteMany({ where: condition });
      await prisma.treatmentStage.deleteMany({ where: condition });
      await prisma.treatmentJourney.deleteMany({ where: condition });
      
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
      console.log('✅ Prisma Database wiped successfully.');
    } else {
      console.log('✅ Prisma Database is already clean.');
    }

    // 3. Wipe Supabase Auth Users
    console.log('\n--- Step 2: Wiping Supabase Auth Users ---');
    
    // Fetch all users (pages of 1000)
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.listUsers();
    if (authErr) throw authErr;

    let deletedCount = 0;
    for (const user of authData.users) {
      if (user.email === superAdminEmail) {
        console.log(`✅ Preserving Supabase Auth Account: ${user.email}`);
        continue;
      }
      
      console.log(`Deleting Supabase user: ${user.email} (${user.id})`);
      const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(user.id);
      if (delErr) {
        console.error(`Failed to delete user ${user.email}:`, delErr.message);
      } else {
        deletedCount++;
      }
    }
    console.log(`✅ Deleted ${deletedCount} test accounts from Supabase Auth.`);

    console.log('\n=============================================');
    console.log('   ENVIRONMENT SUCCESSFULLY STERILIZED!      ');
    console.log('=============================================');

  } catch (err) {
    console.error('\n❌ Error during reset:', err);
  } finally {
    await prisma.$disconnect();
  }
}

resetEnvironment();
