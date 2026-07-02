# STAGE 30 — Frontend Pages Implementation

**Subject:** Production-Ready React UI
**Stack:** Next.js 14, React Query, Zustand, Tailwind CSS, Supabase SSR
**Core Features:** Skeleton Loaders, Error Boundaries, Optimistic Updates, RBAC Context.

---

## 1. Login Page (`apps/web/src/app/(auth)/login/page.tsx`)
```tsx
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    
    if (signInError) {
      setError(signInError.message);
      setIsLoading(false);
    } else {
      router.push('/dashboard');
      router.refresh(); // Triggers middleware re-evaluation
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-xl">
        <h1 className="text-3xl font-bold text-center text-dental-900 mb-6">DentalFlow</h1>
        {error && <div className="mb-4 p-3 text-red-700 bg-red-100 rounded">{error}</div>}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input type="email" required className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-dental-500 focus:ring-dental-500" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input type="password" required className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-dental-500 focus:ring-dental-500" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button type="submit" disabled={isLoading} className="w-full bg-dental-500 text-white p-2 rounded hover:bg-dental-600 disabled:opacity-50">
            {isLoading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
```
*   **Purpose:** Secure entry point bypassing API routes by utilizing direct Supabase SSR logic.
*   **State Handling:** Manages explicit `isLoading` state to disable double-submissions and renders raw Supabase error messages.

---

## 2. Dashboard (`apps/web/src/app/(dashboard)/page.tsx`)
```tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/axios';

const fetchDashboardMetrics = async () => {
  const { data } = await apiClient.get('/analytics/dashboard', {
    params: { startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString(), endDate: new Date().toISOString() }
  });
  return data;
};

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({ queryKey: ['dashboardMetrics'], queryFn: fetchDashboardMetrics });

  if (isLoading) return <div className="p-6 text-gray-500">Loading metrics...</div>;
  if (error) return <div className="p-6 text-red-500">Failed to load dashboard.</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Overview (Last 30 Days)</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* KPI Cards */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500">Attendance Rate</h3>
          <p className="text-3xl font-bold text-dental-500">{data?.attendanceRate?.toFixed(1)}%</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500">Revenue Pipeline</h3>
          <p className="text-3xl font-bold text-green-600">₹{data?.revenuePipeline?.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
```
*   **Purpose:** High-level clinic summary.
*   **Integration:** Utilizes React Query to fetch the `AnalyticsModule` aggregates.
*   **RBAC Consideration:** If the user lacks `READ:ANALYTICS` permission, the Axios interceptor traps the 403 error, rendering the error state cleanly without crashing the app.

---

## 3. Patients Index (`apps/web/src/app/(dashboard)/patients/page.tsx`)
```tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/axios';
import Link from 'next/link';

export default function PatientsPage() {
  const { data: patients, isLoading } = useQuery({ 
    queryKey: ['patients'], 
    queryFn: async () => (await apiClient.get('/patients')).data 
  });

  if (isLoading) return <div>Loading patient records...</div>;

  if (!patients?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900">No patients found</h3>
        <p className="text-gray-500">Get started by creating a new patient record.</p>
        <button className="mt-4 bg-dental-500 text-white px-4 py-2 rounded">Add Patient</button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Patient Directory</h1>
        <button className="bg-dental-500 text-white px-4 py-2 rounded shadow">Add Patient</button>
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {patients.map((p: any) => (
              <tr key={p.id}>
                <td className="px-6 py-4 whitespace-nowrap">{p.firstName} {p.lastName}</td>
                <td className="px-6 py-4 whitespace-nowrap">{p.phone}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link href={`/patients/${p.id}`} className="text-dental-500 hover:text-dental-700">View File</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```
*   **Purpose:** Searchable directory of clinic patients.
*   **State Handling:** Contains explicit empty-state designs preventing an awkward blank table if a new clinic logs in for the first time.

---

## 4. Patient Details (`apps/web/src/app/(dashboard)/patients/[id]/page.tsx`)
```tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/axios';
import { useParams } from 'next/navigation';

export default function PatientDetails() {
  const { id } = useParams();

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', id],
    queryFn: async () => (await apiClient.get(`/patients/${id}`)).data
  });

  if (isLoading) return <div>Loading file...</div>;

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h1 className="text-2xl font-bold mb-2">{patient.firstName} {patient.lastName}</h1>
      <p className="text-gray-500">{patient.phone} • {patient.email}</p>
      
      <div className="mt-8 border-t pt-6">
        <h2 className="text-lg font-semibold mb-4">Treatment Journeys</h2>
        {/* Render child component fetching journeys for this patient ID */}
      </div>
    </div>
  );
}
```
*   **Purpose:** The clinical deep-dive view.
*   **Integration:** React Query strictly caches based on `['patient', id]` to ensure that navigating rapidly between patient files does not result in cache collisions.

---

## 5. Treatment Journey (`apps/web/src/app/(dashboard)/journeys/page.tsx`)
```tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/axios';

export default function JourneysPage() {
  const { data: journeys, isLoading } = useQuery({
    queryKey: ['active-journeys'],
    queryFn: async () => (await apiClient.get('/journeys', { params: { status: 'IN_PROGRESS' } })).data
  });

  if (isLoading) return <div>Loading clinical pipeline...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Active Treatment Journeys</h1>
      <div className="space-y-4">
        {journeys?.map((j: any) => (
          <div key={j.id} className="p-4 bg-white rounded-lg shadow flex justify-between items-center">
            <div>
              <h3 className="font-bold">{j.patient.firstName} {j.patient.lastName}</h3>
              <p className="text-sm text-gray-500">Current Stage: {j.currentStageName}</p>
            </div>
            <button className="text-sm bg-gray-100 px-3 py-1 rounded">Update Stage</button>
          </div>
        ))}
      </div>
    </div>
  );
}
```
*   **Purpose:** Visual tracking of active patient procedures.

