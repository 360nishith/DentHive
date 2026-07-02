# Week 5: Billing, Revenue Recovery & Launch

**Goal:** Implement the clinic's internal payment collection (UPI QR), set up the SaaS billing infrastructure (Razorpay), and deploy the application to production.

## 1. Tasks
*   Implement `BillingModule` for the clinic's internal patients.
*   Integrate a dynamic UPI QR code generator (`upi://pay?pa=...`) on the frontend modal.
*   Implement the SaaS Admin module to handle Razorpay subscription webhooks (`SubscriptionActivated`, `SubscriptionHalted`).
*   Configure CI/CD pipelines (GitHub Actions).
*   Deploy the Next.js frontend to Vercel.
*   Deploy the NestJS backend and BullMQ workers to Render/Railway.
*   Configure the production domain (`dentalflow.co`) and wildcard SSL (`*.dentalflow.co`).

## 2. Files to Create/Modify
*   `apps/api/src/billing/*`
*   `apps/api/src/saas/razorpay.service.ts`
*   `apps/api/src/saas/saas-webhook.controller.ts`
*   `.github/workflows/deploy.yml`
*   `apps/web/src/features/billing/components/PaymentCollectionModal.tsx`

## 3. APIs to Build
*   `POST /billing/payments` (Records a patient's payment).
*   `POST /webhooks/razorpay` (Public endpoint for SaaS subscription status updates).

## 4. Database Tables Touched
*   `Payment` (Clinic's internal revenue).
*   `Subscription` (SaaS billing table).
*   `Tenant` (Update restriction status based on SaaS payments).

## 5. Frontend Pages
*   `/revenue` (Revenue Recovery list).
*   `/settings/billing` (Clinic's SaaS subscription portal).

## 6. Testing Requirements
*   **Unit:** Test the UPI string builder logic (ensure `amount` and `merchantName` are correctly formatted).
*   **Integration:** Use Razorpay Test Mode to simulate a failed subscription renewal and verify that the `Tenant` is successfully restricted by the cron job.
*   **UAT:** Conduct a full end-to-end walkthrough on the production URL (`https://demo.dentalflow.co`) mimicking a dentist's full day.
