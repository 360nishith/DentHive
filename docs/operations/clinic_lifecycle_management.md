# Playbook: Clinic Lifecycle Management

This playbook defines the standard operating procedures for the internal administration team to manage a clinic's journey on the DentalFlow SaaS platform.

---

## 1. Onboarding & Setup

When a new clinic signs a contract, follow these steps to provision their environment.

### Step 1: Provision the Tenant
1. Access the internal Super Admin dashboard.
2. Navigate to **Tenants** > **Create New Tenant**.
3. Input the clinic's legal name and desired subdomain (e.g., `dr-shenoy`).
4. Click **Provision**. 
   * *Behind the scenes: The system creates the `Tenant` record, ensuring the subdomain is unique.*

### Step 2: Configure the Primary Admin (Dentist)
1. In the Tenant profile, navigate to **Users** > **Add User**.
2. Enter the principal dentist's Name, Phone Number, and Email.
3. Assign the Role: `DENTIST`.
4. Click **Generate Welcome Link**.
5. Send the secure link to the dentist via WhatsApp/Email. The dentist will use this link to set their password and log in for the first time.

---

## 2. Subscription Activation

DentalFlow operates on a prepaid SaaS model via Razorpay.

### Step 1: Link Subscription
1. Once the clinic completes their initial payment via the Razorpay payment link, a webhook is fired to `POST /webhooks/razorpay`.
2. Verify in the Super Admin dashboard that the `Subscription` record has been created for the `Tenant`.
3. The status should reflect `ACTIVE` with the correct `planTier` (e.g., `GROWTH`) and `currentPeriodEnd`.

---

## 3. Clinic Suspension

Suspensions can occur due to unpaid SaaS invoices or policy violations.

### Automated Suspension (Billing)
*   If a Razorpay subscription renewal fails, the Razorpay webhook will automatically update the `Subscription` status to `PAST_DUE`.
*   A Cron Job runs nightly. If `currentPeriodEnd` has passed and status is `PAST_DUE`, the system automatically soft-deletes the active `Subscription` and flags the `Tenant` as restricted. The clinic can only log in to view the billing page to update their card.

### Manual Suspension (Policy Violation)
1. Access the Super Admin dashboard.
2. Locate the specific `Tenant`.
3. Click **Suspend Tenant**.
4. Select the reason from the dropdown (e.g., *Spamming WhatsApp API, Legal Request*).
5. Confirm. 
   * *Behind the scenes: The system sets `deletedAt = now()` on the `Tenant`. Due to the Prisma Client Extension, all user logins and API requests for this tenant will immediately return `404 Not Found` or `401 Unauthorized`.*

---

## 4. Clinic Reactivation

To restore a manually or automatically suspended clinic:

1. Access the Super Admin dashboard.
2. Filter the Tenants list by `Status: Suspended`.
3. Locate the `Tenant` and click **Reactivate**.
4. Confirm.
   * *Behind the scenes: The system sets `deletedAt = null` on the `Tenant` and their associated `Subscription`.*
5. Send an automated notification to the primary `DENTIST` user that their access has been restored.
