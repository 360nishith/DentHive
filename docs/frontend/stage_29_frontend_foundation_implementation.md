# STAGE 29 — Frontend Foundation Implementation

**Subject:** Scalable Next.js Client Architecture
**Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Zustand, React Query, Supabase Auth
**Core Features:** Centralized State Management, API Interceptors, Route Protection Middleware, Provider Wrapping.

---

## Folder Structure
```text
apps/web/
├── src/
│   ├── app/                    
│   │   ├── (auth)/             
│   │   ├── (dashboard)/        
│   │   │   └── layout.tsx
│   │   ├── layout.tsx          
│   │   └── middleware.ts       
│   ├── components/
│   │   ├── layouts/            
│   │   │   └── sidebar.tsx
│   │   └── providers/          
│   │       └── query-provider.tsx
│   ├── lib/
│   │   ├── api/                
│   │   │   └── axios.ts
│   │   ├── store/              
│   │   │   └── auth-store.ts
│   │   └── supabase/           
│   │       └── client.ts
│   └── types/                  
│       └── globals.d.ts
├── tailwind.config.ts
└── package.json
```

---

## 1. Global Configurations & Providers

### `apps/web/tailwind.config.ts`
```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        dental: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          500: '#14b8a6', // Primary Brand Color
          900: '#134e4a',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)'],
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
export default config;
```
*   **Purpose:** Establishes the design system tokens.
*   **Architecture considerations:** Custom color palette (`dental`) prevents reliance on generic Tailwind blues, promoting a unified brand identity. The `@tailwindcss/forms` plugin is mandated to quickly normalize input field styling.

### `apps/web/src/components/providers/query-provider.tsx`
```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // Data is fresh for 5 minutes
            refetchOnWindowFocus: false, // Prevent aggressive re-fetching on tab switch
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```
*   **Purpose:** Instantiates the React Query cache strictly on the client side.
*   **Architecture considerations:** `staleTime` is set to 5 minutes to prevent hammering the NestJS API. By using `useState`, we ensure the `QueryClient` is only created once per user session, avoiding cache resets on Next.js hydration.

### `apps/web/src/app/layout.tsx`
```typescript
import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import QueryProvider from '@/components/providers/query-provider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'DentalFlow SaaS',
  description: 'Next-Generation Dental Practice Management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-gray-50 text-gray-900 antialiased">
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
```
*   **Purpose:** The global Next.js App Router boundary.
*   **Architecture considerations:** Wraps the entire application in the `QueryProvider`, ensuring Server Components (`page.tsx`) can seamlessly hydrate Client Components (`'use client'`) without breaking context boundaries.

---

## 2. Authentication & State

### `apps/web/src/lib/supabase/client.ts`
```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```
*   **Purpose:** Standardizes Supabase initialization.
*   **Architecture considerations:** Uses `@supabase/ssr` instead of the legacy `@supabase/supabase-js` to ensure cookies synchronize correctly between Next.js Server Actions, Middleware, and Client Components.

### `apps/web/src/lib/store/auth-store.ts`
```typescript
import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  tenantId: string | null;
  isInitialized: boolean;
  setAuth: (session: Session | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  tenantId: null,
  isInitialized: false,
  setAuth: (session) => {
    // Extract tenantId from JWT app_metadata securely injected by Supabase
    const tenantId = session?.user?.app_metadata?.tenantId || null;
    set({ session, user: session?.user || null, tenantId, isInitialized: true });
  },
  clearAuth: () => set({ session: null, user: null, tenantId: null, isInitialized: true }),
}));
```
*   **Purpose:** Global memory store to instantly access authentication data across deeply nested React components without prop-drilling.
*   **Architecture considerations:** We extract the `tenantId` directly from the Supabase JWT `app_metadata`. This maps perfectly to our NestJS backend, which extracts that exact same claim to power `AsyncLocalStorage`.

---

## 3. API Layer

### `apps/web/src/lib/api/axios.ts`
```typescript
import axios from 'axios';
import { createClient } from '../supabase/client';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Automatically attach the Supabase JWT
apiClient.interceptors.request.use(
  async (config) => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Global Error Handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid; trigger global logout logic
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```
*   **Purpose:** Abstracted HTTP client for all communications with the NestJS API.
*   **Architecture considerations:** The interceptor inherently guarantees that the `Authorization` header is attached to every single outbound request. The developer *never* has to manually fetch or pass tokens inside their React Query hooks.

---

## 4. Route Protection

### `apps/web/src/middleware.ts`
```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login');
  
  // Enforce Protection: Redirect unauthenticated users away from the dashboard
  if (!session && !isAuthRoute && !request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Prevent authenticated users from seeing the login screen
  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'], // Exclude static files
};
```
*   **Purpose:** Next.js Edge Middleware for absolute route security.
*   **Architecture considerations:** Runs at the edge *before* React begins rendering. It verifies the Supabase session cookies. If missing, the request is instantly HTTP `302` redirected to `/login`, physically preventing Flash-Of-Unauthenticated-Content (FOUC).

---

## 5. Dashboard Layout Structure

### `apps/web/src/app/(dashboard)/layout.tsx`
```typescript
import { Sidebar } from '@/components/layouts/sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Persistent Sidebar Navigation */}
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Dynamic Header can go here */}
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```
*   **Purpose:** The standard SaaS shell layout for the application.
*   **Architecture considerations:** Next.js uses Route Groups `(dashboard)` to logically group protected pages (`/dashboard`, `/patients`, `/calendar`) under a single shared layout without injecting `/dashboard` into the actual URL string if undesired. The `h-screen overflow-hidden` combination ensures the sidebar is fixed while the `main` tag handles internal scrolling.
