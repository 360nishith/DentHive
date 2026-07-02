# Week 2: Core Domain Models

**Goal:** Build the clinical heart of the application. The system must be able to register patients, start Treatment Journeys, advance stages, and schedule appointments.

## 1. Tasks
*   Implement `PatientsModule` (CRUD, Search).
*   Implement `TreatmentsModule` (Seed standard `TreatmentTemplates`).
*   Build the engine to generate `TreatmentStages` from a Template when a Journey is started.
*   Implement `AppointmentsModule` (Scheduling, Check-in status).
*   Add basic controllers/resolvers to expose these to the frontend.

## 2. Files to Create/Modify
*   `apps/api/src/patients/*` (Controller, Service, DTOs)
*   `apps/api/src/treatments/*`
*   `apps/api/src/appointments/*`
*   `apps/api/src/common/filters/prisma-exception.filter.ts`

## 3. APIs to Build
*   `POST /patients` | `GET /patients?search=Rahul`
*   `POST /treatments/journeys` (Payload: `patientId`, `templateId`)
*   `PATCH /treatments/stages/:id/complete`
*   `POST /appointments`

## 4. Database Tables Touched
*   `Patient`
*   `TreatmentTemplate` / `TreatmentTemplateStage`
*   `TreatmentJourney` / `TreatmentStage`
*   `Appointment`

## 5. Frontend Pages
*   No pages built this week. Use Postman or Swagger to validate the APIs.

## 6. Testing Requirements
*   **Unit:** Test the logic that converts a `TreatmentTemplate` into concrete `TreatmentStage` rows.
*   **E2E:** Flow test: Create Patient -> Start Journey -> Schedule Appointment for Stage 1.
