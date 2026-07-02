# STAGE 40 — First Clinic Launch Playbook

**Subject:** Founder's Operational Onboarding Guide
**Target Audience:** SaaS Founders / Customer Success Leads

Acquiring and onboarding the first paying clinic is the most critical milestone for the DentalFlow SaaS. This playbook outlines the high-touch operational procedures required to ensure the "Zero to One" launch is a massive success.

---

## 1. Clinic Onboarding Workflow (Day 0)

The goal of the onboarding call is to configure the software while the clinic owner is present, establishing immediate trust.

1.  **Account Creation**: Walk the Clinic Owner through `app.dentalflow.com/register`. Have them use their primary admin email.
2.  **Clinic Provisioning**: Instruct them to enter the Clinic Name, Primary Phone Number, and physical address.
3.  **Staff Invitations**: Have the Owner navigate to `Settings > Staff` and send invites to the Head Receptionist and at least one primary Doctor. Ensure the Receptionist receives the `FRONT_DESK` role.
4.  **Hardware Check**: Ensure the clinic's front-desk computer has a modern browser (Chrome/Edge) installed and that the internet connection is stable.

---

## 2. Data Migration Workflow (Day 1)

Most clinics are migrating from legacy desktop software or paper ledgers. This process must be handled with extreme care to avoid disrupting their schedule.

1.  **Export Legacy Data**: Request a `.csv` export of their existing Patient List and upcoming Appointments from their old software.
2.  **Format Standardization**: As the Founder, manually clean their CSV to match the DentalFlow Prisma Schema (`Name`, `Phone`, `Email`, `DOB`). 
3.  **Data Import**: If a bulk-upload tool is not yet built into the UI, manually execute a bulk Prisma seed script against the production database to inject their patients into their specific `tenantId`.
4.  **Verification**: Have the Head Receptionist log in and randomly search for 5 active patients to verify data integrity.

---

## 3. WhatsApp Setup Workflow (Day 2)

DentalFlow's primary value proposition is automated WhatsApp communication. This requires compliance with Meta's Business API policies.

1.  **Business Verification**: Assist the Clinic Owner in submitting their Business Registration documents to the Meta Business Portal to get their WhatsApp Business Account verified.
2.  **Number Porting**: If they are using an existing WhatsApp number, help them delete the standard WhatsApp app from their phone to free up the number for the API.
3.  **Template Approval**: Submit the 3 core Message Templates for Meta approval:
    *   *Appointment Reminder*
    *   *Follow-Up Check-in*
    *   *No-Show Reschedule*
4.  **Token Injection**: Once approved, take the generated `WHATSAPP_ACCESS_TOKEN` and input it into their Clinic Settings.

---

## 4. User Training Workflow (Day 3)

Software is only useful if the staff knows how to use it. Focus training entirely on the Head Receptionist, as they will champion the software to the rest of the clinic.

1.  **The Core Loop**: Teach the Receptionist the "Golden Path":
    *   Create a Patient -> Schedule an Appointment -> Move the Journey Stage to "Completed".
2.  **The WhatsApp Magic**: Show them how marking an appointment as "Completed" automatically triggers the Follow-Up Queue. This is the "Aha!" moment.
3.  **Doctor Training**: Keep it under 5 minutes. Show the Doctors how to view their daily schedule on their mobile phones and how to upload an X-Ray PDF to a patient's file.

---

## 5. Billing Activation Workflow (Day 5)

Do not ask for payment on Day 0. Let them experience the software for a few days to build dependency.

1.  **The Pitch**: Once the Receptionist praises the automated WhatsApp reminders, jump on a quick call with the Owner.
2.  **Razorpay Link**: Instruct the Owner to navigate to `Settings > Billing` and click "Subscribe".
3.  **Credit Card Entry**: They will enter their card via the secure Razorpay popup.
4.  **Verification**: Refresh the internal SaaS Admin Panel to verify the Razorpay Webhook successfully fired and updated their `Tenant.status` to `ACTIVE`.

---

## 6. First Week Support Plan (Days 5 - 12)

The first week will surface edge cases and user-error bugs. You must provide "White-Glove" concierge support.

*   **The WhatsApp Group**: Create a dedicated WhatsApp group named "DentalFlow x [Clinic Name] Support". Include yourself, the Owner, and the Head Receptionist.
*   **Response SLA**: Commit to a 5-minute response time for the first 7 days. If a bug occurs, manually fix the database record immediately while you patch the codebase overnight.
*   **Daily Check-ins**: At 5:00 PM every day, send a message: *"How did the calendar run today? Any issues with the automated reminders?"*

---

## 7. Success Metrics (Day 30)

After 30 days, schedule a formal "Business Review" call with the Owner to present the ROI of DentalFlow. 

Present these three metrics from the Analytics Dashboard:
1.  **No-Show Reduction**: *"Last month you had 15 no-shows. This month, because of our automated WhatsApp reminders, you only had 3. At ₹2000 per appointment, we just saved you ₹24,000."*
2.  **Follow-Up Conversions**: *"The system automatically reached out to 40 patients for their 6-month checkups. 12 of them clicked the link and booked. That's ₹24,000 in generated revenue."*
3.  **Receptionist Hours Saved**: *"Your front desk used to spend 2 hours a day manually texting patients. That is now 0 hours."*

If the Owner agrees with these metrics, immediately ask for a testimonial and a referral to another dental clinic.
