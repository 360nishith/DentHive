# Playbook: WhatsApp Configuration & Meta API

This playbook outlines the procedure for linking a newly onboarded clinic's phone number to the Meta Cloud API to enable automated messaging.

---

## 1. Meta Business Portfolio Setup

Before a clinic can send automated messages, they must link a dedicated phone number to the DentalFlow Meta App.

### Step 1: Embedded Signup Flow
1. Guide the clinic owner (`DENTIST` role) to the **Settings > Communication** tab in their DentalFlow dashboard.
2. The user clicks **Connect WhatsApp**.
3. A Meta popup appears (Embedded Signup Flow). The user must:
   *   Log in to their Facebook account.
   *   Select or create a Meta Business Portfolio.
   *   Enter the dedicated phone number they wish to use for the clinic.
   *   Verify the number via an OTP sent by Meta.

### Step 2: System Validation
1. Upon successful completion of the Embedded Signup, Meta redirects back to DentalFlow.
2. The `CommunicationModule` captures the `WABA_ID` (WhatsApp Business Account ID) and `Phone_Number_ID`.
3. Verify in the Super Admin dashboard that these credentials have successfully mapped to the `Tenant` record.

---

## 2. Template Submission & Approval

Meta strictly requires all outbound business-initiated messages to use pre-approved templates.

### Step 1: Automated Submission
Once the `Phone_Number_ID` is linked, the DentalFlow system automatically executes an API call to Meta to submit our 8 standard templates (e.g., Appointment Request, Next Visit Reminder) for approval under the clinic's newly created WABA.

### Step 2: Verification of Approval
1. Meta's AI usually approves templates within 2 minutes.
2. Meta fires a webhook to `/webhooks/whatsapp` detailing the status change (`APPROVED`, `REJECTED`, or `PENDING`).
3. If a template is rejected:
   *   Check the Meta Business Manager for the rejection reason (usually formatting or policy violations).
   *   Adjust the template payload internally and trigger a manual resubmission via the Super Admin dashboard.

---

## 3. Webhook Configuration & Routing

To receive delivery receipts (Blue Ticks) and patient replies, the webhook must be configured correctly.

1. Ensure the DentalFlow Meta App is subscribed to the `messages` webhook field.
2. **Crucial:** The single `POST /webhooks/whatsapp` endpoint handles traffic for *all* clinics. 
3. When a webhook arrives, the BullMQ worker must parse the `display_phone_number` or `waba_id` from the payload to determine which `tenantId` the message belongs to before pushing it to the `InboundRoutingService`.
