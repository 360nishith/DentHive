-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "subdomain" VARCHAR(100) NOT NULL,
    "upiVpa" VARCHAR(255),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "email" VARCHAR(255),
    "phoneNumber" VARCHAR(20) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "phoneNumber" VARCHAR(20) NOT NULL,
    "whatsappOptIn" BOOLEAN NOT NULL DEFAULT false,
    "gender" VARCHAR(20),
    "dateOfBirth" DATE,
    "preferredLanguage" VARCHAR(10) NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "fileUrl" VARCHAR(1024) NOT NULL,
    "fileType" VARCHAR(50) NOT NULL,
    "uploadedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "estimatedCost" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "treatment_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_stages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "templateId" UUID NOT NULL,
    "sequenceOrder" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "defaultIntervalDays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "template_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_journeys" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "currentStageId" UUID,
    "status" VARCHAR(50) NOT NULL,
    "totalCost" INTEGER NOT NULL,
    "startedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "treatment_journeys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_stages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "journeyId" UUID NOT NULL,
    "templateStageId" UUID NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "completedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "treatment_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "treatmentStageId" UUID NOT NULL,
    "scheduledStart" TIMESTAMPTZ NOT NULL,
    "scheduledEnd" TIMESTAMPTZ NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_ups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "stageId" UUID NOT NULL,
    "triggerAt" TIMESTAMPTZ NOT NULL,
    "nudgeType" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recall_lists" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "recallDate" DATE NOT NULL,
    "reason" VARCHAR(255) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "recall_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "journeyId" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "paymentMethod" VARCHAR(50) NOT NULL,
    "recordedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "direction" VARCHAR(10) NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "planTier" VARCHAR(50) NOT NULL,
    "razorpaySubId" VARCHAR(255),
    "status" VARCHAR(50) NOT NULL,
    "currentPeriodEnd" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "entityType" VARCHAR(50) NOT NULL,
    "entityId" UUID NOT NULL,
    "changes" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_subdomain_key" ON "tenants"("subdomain");

-- CreateIndex
CREATE INDEX "tenants_subdomain_idx" ON "tenants"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phoneNumber_key" ON "users"("phoneNumber");

-- CreateIndex
CREATE INDEX "users_tenantId_email_idx" ON "users"("tenantId", "email");

-- CreateIndex
CREATE INDEX "users_tenantId_phoneNumber_idx" ON "users"("tenantId", "phoneNumber");

-- CreateIndex
CREATE INDEX "patients_tenantId_name_idx" ON "patients"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "patients_tenantId_phoneNumber_key" ON "patients"("tenantId", "phoneNumber");

-- CreateIndex
CREATE INDEX "files_tenantId_patientId_idx" ON "files"("tenantId", "patientId");

-- CreateIndex
CREATE INDEX "treatment_templates_tenantId_name_idx" ON "treatment_templates"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "template_stages_templateId_sequenceOrder_key" ON "template_stages"("templateId", "sequenceOrder");

-- CreateIndex
CREATE INDEX "treatment_journeys_tenantId_patientId_idx" ON "treatment_journeys"("tenantId", "patientId");

-- CreateIndex
CREATE INDEX "treatment_journeys_tenantId_status_idx" ON "treatment_journeys"("tenantId", "status");

-- CreateIndex
CREATE INDEX "treatment_stages_tenantId_journeyId_idx" ON "treatment_stages"("tenantId", "journeyId");

-- CreateIndex
CREATE INDEX "treatment_stages_tenantId_status_idx" ON "treatment_stages"("tenantId", "status");

-- CreateIndex
CREATE INDEX "appointments_tenantId_patientId_idx" ON "appointments"("tenantId", "patientId");

-- CreateIndex
CREATE INDEX "appointments_tenantId_scheduledStart_idx" ON "appointments"("tenantId", "scheduledStart");

-- CreateIndex
CREATE INDEX "follow_ups_tenantId_status_triggerAt_idx" ON "follow_ups"("tenantId", "status", "triggerAt");

-- CreateIndex
CREATE INDEX "recall_lists_tenantId_status_recallDate_idx" ON "recall_lists"("tenantId", "status", "recallDate");

-- CreateIndex
CREATE INDEX "payments_tenantId_journeyId_idx" ON "payments"("tenantId", "journeyId");

-- CreateIndex
CREATE INDEX "whatsapp_messages_tenantId_patientId_idx" ON "whatsapp_messages"("tenantId", "patientId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_razorpaySubId_key" ON "subscriptions"("razorpaySubId");

-- CreateIndex
CREATE INDEX "subscriptions_tenantId_idx" ON "subscriptions"("tenantId");

-- CreateIndex
CREATE INDEX "audit_logs_tenantId_entityType_entityId_idx" ON "audit_logs"("tenantId", "entityType", "entityId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_templates" ADD CONSTRAINT "treatment_templates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_stages" ADD CONSTRAINT "template_stages_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "treatment_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_journeys" ADD CONSTRAINT "treatment_journeys_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_journeys" ADD CONSTRAINT "treatment_journeys_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_journeys" ADD CONSTRAINT "treatment_journeys_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "treatment_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_journeys" ADD CONSTRAINT "treatment_journeys_currentStageId_fkey" FOREIGN KEY ("currentStageId") REFERENCES "treatment_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_stages" ADD CONSTRAINT "treatment_stages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_stages" ADD CONSTRAINT "treatment_stages_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "treatment_journeys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_stages" ADD CONSTRAINT "treatment_stages_templateStageId_fkey" FOREIGN KEY ("templateStageId") REFERENCES "template_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_treatmentStageId_fkey" FOREIGN KEY ("treatmentStageId") REFERENCES "treatment_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "treatment_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recall_lists" ADD CONSTRAINT "recall_lists_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recall_lists" ADD CONSTRAINT "recall_lists_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "treatment_journeys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
