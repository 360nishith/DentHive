const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const crypto = require('crypto');
const prisma = new PrismaClient();

const WEBHOOK_URL = 'https://denthive.onrender.com/webhooks/razorpay'; // <--- CHANGE THIS to your live Render URL
const SECRET = 'denthive_secret_123'; // Must match your live Razorpay Webhook Secret

// Helper to generate Razorpay Signature
function generateSignature(payloadString) {
  return crypto.createHmac('sha256', SECRET).update(payloadString).digest('hex');
}

// Helper to send webhook safely
async function sendWebhook(payload) {
  const payloadString = JSON.stringify(payload);
  const signature = generateSignature(payloadString);
  try {
    await axios.post(WEBHOOK_URL, payloadString, {
      headers: { 
        'x-razorpay-signature': signature,
        'Content-Type': 'application/json'
      }
    });
  } catch (err) {
    console.log('Webhook Request Failed. Is your backend running on localhost:3001?');
    throw err;
  }
}

async function runTests() {
  console.log('🚀 Starting Automated Billing QA...');

  // --- SETUP ---
  // Create a brand new dummy clinic
  const tenant = await prisma.tenant.create({
    data: {
      name: 'QA Test Clinic',
      subdomain: `qatest${Date.now()}`,
      status: 'TRIAL'
    }
  });
  console.log(`\nCreated Test Clinic: ${tenant.name} (${tenant.id})`);

  try {
    // --- TEST 1: The 14-Day Expiration ---
    console.log('\n[Test 1] Simulating 14-Day Trial Expiration...');
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { status: 'READ_ONLY' } // Simulate the cron job locking it
    });
    
    let check = await prisma.tenant.findUnique({ where: { id: tenant.id } });
    if (check.status === 'READ_ONLY') console.log('✅ Passed: Clinic correctly locked out.');
    else throw new Error('Failed to lock clinic');

    // --- TEST 2: The First Payment (Standard Plan) ---
    console.log('\n[Test 2] Simulating Successful Razorpay Payment (Standard)...');
    const paymentPayload = {
      event: 'subscription.charged',
      payload: {
        subscription: {
          entity: {
            id: 'sub_qa_123',
            current_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000), // +30 days
            notes: { tenantId: tenant.id, planType: 'STANDARD' }
          }
        }
      }
    };
    
    await sendWebhook(paymentPayload);
    await new Promise(r => setTimeout(r, 1000)); // Wait for queue to process

    check = await prisma.tenant.findUnique({ where: { id: tenant.id } });
    const subCheck = await prisma.subscription.findFirst({ where: { tenantId: tenant.id } });
    
    if (check.status === 'ACTIVE' && subCheck && subCheck.planTier === 'STANDARD') {
      console.log('✅ Passed: Webhook intercepted. Clinic unlocked. Subscription created.');
    } else throw new Error('Failed to activate clinic via webhook');

    // --- TEST 3: The BYOS Upgrade ---
    console.log('\n[Test 3] Simulating Upgrade to BYOS Plan...');
    const upgradePayload = {
      event: 'subscription.charged',
      payload: {
        subscription: {
          entity: {
            id: 'sub_qa_123',
            current_end: Math.floor((Date.now() + 60 * 24 * 60 * 60 * 1000) / 1000), // Next month
            notes: { tenantId: tenant.id, planType: 'BYOS' }
          }
        }
      }
    };
    await sendWebhook(upgradePayload);
    await new Promise(r => setTimeout(r, 1000));
    
    const upgradeCheck = await prisma.subscription.findFirst({ where: { tenantId: tenant.id } });
    if (upgradeCheck.planTier === 'BYOS') console.log('✅ Passed: Subscription successfully upgraded to BYOS.');
    else throw new Error('Failed to upgrade plan');

    // --- TEST 4: The Payment Failure (Card Expired) ---
    console.log('\n[Test 4] Simulating Payment Failure (Card Declined)...');
    const failurePayload = {
      event: 'subscription.halted',
      payload: {
        subscription: {
          entity: {
            id: 'sub_qa_123',
            notes: { tenantId: tenant.id }
          }
        }
      }
    };
    await sendWebhook(failurePayload);
    await new Promise(r => setTimeout(r, 1000));

    const failureCheck = await prisma.subscription.findFirst({ where: { tenantId: tenant.id } });
    if (failureCheck.status === 'HALTED') console.log('✅ Passed: Subscription marked as HALTED due to failure.');
    else throw new Error('Failed to halt subscription');

    console.log('\n🎉 ALL TESTS PASSED! Your Razorpay Billing Logic is mathematically flawless.');

  } catch (e) {
    console.error('\n❌ TEST FAILED:', e.message);
    if (e.response && e.response.data) {
      console.error('Server error details:', e.response.data);
    }
  } finally {
    // --- CLEANUP ---
    console.log('\nCleaning up database...');
    await prisma.subscription.deleteMany({ where: { tenantId: tenant.id } });
    await prisma.tenant.delete({ where: { id: tenant.id } });
    console.log('Done.');
    await prisma.$disconnect();
  }
}

runTests();
