/**
 * DentalFlow – Full Integration Test (Phases 1–4)
 * Tests ALL database operations end-to-end via Prisma directly.
 * Run: node test-integration.js
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

let passed = 0;
let failed = 0;

function ok(label) {
  console.log(`  ✅ ${label}`);
  passed++;
}

function fail(label, err) {
  console.log(`  ❌ ${label}`);
  console.log(`     → ${err?.message || err}`);
  failed++;
}

async function clean(tenantId) {
  await p.appointment.deleteMany({ where: { tenantId } });
  await p.treatmentStage.deleteMany({ where: { tenantId } });
  await p.treatmentJourney.deleteMany({ where: { tenantId } });
  await p.templateStage.deleteMany();
  await p.treatmentTemplate.deleteMany({ where: { tenantId } });
  await p.patient.deleteMany({ where: { tenantId } });
  await p.user.deleteMany({ where: { tenantId } });
  await p.tenant.deleteMany({ where: { id: tenantId } });
}

async function main() {
  console.log('\n========================================');
  console.log('  DentalFlow – Integration Test Suite');
  console.log('========================================\n');

  // ─── PHASE 1: Tenant & User Setup ─────────────────────────
  console.log('📋 PHASE 1 — Onboarding & Auth\n');
  
  let tenant, adminRole, user;
  
  try {
    tenant = await p.tenant.create({
      data: { name: 'Test Clinic (Integration)', subdomain: `test-clinic-${Date.now()}`, status: 'ACTIVE' }
    });
    ok(`Tenant created: "${tenant.name}"`);
  } catch (e) { fail('Create tenant', e); return; }

  try {
    adminRole = await p.role.findFirst({ where: { name: 'ADMIN' } });
    if (!adminRole) adminRole = await p.role.create({ data: { name: 'ADMIN' } });
    ok(`Admin role resolved`);
  } catch (e) { fail('Resolve admin role', e); }

  try {
    user = await p.user.create({
      data: {
        tenantId: tenant.id,
        roleId: adminRole.id,
        authId: `test-auth-${Date.now()}`,
        firstName: 'Test',
        lastName: 'Doctor',
        phoneNumber: `9${Date.now().toString().slice(-9)}`,
        passwordHash: 'supabase_managed',
        isActive: true,
        status: 'ACTIVE',
      }
    });
    ok(`User created: "${user.firstName} ${user.lastName}"`);
  } catch (e) { fail('Create user', e); }

  // ─── PHASE 2: Patient Registry ─────────────────────────────
  console.log('\n📋 PHASE 2 — Patient Registry\n');

  let patient;

  try {
    patient = await p.patient.create({
      data: {
        tenantId: tenant.id,
        name: 'Rahul Sharma',
        phoneNumber: `8${Date.now().toString().slice(-9)}`,
        gender: 'Male',
        dateOfBirth: new Date(new Date().getFullYear() - 34, 0, 1), // 34 years old
        status: 'ACTIVE',
      }
    });
    ok(`Patient created: "${patient.name}", Gender: ${patient.gender}`);
  } catch (e) { fail('Create patient', e); }

  try {
    const age = Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
    if (age < 33 || age > 35) throw new Error(`Expected ~34 years, got ${age}`);
    ok(`Age calculated correctly: ${age} yrs`);
  } catch (e) { fail('Age calculation', e); }

  try {
    const updated = await p.patient.updateMany({
      where: { id: patient.id },
      data: { gender: 'Male', name: 'Rahul Kumar Sharma' }
    });
    if (updated.count !== 1) throw new Error('No rows updated');
    ok(`Patient profile edit works`);
  } catch (e) { fail('Edit patient profile', e); }

  try {
    const list = await p.patient.findMany({ where: { tenantId: tenant.id, status: 'ACTIVE' } });
    if (!list.find(p => p.id === patient.id)) throw new Error('Patient not in list');
    ok(`Patient list fetched (${list.length} patient)`);
  } catch (e) { fail('Fetch patient list', e); }

  // ─── PHASE 3: Treatment Journeys ───────────────────────────
  console.log('\n📋 PHASE 3 — Treatment Journeys\n');

  let template, journey, stages;

  try {
    template = await p.treatmentTemplate.create({
      data: {
        tenantId: tenant.id,
        name: 'Root Canal Treatment (RCT)',
        estimatedCost: 12000,
        stages: {
          create: [
            { sequenceOrder: 1, name: 'Consultation & X-Ray', defaultIntervalDays: 0 },
            { sequenceOrder: 2, name: 'Pulp Extirpation', defaultIntervalDays: 3 },
            { sequenceOrder: 3, name: 'Obturation', defaultIntervalDays: 7 },
          ]
        }
      },
      include: { stages: { orderBy: { sequenceOrder: 'asc' } } }
    });
    ok(`Template created: "${template.name}" with ${template.stages.length} stages`);
  } catch (e) { fail('Create treatment template with stages', e); }

  try {
    journey = await p.treatmentJourney.create({
      data: {
        tenantId: tenant.id,
        patientId: patient.id,
        templateId: template.id,
        status: 'ACTIVE',
        totalCost: template.estimatedCost,
      }
    });
    // Create stages
    await p.treatmentStage.createMany({
      data: template.stages.map(ts => ({
        tenantId: tenant.id,
        journeyId: journey.id,
        templateStageId: ts.id,
        status: 'PENDING',
      }))
    });
    stages = await p.treatmentStage.findMany({
      where: { journeyId: journey.id },
      include: { templateStage: true },
      orderBy: { templateStage: { sequenceOrder: 'asc' } }
    });
    // Set currentStageId
    await p.treatmentJourney.updateMany({
      where: { id: journey.id },
      data: { currentStageId: stages[0].id }
    });
    ok(`Journey started with ${stages.length} stages, Stage 1 is current`);
  } catch (e) { fail('Start journey', e); }

  try {
    // Advance: complete stage 1, move to stage 2
    await p.treatmentStage.updateMany({
      where: { id: stages[0].id },
      data: { status: 'COMPLETED', completedAt: new Date() }
    });
    await p.treatmentJourney.updateMany({
      where: { id: journey.id },
      data: { currentStageId: stages[1].id }
    });
    const updated = await p.treatmentJourney.findFirst({
      where: { id: journey.id },
      include: { stages: { include: { templateStage: true }, orderBy: { templateStage: { sequenceOrder: 'asc' } } } }
    });
    const completedStage = updated.stages.find(s => s.status === 'COMPLETED');
    const currentStage = updated.stages.find(s => s.id === updated.currentStageId);
    if (!completedStage) throw new Error('No completed stage found');
    if (!currentStage || currentStage.templateStage.sequenceOrder !== 2) throw new Error('Stage 2 not current');
    ok(`Stage advanced: "${completedStage.templateStage.name}" ✓, now on "${currentStage.templateStage.name}"`);
  } catch (e) { fail('Advance journey stage', e); }

  try {
    // Complete all remaining stages
    await p.treatmentStage.updateMany({
      where: { journeyId: journey.id, status: 'PENDING' },
      data: { status: 'COMPLETED', completedAt: new Date() }
    });
    await p.treatmentJourney.updateMany({
      where: { id: journey.id },
      data: { status: 'COMPLETED', completedAt: new Date() }
    });
    const done = await p.treatmentJourney.findFirst({ where: { id: journey.id } });
    if (done.status !== 'COMPLETED') throw new Error(`Status is ${done.status}`);
    ok(`Journey fully completed ✓`);
  } catch (e) { fail('Complete journey', e); }

  // ─── PHASE 4: Appointments ─────────────────────────────────
  console.log('\n📋 PHASE 4 — Appointments\n');

  // Restart journey for appointment tests
  let newJourney, newStages;
  try {
    newJourney = await p.treatmentJourney.create({
      data: {
        tenantId: tenant.id,
        patientId: patient.id,
        templateId: template.id,
        status: 'ACTIVE',
        totalCost: template.estimatedCost,
      }
    });
    await p.treatmentStage.createMany({
      data: template.stages.map(ts => ({
        tenantId: tenant.id,
        journeyId: newJourney.id,
        templateStageId: ts.id,
        status: 'PENDING',
      }))
    });
    newStages = await p.treatmentStage.findMany({
      where: { journeyId: newJourney.id },
      include: { templateStage: true },
      orderBy: { templateStage: { sequenceOrder: 'asc' } }
    });
    await p.treatmentJourney.updateMany({
      where: { id: newJourney.id },
      data: { currentStageId: newStages[0].id }
    });
    ok(`New journey created for appointment testing`);
  } catch (e) { fail('Setup journey for appointments', e); }

  let appointment;
  try {
    const start = new Date();
    start.setHours(10, 0, 0, 0);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + 30);
    appointment = await p.appointment.create({
      data: {
        tenantId: tenant.id,
        patientId: patient.id,
        treatmentStageId: newStages[0].id,
        scheduledStart: start,
        scheduledEnd: end,
        status: 'SCHEDULED',
      }
    });
    ok(`Appointment created: ${start.toLocaleTimeString()} – ${end.toLocaleTimeString()}`);
  } catch (e) { fail('Create appointment', e); }

  try {
    const list = await p.appointment.findMany({
      where: { tenantId: tenant.id, patientId: patient.id },
      include: { treatmentStage: { include: { templateStage: true } } }
    });
    if (!list.find(a => a.id === appointment.id)) throw new Error('Appointment not in list');
    ok(`Patient appointments fetched (${list.length} appointment)`);
  } catch (e) { fail('Fetch patient appointments', e); }

  try {
    await p.appointment.updateMany({
      where: { id: appointment.id },
      data: { status: 'CANCELLED' }
    });
    const cancelled = await p.appointment.findFirst({ where: { id: appointment.id } });
    if (cancelled.status !== 'CANCELLED') throw new Error(`Status is ${cancelled.status}`);
    ok(`Appointment cancelled successfully`);
  } catch (e) { fail('Cancel appointment', e); }

  // ─── Cleanup ───────────────────────────────────────────────
  console.log('\n🧹 Cleaning up test data...');
  try {
    await clean(tenant.id);
    console.log('   Test data removed.\n');
  } catch (e) {
    console.log(`   Warning: cleanup failed — ${e.message}\n`);
  }

  // ─── Summary ───────────────────────────────────────────────
  console.log('========================================');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('========================================\n');

  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED! Ready for Phase 5.\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Check above.\n');
    process.exit(1);
  }
}

main().catch(e => {
  console.error('\n💥 Test runner crashed:', e.message);
  process.exit(1);
}).finally(() => p.$disconnect());
