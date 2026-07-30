'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { Sidebar } from '../../components/layout/Sidebar';
import { Topbar } from '../../components/layout/Topbar';
import dynamic from 'next/dynamic';
import { Loader2, AlertCircle } from 'lucide-react';
import api from '../../lib/axios';

const ProductTour = dynamic(() => import('../../components/layout/ProductTour').then(mod => mod.ProductTour), { ssr: false });


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const checkAuth = async (retries = 3) => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        // If there's an error (like a network failure on wake), retry after a short delay
        if (error && retries > 0) {
          setTimeout(() => {
            if (isMounted) checkAuth(retries - 1);
          }, 2000);
          return;
        }

        if (!data.session) {
          router.push('/login');
          return;
        }
        
        const tenantId = data.session.user?.app_metadata?.tenantId;
        if (!tenantId) {
          router.push('/onboarding');
          return;
        }
        
        try {
          const [userRes, tenantRes] = await Promise.all([
            api.get('/users/me'),
            api.get('/tenant')
          ]);
          
          const role = data.session.user?.app_metadata?.role;
          
          if (userRes.data?.status === 'ARREARS_PENDING') {
            setIsBlocked(true);
          } else if (tenantRes.data?.status === 'READ_ONLY' && role !== 'ADMIN') {
            setIsBlocked(true);
          } else if ((tenantRes.data?.status === 'PAST_DUE' || tenantRes.data?.status === 'SUSPENDED') && role !== 'ADMIN') {
            setIsBlocked(true);
          } else if ((tenantRes.data?.status === 'PAST_DUE' || tenantRes.data?.status === 'SUSPENDED') && role === 'ADMIN') {
            if (window.location.pathname !== '/settings') {
              router.push('/settings');
            }
          }
        } catch (e) {
          console.error("Failed to fetch profile or tenant status", e);
        }

        setLoading(false);
      } catch (err) {
        if (retries > 0) {
          setTimeout(() => {
            if (isMounted) checkAuth(retries - 1);
          }, 2000);
        } else {
          router.push('/login');
        }
      }
    };
    
    checkAuth();
    
    return () => {
      isMounted = false;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-red-100 overflow-hidden">
          <div className="bg-red-600 p-6 flex flex-col items-center justify-center text-white">
            <AlertCircle className="w-12 h-12 mb-4 opacity-90" />
            <h2 className="text-xl font-bold text-center">Account Pending Activation</h2>
          </div>
          <div className="p-8 text-center">
            <p className="text-slate-600 mb-6 leading-relaxed">
              Your account has been added to the clinic successfully, but it is currently locked pending payment of arrears by the clinic administrator.
            </p>
            <p className="text-sm font-medium text-slate-900 bg-slate-50 p-4 rounded-lg">
              Please contact your clinic owner or administrator to complete the payment via the Settings dashboard.
            </p>
            <div className="mt-8 pt-6 border-t border-slate-100">
              <button 
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.push('/login');
                }}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
      <ProductTour />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
