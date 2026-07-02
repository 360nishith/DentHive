# Routing & Layouts Architecture

DentalFlow utilizes the **Next.js App Router** (`app/` directory) to heavily leverage Server Components (RSC), nested layouts, and route groups for a clean, modular frontend structure.

---

## 1. Directory Structure & Route Groups

We use Next.js Route Groups `(folderName)` to organize sections of the application without affecting the URL path. This allows us to share layouts across specific segments (e.g., all dashboard pages get the sidebar, all auth pages do not).

```text
src/app/
├── layout.tsx                      # RootLayout (Providers, Fonts, Global CSS)
├── page.tsx                        # Marketing / Landing Page
│
├── (auth)/                         # Auth Route Group
│   ├── layout.tsx                  # AuthLayout (Centered card, minimal UI)
│   ├── login/
│   │   └── page.tsx                # /login
│   └── setup/
│       └── page.tsx                # /setup (Initial clinic onboarding)
│
└── (dashboard)/                    # Dashboard Route Group
    ├── layout.tsx                  # DashboardLayout (Sidebar, Top Nav)
    ├── page.tsx                    # / (Dashboard Home - Metrics & Next Visits)
    │
    ├── patients/
    │   ├── page.tsx                # /patients (Patient List & Search)
    │   └── [patientId]/            # Dynamic Route
    │       ├── page.tsx            # /patients/123 (Patient Profile)
    │       └── journeys/
    │           └── [journeyId]/    
    │               └── page.tsx    # /patients/123/journeys/456 (Active Treatment View)
    │
    ├── calendar/
    │   └── page.tsx                # /calendar (Appointment Grid)
    │
    └── settings/
        ├── page.tsx                # /settings (Clinic Settings)
        └── billing/
            └── page.tsx            # /settings/billing (SaaS Upgrades)
```

---

## 2. Layout Boundaries

### `RootLayout` (`app/layout.tsx`)
*   **Purpose:** The absolute top level of the DOM (`<html>`, `<body>`).
*   **Responsibilities:**
    *   Injecting global fonts (e.g., `Inter`).
    *   Wrapping the application in Context Providers:
        *   `QueryClientProvider` (React Query for server state).
        *   `ThemeProvider` (Dark/Light mode via `next-themes`).
        *   `Toaster` (Shadcn UI toast notifications).

### `DashboardLayout` (`app/(dashboard)/layout.tsx`)
*   **Purpose:** The shell for the authenticated clinic application.
*   **Responsibilities:**
    *   Rendering the responsive Side Navigation (desktop sidebar, mobile bottom-bar or hamburger menu).
    *   Fetching the authenticated User and Tenant context on the server side before rendering child pages.
    *   Redirecting to `/login` if no valid session cookie is found.

---

## 3. Subdomain Handling via Next.js Middleware

Because DentalFlow is a multi-tenant SaaS (e.g., `shenoy.dentalflow.in`), we must extract the tenant context before the page renders.

*   **File:** `src/middleware.ts`
*   **Strategy:** 
    1. Intercept the incoming request.
    2. Read the `Host` header.
    3. Extract the subdomain (e.g., `shenoy`).
    4. Rewrite the URL internally (optional, if using specific tenant paths) OR simply pass the subdomain as a custom header `X-Tenant-Subdomain` to the downstream Next.js Server Components and API routes.
    5. Check for auth cookies. If trying to access `/(dashboard)` routes without a token, redirect to `https://[subdomain].dentalflow.in/login`.

```typescript
// Conceptual middleware.ts snippet
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';

  // Extract subdomain (excluding localhost or primary domain)
  const subdomain = hostname.split('.')[0]; 

  // Pass subdomain to headers for Server Components to read
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-subdomain', subdomain);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}
```
