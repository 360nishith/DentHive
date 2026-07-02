# Week 4: Frontend UI & UX Flows

**Goal:** Assemble the Next.js frontend using Shadcn UI. Implement the React Query cache and Zustand state to create a fast, app-like experience.

## 1. Tasks
*   Initialize Shadcn UI and install core primitives (Button, Input, Card, Sheet, Dialog, Toast, Table).
*   Setup React Query `QueryClientProvider` and Zustand `useAppStore`.
*   Build the Dashboard Home (KPIs, Stalled Journeys, Schedule).
*   Build the Patients Directory and individual Patient Details page.
*   Implement the "Start Journey" `Sheet` and the "Complete Stage" `Dialog`.
*   Implement optimistic UI updates in React Query (e.g., ticking off a stage instantly updates the UI before the backend confirms).

## 2. Files to Create/Modify
*   `apps/web/src/components/ui/*` (Shadcn primitives)
*   `apps/web/src/lib/store.ts` (Zustand)
*   `apps/web/src/features/patients/components/*`
*   `apps/web/src/features/treatments/components/*`
*   `apps/web/src/app/(dashboard)/page.tsx`
*   `apps/web/src/app/(dashboard)/patients/[id]/page.tsx`

## 3. APIs to Build
*   The frontend primarily consumes the APIs built in Weeks 1 & 2.
*   New: `GET /dashboard/kpis` (Aggregates revenue and TCR metrics).

## 4. Database Tables Touched
*   N/A (Frontend focus).

## 5. Frontend Pages
*   `/` (Dashboard)
*   `/patients` (Directory)
*   `/patients/:id` (Details)
*   `/appointments` (Calendar)

## 6. Testing Requirements
*   **UI/UX:** Test the responsive design on mobile simulators. Ensure the `Sheet` components slide up smoothly on small screens.
*   **E2E (Playwright/Cypress):** Test the happy path: Login -> Search Patient -> Open Journey -> Click "Complete Stage" -> Ensure Toast appears.
