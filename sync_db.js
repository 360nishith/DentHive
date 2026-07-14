require('dotenv').config({ path: 'apps/api/.env' });
const { Client } = require('pg');

async function syncDb() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  await client.connect();
  console.log("Connected to DB!");
  
  try {
    await client.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS "waPhoneNumberId" VARCHAR(100);`);
    await client.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS "waAccessToken" TEXT;`);
    await client.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS "waAppSecret" TEXT;`);
    console.log("Columns added successfully!");
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

syncDb();
