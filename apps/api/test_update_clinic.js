const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { TenantService } = require('./src/modules/tenant/services/tenant.service');

async function main() {
  const ts = new TenantService(prisma, null, null);
  try {
    const res = await ts.updateClinic('2206a6ee-213a-4817-9839-18f7d29f4cbb', '3a069615-45b4-4ee5-bbb3-3d7038a2ff01', {
      name: 'sales demo',
      upiVpa: '6361953329@pthdfc',
      waPhoneNumberId: '',
      waAccessToken: '',
      waAppSecret: ''
    });
    console.log("SUCCESS:", res);
  } catch (e) {
    console.error("FAILED:", e);
  }
}
main().finally(() => prisma.$disconnect());
