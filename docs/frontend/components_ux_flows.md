# Components & UX Flows

DentalFlow's frontend architecture heavily utilizes **Shadcn UI** primitives styled with **Tailwind CSS**. This approach provides accessible, highly customizable components without being locked into an inflexible component library.

---

## 1. Component Hierarchy

### `src/components/ui/` (Shared Primitives)
This directory contains the base, reusable Shadcn components. These are strictly presentational and completely decoupled from business logic or API calls.
*   `button.tsx`, `input.tsx`, `card.tsx`
*   `dialog.tsx` (For center-screen modal popups)
*   `sheet.tsx` (For edge-anchored sliding panels)
*   `data-table.tsx` (TanStack Table integration for patient lists)
*   `form.tsx` (React Hook Form + Zod integrations)

### `src/features/` (Domain-Specific Components)
Following DDD, we isolate complex, business-aware components into feature folders. These components *do* fetch data (via React Query) and mutate state.
*   `src/features/patients/components/PatientList.tsx`
*   `src/features/treatments/components/ActiveJourneyCard.tsx`
*   `src/features/billing/components/PaymentCollectionModal.tsx`

---

## 2. Shadcn Integrations for Critical UX

To maintain a fast, app-like feel, we avoid full-page reloads. We rely heavily on overlapping panels for context-switching.

*   **`Sheet` (Slide-outs):** Used for creating new entities without leaving the current page. For example, clicking "New Patient" opens a `Sheet` from the right side.
*   **`Dialog` (Modals):** Used for critical, blocking actions where the user must focus on a specific task, such as entering a payment amount or confirming a destructive action.
*   **`Toast` (Notifications):** Non-blocking success/error feedback (e.g., "Stage marked complete. WhatsApp nudge sent.").

---

## 3. Core UX Sequence Flows

### Flow A: Completing a Treatment Stage & Payment Collection
*The primary action performed by the Dentist post-treatment.*

1. **Trigger:** User clicks "Mark Complete" on the `ActiveJourneyCard`.
2. **Action:** A Shadcn `Dialog` (Modal) opens.
3. **UI State:** The modal displays two options:
    *   *Option 1:* "Mark complete without payment".
    *   *Option 2:* "Collect Payment now".
4. **Payment Flow:** If the user chooses to collect payment:
    *   They enter the amount.
    *   The component calls `GET /payments/qr` to fetch the dynamic UPI string.
    *   A QR Code (using a library like `react-qr-code`) is rendered live in the modal for the patient to scan.
5. **Commit:** User clicks "Confirm". The `CompleteStageMutation` is fired to the backend, appending the payment payload.
6. **Resolution:** Modal closes, a success `Toast` appears, and React Query invalidates the `['journeys', patientId]` cache, instantly reflecting the updated stage on the UI.

### Flow B: Starting a New Journey
1. **Trigger:** User clicks "Start Treatment" on a Patient Profile.
2. **Action:** A right-anchored Shadcn `Sheet` slides out.
3. **UI State:** Contains a `<form>` mapping to the `StartJourneyDto`.
    *   The user selects a `TreatmentTemplate` from a React Select dropdown.
    *   The form auto-fills the default `totalCost`. The user can override it if necessary.
4. **Commit:** Form submission triggers `StartJourneyMutation`.
5. **Resolution:** Sheet slides away. The new journey appears in the "Active Treatments" lane.
