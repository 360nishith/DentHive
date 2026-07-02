# Treatment & Patient Management API

This module contains the core clinical operations, managing the patient lifecycle and their progression through Treatment Journeys.

---

## 1. Patient Endpoints

### `POST /patients`
Registers a new patient.

*   **Security:** Bearer Token.
*   **Request DTO (`CreatePatientDto`):**
    ```typescript
    {
      @IsString() @IsNotEmpty() name: string;
      @IsPhoneNumber('IN') phoneNumber: string; // Fails if not a valid Indian number
      @IsBoolean() @IsOptional() whatsappOptIn?: boolean;
      @IsEnum(['MALE', 'FEMALE', 'OTHER']) @IsOptional() gender?: string;
      @IsDateString() @IsOptional() dateOfBirth?: string;
      @IsString() @IsOptional() preferredLanguage?: string; // e.g., 'en', 'kn'
    }
    ```
*   **Validation Rules:**
    *   `409 Conflict` if `phoneNumber` already exists for this `tenantId`.

### `GET /patients`
Returns a paginated list of patients.

*   **Security:** Bearer Token.
*   **Query Parameters:** `?page=1&limit=20&search=9845`
*   **Response:** Paginated success envelope.

### `GET /patients/:id`
Returns full patient profile including active journeys and upcoming appointments.

---

## 2. Treatment Template Endpoints

### `GET /templates`
Retrieves all available clinical blueprints configured by the clinic.

*   **Security:** Bearer Token.
*   **Response (`200 OK`):**
    ```json
    {
      "data": [
        {
          "id": "uuid",
          "name": "Root Canal + Crown",
          "estimatedCost": 15000,
          "stages": [
            { "id": "uuid", "sequenceOrder": 1, "name": "Obturation" },
            { "id": "uuid", "sequenceOrder": 2, "name": "Crown Prep" }
          ]
        }
      ]
    }
    ```

---

## 3. Treatment Journey Endpoints

### `POST /patients/:patientId/journeys`
Starts a new treatment journey for a patient by instantiating a template.

*   **Security:** Bearer Token.
*   **Request DTO (`StartJourneyDto`):**
    ```typescript
    {
      @IsUUID() templateId: string;
      @IsNumber() @IsOptional() customTotalCost?: number; // Overrides template default
    }
    ```
*   **Response (`201 Created`):**
    *   Creates the `TreatmentJourney`.
    *   Bulk creates all `TreatmentStage` rows based on the template.
    *   Sets `currentStageId` to the first stage.
    *   Returns the initialized Journey object.

### `GET /journeys/active`
Retrieves all currently active or stalled journeys for the clinic dashboard.

*   **Query Parameters:** `?status=STALLED` (Filter to find patients who need nudging).

---

## 4. Stage Execution Endpoints

### `POST /journeys/:journeyId/stages/:stageId/complete`
The most critical endpoint. Marks a clinical stage as completed, automatically moving the journey forward and triggering the Event Bus for WhatsApp post-op nudges.

*   **Security:** Bearer Token.
*   **Request DTO (`CompleteStageDto`):**
    ```typescript
    {
      // Optionally record a payment at the exact moment of stage completion
      @IsOptional()
      @ValidateNested()
      @Type(() => RecordStagePaymentDto)
      payment?: RecordStagePaymentDto;
    }
    ```
*   **Business Logic / Validation:**
    *   `400 Bad Request` if the stage is not the `currentStageId` of the journey.
    *   `404 Not Found` if `stageId` doesn't belong to `tenantId`.
    *   If this is the final stage, the Journey status changes to `COMPLETED`.
    *   **Emits:** `StageCompletedEvent`.

---

## 5. Appointment Endpoints

### `POST /appointments`
Schedules an appointment strictly linked to a specific treatment stage.

*   **Security:** Bearer Token.
*   **Request DTO (`CreateAppointmentDto`):**
    ```typescript
    {
      @IsUUID() patientId: string;
      @IsUUID() treatmentStageId: string;
      @IsDateString() scheduledStart: string;
      @IsDateString() scheduledEnd: string;
    }
    ```
*   **Validation Rules:**
    *   `409 Conflict` if the requested time slot overlaps with an existing `SCHEDULED` or `CONFIRMED` appointment for this tenant.
    *   `400 Bad Request` if the `treatmentStageId` is already marked `COMPLETED`.
