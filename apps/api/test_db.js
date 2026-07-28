const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function check() {
  const apts = await prisma.appointment.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3,
    include: { patient: true }
  });
  console.log('--- Appointments ---');
  console.log(apts.map(a => ({ id: a.id, name: a.patient?.name, status: a.status })));
  
  const msgs = await prisma.whatsAppMessage.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3
  });
  console.log('--- WhatsApp Msgs ---');
  console.log(msgs.map(m => ({ id: m.id, payload: m.payload })));

  const webhooks = await prisma.webhookLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3
  });
  console.log('--- Webhooks ---');
  console.log(webhooks);

  await prisma.\();
}
check();
