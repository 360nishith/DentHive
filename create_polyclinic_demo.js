require('dotenv').config({ path: 'D:/DentalFlow/.env' });
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createDemoAccount(email, password, roleName, tenantId, firstName, lastName) {
  try {
    console.log(`Creating ${roleName}: ${email}...`);
    
    // 1. Create user in Supabase
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    
    if (authError) {
      console.error('Supabase Error:', authError.message);
      return null;
    }
    
    const authId = authData.user.id;
    console.log(`Supabase User created: ${authId}`);
    
    // 2. Get role
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    
    // 3. Create User in Prisma
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        tenantId: tenantId,
        roleId: role.id,
        authId: authId,
        firstName: firstName,
        lastName: lastName,
        email: email,
        phoneNumber: `+91990000${Math.floor(1000 + Math.random() * 9000)}`,
        passwordHash: hashedPassword,
        status: 'ACTIVE'
      }
    });
    console.log(`User created: ${user.id}`);
    
    // 4. Update Supabase Metadata
    await supabase.auth.admin.updateUserById(authId, {
      user_metadata: { tenantId: tenantId, role: roleName }
    });
    console.log(`Metadata updated! Account ${email} ready.\n`);
    return user;
    
  } catch (err) {
    console.error('Error:', err);
    return null;
  }
}

async function main() {
  // 1. Create Tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Polyclinic Demo',
      subdomain: 'polydemo3',
      status: 'ACTIVE'
    }
  });

  // 2. Create Admin (Owner)
  await createDemoAccount('admin@polydemo3.com', 'Demo1234!', 'ADMIN', tenant.id, 'Alice', 'Admin');

  // 3. Create Dentist 1
  await createDemoAccount('dentist1@polydemo3.com', 'Demo1234!', 'DENTIST', tenant.id, 'Bob', 'Dentist');

  // 4. Create Dentist 2
  await createDemoAccount('dentist2@polydemo3.com', 'Demo1234!', 'DENTIST', tenant.id, 'Charlie', 'Dentist');

  // 5. Create Staff
  await createDemoAccount('staff@polydemo3.com', 'Demo1234!', 'STAFF', tenant.id, 'Daisy', 'Staff');

  console.log("Done! Polyclinic Demo environment is ready.");
}

main().finally(() => prisma.$disconnect());
