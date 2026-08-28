'use client';

import React, { useState, useMemo, useEffect } from 'react';
import api from '../../../lib/axios';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { PaymentModal } from '../../../components/billing/PaymentModal';
import {
  IndianRupee, TrendingUp, AlertCircle, CheckCircle, Users, Loader2, Search
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import useSWR from 'swr';

const fetcher = (url: string) => api.get(url).then(res => res.data);

const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export default function RevenuePage() {
  const [paymentTarget, setPaymentTarget] = useState<{ journeyId: string; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('newest'); // newest, oldest, high-low, low-high
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isTourMode, setIsTourMode] = useState(false);

  const startTour = () => {
    setIsTourMode(true);
    const tourObj = driver({
      showProgress: true,
      animate: true,
      onDestroyed: () => setIsTourMode(false),
      steps: [
        { element: '#tour-rev-kpis', popover: { title: 'Financial Overview', description: 'Monitor your total collections for today, the month, and any outstanding dues at a glance.', side: 'bottom', align: 'start' } },
        { element: '#tour-rev-outstanding', popover: { title: 'Outstanding Balances', description: 'This table tracks every patient who owes money on an active treatment journey.', side: 'top', align: 'start' } },
        { element: '#tour-rev-filters', popover: { title: 'Sort & Filter', description: 'Quickly locate patients by name, or sort to find your largest outstanding balances.', side: 'bottom', align: 'end' } },
        { element: '#tour-rev-collect', popover: { title: 'Record Payments', description: 'Click Collect to instantly record a new payment and update the patient\'s remaining balance.', side: 'left', align: 'center' } }
      ]
    });
    tourObj.drive();
  };

  useEffect(() => {
    if (searchParams.get('tour') === 'true') {
      router.replace('/revenue');
      setTimeout(startTour, 500);
    }
  }, [searchParams]);

  // Fetch Stats with SWR
  const { data: stats, isLoading: loading, mutate: mutateStats } = useSWR('/billing/revenue', fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true
  });

  const filteredOutstanding = useMemo(() => {
    if (!stats?.outstanding) return [];
    
    // 1. Filter
    let result = stats.outstanding;
    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      result = result.filter((j: any) => 
        j.patient?.name?.toLowerCase().includes(lowerQ) ||
        j.patient?.phoneNumber?.includes(lowerQ) ||
        j.template?.name?.toLowerCase().includes(lowerQ)
      );
    }
    
    // 2. Sort
    return result.sort((a: any, b: any) => {
      if (sortOrder === 'high-low') return b.balance - a.balance;
      if (sortOrder === 'low-high') return a.balance - b.balance;
      // fallback to dates assuming ID or created dates
      if (sortOrder === 'oldest') return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }, [stats?.outstanding, searchQuery, sortOrder]);

  return (
    <div className="p-8 md:p-12 w-full max-w-[1800px] mx-auto animate-in fade-in duration-500">
      
      {paymentTarget && (
        <PaymentModal
          isOpen={true}
          onClose={() => setPaymentTarget(null)}
          journeyId={paymentTarget.journeyId}
          journeyName={paymentTarget.name}
          onPaymentRecorded={() => { 
            mutateStats(); // Instantly update SWR cache!
            setPaymentTarget(null);
          }}
        />
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Revenue & Collections</h1>
        <p className="text-sm text-slate-500 mt-1">Track payments collected and outstanding balances.</p>
      </div>

      {loading && !stats ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div id="tour-rev-kpis" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-slate-500">Today's Collections</p>
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <IndianRupee className="w-4 h-4 text-emerald-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900">{fmt(stats?.today?.amount || 0)}</p>
                <p className="text-xs text-slate-400 mt-1">{stats?.today?.count || 0} payment{stats?.today?.count !== 1 ? 's' : ''}</p>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-slate-500">This Month</p>
                  <div className="p-2 bg-indigo-50 rounded-lg">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900">{fmt(stats?.month?.amount || 0)}</p>
                <p className="text-xs text-slate-400 mt-1">{stats?.month?.count || 0} payment{stats?.month?.count !== 1 ? 's' : ''}</p>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-slate-500">Total Outstanding</p>
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-rose-600">{fmt(stats?.outstandingTotal || 0)}</p>
                <p className="text-xs text-slate-400 mt-1">across {stats?.outstandingCount || 0} active plans</p>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-slate-500">Fully Paid Plans</p>
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900">{stats?.fullyPaidCount || 0}</p>
                <p className="text-xs text-slate-400 mt-1">active zero-balance treatments</p>
              </div>
            </Card>

          </div>

          {/* Outstanding Balances List */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4" id="tour-rev-filters">
            <h2 className="text-xl font-bold text-slate-900">Outstanding Balances</h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Search patient or treatment..." 
                  className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <select 
                className="px-4 py-2 border border-slate-200 rounded-xl text-sm bg-white font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value)}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="high-low">Highest Balance</option>
                <option value="low-high">Lowest Balance</option>
              </select>
            </div>
          </div>

          <Card className="overflow-hidden" id="tour-rev-outstanding">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Patient</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Treatment</th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Total Cost</th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Paid So Far</th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Balance Due</th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {filteredOutstanding.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                        {searchQuery ? 'No matching balances found.' : 'No outstanding balances!'}
                      </td>
                    </tr>
                  ) : (
                    filteredOutstanding.map((item: any, idx: number) => {
                      const cost = item.totalCost || 0;
                      const paid = cost - item.balance;
                      const pct = cost > 0 ? (paid / cost) * 100 : 0;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs mr-3">
                                {item.patient?.name?.charAt(0) || <Users className="w-4 h-4" />}
                              </div>
                              <div>
                                <div className="text-sm font-bold text-slate-900 cursor-pointer hover:text-indigo-600" onClick={() => router.push(`/patients/${item.patientId}`)}>
                                  {item.patient?.name}
                                </div>
                                <div className="text-xs text-slate-500">{item.patient?.phoneNumber}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-slate-700">{item.template?.name || 'Custom Plan'}</div>
                            <div className="w-24 bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden" title={`${Math.round(pct)}% Paid`}>
                              <div className="bg-emerald-500 h-full" style={{ width: `${pct}%` }} />
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-slate-500">
                            {fmt(cost)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-emerald-600">
                            {fmt(paid)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className="text-sm font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md">
                              {fmt(item.balance)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <Button 
                              id={idx === 0 ? "tour-rev-collect" : undefined}
                              variant="default" 
                              size="sm" 
                              className="bg-slate-900 text-white hover:bg-slate-800"
                              onClick={() => setPaymentTarget({ journeyId: item.id, name: item.template?.name || 'Custom Plan' })}
                            >
                              Collect
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
