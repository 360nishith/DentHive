require('dotenv').config({ path: 'apps/api/.env' });
const { Client } = require('pg');

async function makeImmortal() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  await client.connect();
  console.log("Connected to DB!");
  
  try {
    // Set createdAt to year 2100 for the two demo tenants
    await client.query(`
      UPDATE tenants 
      SET "createdAt" = '2100-01-01 00:00:00+00' 
      WHERE subdomain IN ('salesdemo2', 'citydental2');
    `);
    console.log("Demo accounts are now immortal!");
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

makeImmortal();
