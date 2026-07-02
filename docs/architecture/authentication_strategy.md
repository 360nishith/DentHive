# Final Authentication Strategy

**Decision Context:** 
Previous documentation contained ambiguous references to both "Supabase Auth" and "NestJS JWT Auth," causing confusion about where the source of truth for identity lives. 

This document formally resolves that conflict.

---

## 1. The Chosen Architecture: Supabase Auth (As the Identity Provider)

We will use **Supabase Auth** as the sole Identity Provider (IdP) for DentalFlow.

However, the confusion stems from the fact that we *still* use a NestJS JWT Guard. The critical distinction is the role each system plays:
1.  **Supabase:** The *Issuer*. It handles the login screen, checks passwords, issues the JWT, and manages token rotation.
2.  **NestJS:** The *Verifier* (Resource Server). It does *not* create tokens or check passwords. It simply receives the JWT from the frontend, mathematically verifies the signature using the Supabase public secret, and grants access to the API.

---

## 2. Why Supabase Auth for a Solo Founder?

A solo founder must brutally prioritize features that deliver business value (like the WhatsApp engine and Treatment Journeys). Building an authentication system from scratch is a massive distraction.

**By choosing Supabase Auth, you instantly get:**
*   **Out-of-the-box features:** Magic Links, Password Resets, Email Verification, and Multi-Factor Authentication (MFA).
*   **Zero Email Infrastructure:** You don't have to configure SendGrid or AWS SES to send "Forgot Password" emails; Supabase handles the SMTP layer.
*   **Security:** Cryptographically secure password hashing (Argon2/Bcrypt) managed by a dedicated security team, shifting liability away from you.

---

## 3. The User Workflow

1.  A dentist visits `dentalflow.co/login`.
2.  The Next.js frontend sends the email/password directly to Supabase via the Supabase Client SDK.
3.  Supabase verifies the credentials and returns a secure JWT (which contains the user's `UUID` and their `tenantId` in the `app_metadata`).
4.  The Next.js frontend stores this JWT securely.
5.  When the frontend needs to fetch a list of Patients, it sends a request to the NestJS Backend: `GET /patients` with `Authorization: Bearer <Supabase-JWT>`.
6.  The NestJS `JwtAuthGuard` verifies the token signature. If valid, the request proceeds.

---

## 4. Tradeoffs

| Advantage | Disadvantage |
| :--- | :--- |
| **Speed to Market:** Saves ~2 weeks of building custom Auth flows. | **Vendor Lock-in:** Moving away from Supabase later requires migrating user password hashes. |
| **Maintenance:** Zero maintenance for refresh tokens and session hijacking. | **Data Duplication:** User data (Email/Password) lives in Supabase's internal auth schema, while Business data (Name/Role) lives in your Prisma `User` table. You must keep them synced. |
| **Compliance:** HIPAA/SOC2 compliance is easier when identity is managed by an audited third party. | **Customization Limits:** Modifying the exact claims inside the JWT requires Supabase Webhooks or custom Postgres triggers. |

---

## 5. Long-Term Scalability

Supabase Auth is built on top of GoTrue (an open-source identity engine originally built by Netlify). 

*   **Scalability:** It can easily scale to millions of users. For DentalFlow (a B2B SaaS where even 5,000 clinics might only equal 25,000 users), Supabase will comfortably handle the load indefinitely.
*   **Enterprise Readiness:** When clinics eventually demand Single Sign-On (SSO) or SAML (e.g., a corporate hospital network wants to log in using Microsoft Azure AD), Supabase supports enterprise SSO out of the box. Rolling your own SAML integration in NestJS would take months of complex engineering. 

**Verdict:** Supabase Auth is the absolute best choice for a fast, secure, and scalable launch.
