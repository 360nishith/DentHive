const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { TenantService } = require('./dist/modules/tenant/services/tenant.service');

async function main() {
  const ts = new TenantService(prisma, null, null);
  
  // mock req.user for salesdemo
  const tenantId = '2206a6ee-213a-4817-9839-18f7d29f4cbb';
  const userId = '3a069615-45b4-4ee5-bbb3-3d7038a2ff01'; // The authId from db
  const data = {
    name: 'sales demo',
    upiVpa: '6361953329@pthdfc',
    waPhoneNumberId: '',
    waAccessToken: '',
    waAppSecret: ''
  };
  
  try {
    console.log("Calling updateClinic...");
    const res = await ts.updateClinic(tenantId, userId, data);
    console.log("SUCCESS:", res);
  } catch (e) {
    console.error("FAILED:", e.message, e);
  }
}
main().finally(() => prisma.$disconnect());
