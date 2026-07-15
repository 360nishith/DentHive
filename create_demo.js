require('dotenv').config({ path: 'D:/DentalFlow/.env' });
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createDemoAccount(email, password, clinicName, subdomain, phone) {
  try {
    console.log(`Creating ${clinicName}...`);
    
    // 1. Delete existing user if present
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers.users.find(u => u.email === email);
    if (existing) {
      await supabase.auth.admin.deleteUser(existing.id);
      console.log(`Deleted existing Supabase user for ${email}`);
    }

    // 2. Create user in Supabase
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    
    if (authError) {
      console.error('Supabase Error:', authError.message);
      return;
    }
    
    const authId = authData.user.id;
    console.log(`Supabase User created: ${authId}`);
    
    // 2. Create Tenant in Prisma
    const tenant = await prisma.tenant.create({
      data: {
        name: clinicName,
        subdomain: subdomain,
        status: 'TRIAL'
      }
    });
    console.log(`Tenant created: ${tenant.id}`);
    
    // 3. Get ADMIN role
    const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
    
    // 4. Create User in Prisma
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        roleId: adminRole.id,
        authId: authId,
        firstName: 'Demo',
        lastName: 'Doctor',
        email: email,
        phoneNumber: phone,
        passwordHash: hashedPassword,
        status: 'ACTIVE'
      }
    });
    console.log(`User created: ${user.id}`);
    
    // 5. Update Supabase Metadata
    await supabase.auth.admin.updateUserById(authId, {
      user_metadata: { tenantId: tenant.id, role: 'ADMIN' }
    });
    console.log(`Metadata updated! Account ${email} ready.\n`);
    
  } catch (err) {
    console.error('Error:', err);
  }
}

async function main() {
  await createDemoAccount(
    'salesdemo@denthive.in',
    'Demo1234!',
    'DentHive Sales Demo',
    'salesdemo',
    '+919000000001'
  );
  
  await createDemoAccount(
    'doctordemo@denthive.in',
    'Doctor1234!',
    'City Dental Care',
    'citydental',
    '+919000000002'
  );
  
  console.log("Done!");
}

main().finally(() => prisma.$disconnect());
