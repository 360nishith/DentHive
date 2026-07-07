const jwt = require('jsonwebtoken');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const secret = 'sb_secret_QLI96vmqCmGOiN9T_BqHYA_O7TNsvEs';

async function main() {
  const staff = await prisma.user.findFirst({
    where: { tenantId: '99bccf42-8c40-41b3-b851-3082574d4b56' },
    include: { role: true }
  });
  
  // Actually, we just need the one that has role STAFF
  const allUsers = await prisma.user.findMany({
    where: { tenantId: '99bccf42-8c40-41b3-b851-3082574d4b56' },
    include: { role: true }
  });
  const staffUser = allUsers.find(u => u.role.name === 'STAFF');

  console.log("Staff Auth ID:", staffUser.authId);

  const payload = {
    sub: staffUser.authId,
    aud: 'authenticated',
    app_metadata: {
      tenantId: '99bccf42-8c40-41b3-b851-3082574d4b56',
      role: 'STAFF'
    },
    email: 'staff2@denthive.in',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  };

  const token = jwt.sign(payload, secret);

  try {
    const res = await axios.get('http://localhost:3000/patients?limit=1', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("API Patients Response:", res.data);
  } catch (err) {
    console.error("API Patients Error:", err.response?.status, err.response?.data);
  }

  try {
    const res = await axios.get('http://localhost:3000/appointments?start=2026-07-07T00:00:00.000Z&end=2026-07-07T23:59:59.999Z', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("API Appointments Response:", res.data.length);
  } catch (err) {
    console.error("API Appointments Error:", err.response?.status, err.response?.data);
  }
}
main().finally(() => prisma.$disconnect());
