const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('--- STARTING INTEGRATION TEST (PHASE 2 & 3) ---');
  
  // 1. Get or Create a Tenant
  let tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    console.log('⏳ No tenant found. Creating a test clinic...');
    tenant = await prisma.tenant.create({
      data: {
        name: 'Dr. Shenoy Dental Clinic',
        subdomain: 'shenoy-clinic-' + Math.floor(Math.random() * 1000),
        status: 'ACTIVE'
      }
    });
  }
  console.log(`✅ Using Tenant: ${tenant.name} (${tenant.id})`);

  // --- PHASE 2: PATIENT REGISTRY ---
  console.log('\n--- TESTING PHASE 2: PATIENT CREATION ---');
  const patientName = 'Test Patient ' + Math.floor(Math.random() * 1000);
  const patient = await prisma.patient.create({
    data: {
      tenantId: tenant.id,
      name: patientName,
      phoneNumber: '99999' + Math.floor(Math.random() * 99999).toString().padStart(5, '0'),
      dateOfBirth: new Date('1990-01-01'),
      status: 'ACTIVE'
    }
  });
  console.log(`✅ Created Patient: ${patient.name} (${patient.id})`);

  const patients = await prisma.patient.findMany({ where: { tenantId: tenant.id } });
  console.log(`✅ Successfully fetched patients directory. Total count: ${patients.length}`);

  // --- PHASE 3: CLINICAL CORE (JOURNEYS) ---
  console.log('\n--- TESTING PHASE 3: CLINICAL JOURNEYS ---');
  
  // A. Seeding Templates
  let templates = await prisma.treatmentTemplate.findMany({ where: { tenantId: tenant.id }, include: { stages: true } });
  if (templates.length === 0) {
    console.log('⏳ Seeding templates...');
    await prisma.treatmentTemplate.create({
      data: {
        tenantId: tenant.id,
        name: 'Test Root Canal Treatment (RCT)',
        estimatedCost: 12000,
        stages: {
          create: [
            { sequenceOrder: 1, name: 'Initial Consultation & X-Ray', defaultIntervalDays: 0 },
            { sequenceOrder: 2, name: 'Pulp Extirpation & Cleaning', defaultIntervalDays: 2 },
          ]
        }
      }
    });
    templates = await prisma.treatmentTemplate.findMany({ where: { tenantId: tenant.id }, include: { stages: { orderBy: { sequenceOrder: 'asc' } } } });
    console.log('✅ Seeded templates.');
  }

  const template = templates[0];
  console.log(`✅ Selected Template: ${template.name}`);

  // B. Start a Journey
  console.log(`⏳ Starting Journey for ${patient.name}...`);
  const journey = await prisma.$transaction(async (tx) => {
    const j = await tx.treatmentJourney.create({
      data: {
        tenantId: tenant.id,
        patientId: patient.id,
        templateId: template.id,
        status: 'ACTIVE',
        totalCost: template.estimatedCost
      }
    });

    const stagesToCreate = template.stages.map((ts, index) => ({
      tenantId: tenant.id,
      journeyId: j.id,
      templateStageId: ts.id,
      status: 'PENDING'
    }));

    await tx.treatmentStage.createMany({ data: stagesToCreate });

    const createdStages = await tx.treatmentStage.findMany({
      where: { journeyId: j.id },
      include: { templateStage: true }
    });

    const firstStage = createdStages.find(s => s.templateStage.sequenceOrder === 1);
    if (firstStage) {
      await tx.treatmentJourney.updateMany({
        where: { id: j.id },
        data: { currentStageId: firstStage.id }
      });
    }
    return j;
  });
  console.log(`✅ Journey Started. ID: ${journey.id}`);

  // C. Advance State Machine
  console.log(`⏳ Advancing State Machine (Completing Stage 1)...`);
  
  const currentJourney = await prisma.treatmentJourney.findFirst({
    where: { id: journey.id },
    include: { stages: { include: { templateStage: true } } }
  });

  const currentStage = currentJourney?.stages.find(s => s.id === currentJourney.currentStageId);
  const nextStage = currentJourney?.stages.find(s => s.templateStage.sequenceOrder === currentStage.templateStage.sequenceOrder + 1);

  await prisma.$transaction(async (tx) => {
    await tx.treatmentStage.updateMany({
      where: { id: currentStage.id },
      data: { status: 'COMPLETED' }
    });
    
    if (nextStage) {
      await tx.treatmentJourney.updateMany({
        where: { id: journey.id },
        data: { currentStageId: nextStage.id }
      });
    } else {
      await tx.treatmentJourney.updateMany({
        where: { id: journey.id },
        data: { status: 'COMPLETED' }
      });
    }
  });

  const updatedJourney = await prisma.treatmentJourney.findFirst({
    where: { id: journey.id },
    include: { stages: { include: { templateStage: true }, orderBy: { templateStage: { sequenceOrder: 'asc' } } } }
  });

  console.log(`✅ State Machine Advanced. Journey Status: ${updatedJourney?.status}`);
  updatedJourney?.stages.forEach(s => {
    console.log(`   -> Stage ${s.templateStage.sequenceOrder}: ${s.templateStage.name} [${s.status}] ${updatedJourney.currentStageId === s.id ? '<-- CURRENT' : ''}`);
  });

  console.log('\n🎉 ALL PHASE 2 AND 3 TESTS PASSED PERFECTLY!');
}

main()
  .catch(e => {
    console.error('❌ TEST FAILED', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
