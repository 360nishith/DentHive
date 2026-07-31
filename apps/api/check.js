const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.appointmentReminder.findMany().then(console.log).finally(() => prisma.$disconnect());
