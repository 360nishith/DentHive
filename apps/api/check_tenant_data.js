const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const tenants = await prisma.tenant.findMany({ include: { patients: true, users: true } });
  tenants.forEach(t => {
    console.log(`Tenant: ${t.name} (ID: ${t.id})`);
    console.log(`  Users: ${t.users.map(u => u.email).join(', ')}`);
    console.log(`  Patients: ${t.patients.length}`);
  });
}
main().finally(() => prisma.$disconnect());
