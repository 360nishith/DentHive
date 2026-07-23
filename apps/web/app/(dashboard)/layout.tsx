'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { Sidebar } from '../../components/layout/Sidebar';
import { Topbar } from '../../components/layout/Topbar';
import { ProductTour } from '../../components/layout/ProductTour';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

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
