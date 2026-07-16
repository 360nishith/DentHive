'use client';

import React, { useEffect, useState, useMemo } from 'react';
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

const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export default function RevenuePage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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

  const fetchStats = async () => {
    try {
      const res = await api.get('/billing/revenue');
      setStats(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    const intervalId = setInterval(fetchStats, 30000);

    const handleFocus = () => fetchStats();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchStats();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

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
          onPaymentRecorded={() => { setPaymentTarget(null); fetchStats(); }}
        />
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Revenue & Collections</h1>
        <p className="text-sm text-slate-500 mt-1">Track payments collected and outstanding balances.</p>
      </div>

      {loading ? (
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
                  <p className="text-sm font-semibold text-slate-500">Total Collected</p>
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-purple-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900">{fmt(stats?.total || 0)}</p>
                <p className="text-xs text-slate-400 mt-1">All time</p>
              </div>
            </Card>

            <Card className="border-red-100">
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-red-500">Outstanding</p>
                  <div className="p-2 bg-red-50 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-red-600">{fmt(stats?.outstandingTotal || 0)}</p>
                <p className="text-xs text-slate-400 mt-1">{stats?.outstandingCount || 0} active journey{stats?.outstandingCount !== 1 ? 's' : ''} with dues</p>
              </div>
            </Card>

          </div>

          {/* Outstanding Balances Table */}
          <Card id="tour-rev-outstanding" className="overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  Outstanding Balances
                </h2>
                <span className="text-sm text-slate-500">({filteredOutstanding.length})</span>
              </div>
              
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search patients, phone, treatment..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow bg-white"
                />
              </div>
              
              <div id="tour-rev-filters" className="relative flex flex-col sm:flex-row gap-4">
                <select 
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="w-full sm:w-auto px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow bg-white appearance-none pr-8 cursor-pointer text-slate-700"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="high-low">Balance: High to Low</option>
                  <option value="low-high">Balance: Low to High</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                  </svg>
                </div>
              </div>
            </div>

            {filteredOutstanding.length === 0 && !isTourMode ? (
              <div className="p-12 text-center">
                <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                <p className="font-bold text-slate-900">All cleared!</p>
                <p className="text-sm text-slate-500 mt-1">No outstanding balances found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-6 py-3 font-medium border-b border-slate-200">Patient</th>
                      <th className="px-6 py-3 font-medium border-b border-slate-200">Treatment</th>
                      <th className="px-6 py-3 font-medium border-b border-slate-200">Total</th>
                      <th className="px-6 py-3 font-medium border-b border-slate-200">Paid</th>
                      <th className="px-6 py-3 font-medium border-b border-slate-200 text-red-500">Balance Due</th>
                      <th className="px-6 py-3 font-medium border-b border-slate-200 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOutstanding.length === 0 && isTourMode && (
                      <tr className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <button className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold border border-indigo-100">
                              D
                            </div>
                            Demo Patient
                            <Badge variant="secondary" className="ml-1 bg-amber-100 text-amber-700 hover:bg-amber-100 text-[10px]">Demo Data</Badge>
                          </button>
                          <p className="text-xs text-slate-400 mt-0.5 ml-9">+91 98765 43210</p>
                        </td>
                        <td className="px-6 py-4 text-slate-700 font-medium">Root Canal</td>
                        <td className="px-6 py-4 text-slate-600">₹8,000</td>
                        <td className="px-6 py-4 text-emerald-700 font-medium">₹3,000</td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-red-600">₹5,000</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            id="tour-rev-collect"
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                          >
                            <IndianRupee className="w-3 h-3 mr-1" />
                            Collect
                          </Button>
                        </td>
                      </tr>
                    )}
                    {filteredOutstanding.map((j: any) => (
                      <tr key={j.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <button
                            onClick={() => router.push(`/patients/${j.patientId}`)}
                            className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors flex items-center gap-2"
                          >
                            <div className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold border border-indigo-100">
                              {j.patient.name.charAt(0)}
                            </div>
                            {j.patient.name}
                          </button>
                          <p className="text-xs text-slate-400 mt-0.5 ml-9">{j.patient.phoneNumber}</p>
                        </td>
                        <td className="px-6 py-4 text-slate-700 font-medium">{j.template.name}</td>
                        <td className="px-6 py-4 text-slate-600">{fmt(j.totalCost)}</td>
                        <td className="px-6 py-4 text-emerald-700 font-medium">{fmt(j.paid)}</td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-red-600">{fmt(j.balance)}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            id={j.id === filteredOutstanding[0]?.id ? "tour-rev-collect" : undefined}
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                            onClick={() => setPaymentTarget({ journeyId: j.id, name: j.template.name })}
                          >
                            <IndianRupee className="w-3 h-3 mr-1" />
                            Collect
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
