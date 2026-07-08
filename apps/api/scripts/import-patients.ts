import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Usage: npx tsx scripts/import-patients.ts <tenant_email> <path_to_csv>
// CSV Format expected (No Header): Name,PhoneNumber
// Example: John Doe, 9876543210

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('❌ Usage: npx tsx scripts/import-patients.ts <tenant_email> <path_to_csv>');
    process.exit(1);
  }

  const tenantEmail = args[0];
  const csvPath = path.resolve(process.cwd(), args[1]);

  console.log(`🔍 Looking for Tenant Owner: ${tenantEmail}`);
  const user = await prisma.user.findUnique({ where: { email: tenantEmail } });
  
  if (!user || !user.tenantId) {
    console.error('❌ Tenant not found for that email!');
    process.exit(1);
  }

  const tenantId = user.tenantId;
  console.log(`✅ Found Tenant ID: ${tenantId}`);

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV File not found at ${csvPath}`);
    process.exit(1);
  }

  console.log(`📖 Reading CSV file...`);
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  console.log(`🚀 Found ${lines.length} rows to import. Processing...`);

  let successCount = 0;
  let failCount = 0;

  for (const line of lines) {
    // Assuming format: Name, PhoneNumber
    const parts = line.split(',');
    if (parts.length < 2) {
      console.log(`⚠️ Skipping invalid line: ${line}`);
      failCount++;
      continue;
    }

    const name = parts[0].trim();
    // Clean phone number (remove spaces/dashes)
    const phone = parts[1].replace(/\D/g, '').trim();

    if (!name || !phone) {
      console.log(`⚠️ Skipping missing name/phone: ${line}`);
      failCount++;
      continue;
    }

    try {
      const existing = await prisma.patient.findFirst({
        where: { tenantId, phoneNumber: phone }
      });
      
      if (existing) {
        await prisma.patient.update({
          where: { id: existing.id },
          data: { name }
        });
      } else {
        await prisma.patient.create({
          data: {
            tenantId,
            name,
            phoneNumber: phone,
            whatsappOptIn: true // Assume opt-in for existing patients
          }
        });
      }
      successCount++;
    } catch (err: any) {
      console.error(`❌ Failed to import ${name} (${phone}): ${err.message}`);
      failCount++;
    }
  }

  console.log('\n================================');
  console.log('🎉 MIGRATION COMPLETE!');
  console.log(`✅ Successfully imported: ${successCount}`);
  console.log(`❌ Failed/Skipped: ${failCount}`);
  console.log('================================\n');
}

main()
  .catch((e) => {
    console.error('Fatal Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