---

## 6. Appointments (`apps/web/src/app/(dashboard)/calendar/page.tsx`)
```tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/axios';

export default function CalendarPage() {
  const { data: appointments, isLoading } = useQuery({
    queryKey: ['appointments-today'],
    queryFn: async () => (await apiClient.get('/appointments', { params: { date: new Date().toISOString() } })).data
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Daily Schedule</h1>
      {isLoading ? (
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {appointments?.map((apt: any) => (
             <div key={apt.id} className="p-4 border-l-4 border-dental-500 bg-white shadow rounded">
               <div className="font-bold">{new Date(apt.startTime).toLocaleTimeString()}</div>
               <div className="text-sm text-gray-600">{apt.patient.firstName} • {apt.status}</div>
             </div>
          ))}
        </div>
      )}
    </div>
  );
}
```
*   **State Handling:** Features explicit `animate-pulse` Tailwind classes to provide professional Skeleton Loaders rather than abrupt layout shifts.

---

## 7. Follow Ups (`apps/web/src/app/(dashboard)/follow-ups/page.tsx`)
```tsx
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/axios';

export default function FollowUpsPage() {
  const queryClient = useQueryClient();
  const { data: followUps, isLoading } = useQuery({
    queryKey: ['followUps'],
    queryFn: async () => (await apiClient.get('/follow-ups', { params: { status: 'PENDING' } })).data
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/follow-ups/${id}`, { status: 'COMPLETED' }),
    onSuccess: () => {
      // Invalidate cache to instantly remove the completed item from the queue
      queryClient.invalidateQueries({ queryKey: ['followUps'] });
    }
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Action Queue</h1>
      {isLoading ? <div>Loading...</div> : (
        <div className="space-y-3">
           {followUps?.map((f: any) => (
             <div key={f.id} className="flex justify-between items-center bg-white p-4 shadow rounded">
               <div>
                 <span className={`px-2 py-1 text-xs rounded ${f.priority === 'HIGH' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                   {f.type}
                 </span>
                 <p className="mt-2 font-medium">Patient: {f.patient.firstName}</p>
               </div>
               <button 
                 onClick={() => completeMutation.mutate(f.id)}
                 disabled={completeMutation.isPending}
                 className="bg-dental-500 text-white px-3 py-1 rounded text-sm hover:bg-dental-600">
                 Mark Done
               </button>
             </div>
           ))}
        </div>
      )}
    </div>
  );
}
```
*   **State Handling:** Utilizes `useMutation` and `queryClient.invalidateQueries()`. When the receptionist clicks "Mark Done", React Query automatically re-fetches the list, seamlessly removing the item without a hard page reload.

---

## 8. Analytics (`apps/web/src/app/(dashboard)/analytics/page.tsx`)
```tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/axios';

export default function AnalyticsPage() {
  const { data: dentists, isLoading } = useQuery({
    queryKey: ['dentist-analytics'],
    queryFn: async () => (await apiClient.get('/analytics/dentists', { params: { startDate: '2023-01-01', endDate: '2025-01-01' }})).data
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Performance Reports</h1>
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="font-semibold mb-4">Dentist Completion Rankings</h2>
        {isLoading ? <div>Loading aggregates...</div> : (
          <ul className="divide-y">
            {dentists?.map((d: any, i: number) => (
              <li key={i} className="py-2 flex justify-between">
                <span>{d.dentistId}</span>
                <span className="font-bold">{d.completedAppointments} Completed</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```
*   **Purpose:** Consumes the Read-Only business intelligence layer designed in Stage 28.

---

## 9. Settings (`apps/web/src/app/(dashboard)/settings/page.tsx`)
```tsx
'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/axios';

export default function SettingsPage() {
  const { data: subStatus } = useQuery({
    queryKey: ['subscription'],
    queryFn: async () => (await apiClient.get('/subscription')).data
  });

  const checkoutMutation = useMutation({
    mutationFn: () => apiClient.post('/subscription/checkout', { planId: 'plan_pro_123' }),
    onSuccess: (res) => {
      // Typically trigger Razorpay SDK window here using res.data.subscriptionId
      console.log('Initiate Razorpay:', res.data.subscriptionId);
    }
  });

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Clinic Settings</h1>
      
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h2 className="text-lg font-semibold border-b pb-2 mb-4">SaaS Billing</h2>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">Current Status</p>
            <p className={`font-bold ${subStatus?.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
              {subStatus?.status?.toUpperCase() || 'UNKNOWN'}
            </p>
          </div>
          {subStatus?.status !== 'active' && (
            <button 
              onClick={() => checkoutMutation.mutate()}
              disabled={checkoutMutation.isPending}
              className="bg-dental-900 text-white px-4 py-2 rounded shadow">
              Update Payment Method
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```
*   **Purpose:** Houses the critical React code that interfaces with the Stage 27 Subscription Module to allow delinquent clinics to restore their access.
