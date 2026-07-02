# State Management Architecture

DentalFlow enforces a strict separation between **Server State** (data living in the PostgreSQL database) and **Client State** (ephemeral UI data like active tabs, sidebar toggles, and theme).

---

## 1. Server State: React Query (TanStack Query)

We use React Query to fetch, cache, synchronize, and update server state. It completely eliminates the need to store API responses in Redux or Zustand.

### 1.1. Query Key Taxonomy
To ensure caches do not leak across users or tenants, every query key must strictly include the `tenantId` (extracted from the session/subdomain) as its first element.

```typescript
// Query Key Patterns
const keys = {
  all: [tenantId] as const,
  patients: [tenantId, 'patients'] as const,
  patientDetails: (id: string) => [...keys.patients, id] as const,
  activeJourneys: [tenantId, 'journeys', 'active'] as const,
};
```

### 1.2. Optimistic Updates
For critical actions that the dentist takes quickly (e.g., marking an appointment as `CHECKED_IN`), the UI must feel instantaneous.

*   When a `useMutation` is fired, React Query instantly updates the local cache for the affected entity, changing the UI state before the server responds.
*   If the server responds with a `4xx` or `5xx` error, React Query rolls back the cache to its previous state and fires an error `Toast`.

---

## 2. Client State: Zustand

Zustand is used as the global state manager strictly for UI and user preferences. No API data should ever live in a Zustand store.

### 2.1. The App Store
A single, modularized Zustand store manages the core application shell.

```typescript
import { create } from 'zustand';

interface AppState {
  // Sidebar State
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  
  // Ephemeral Context
  lastViewedPatientId: string | null;
  setLastViewedPatient: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  
  lastViewedPatientId: null,
  setLastViewedPatient: (id) => set({ lastViewedPatientId: id }),
}));
```

### 2.2. Contextual UI State
For complex, isolated UI features (like a multi-step form inside a Modal), we avoid throwing that state into the global Zustand store. Instead, we use standard React `useState` or `useReducer` scoped purely to that component to prevent memory leaks and unnecessary global re-renders.

---

## 3. Theme State (next-themes)

Handling Dark/Light mode is delegated entirely to the `next-themes` provider, which interacts with Tailwind's `dark:` classes.

*   The theme is stored in `localStorage` by default.
*   It operates independently of Zustand.
