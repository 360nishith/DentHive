'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { BarChart3, TrendingUp, Users, Calendar, IndianRupee, Activity, Loader2 } from 'lucide-react';
import api from '../../../lib/axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'daily' | 'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    Promise.all([
      api.get('/billing/revenue'),
      api.get('/billing/charts')
    ]).then(([revRes, chartRes]) => {
      setStats(revRes.data);
      setChartData(chartRes.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2 tracking-tight">
          <BarChart3 className="w-6 h-6 text-indigo-500" />
          Analytics Dashboard
        </h1>
        <p className="text-sm text-slate-500 mt-1">High-level clinic performance and growth metrics.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-6 border-t-4 border-t-emerald-500">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-500">Total Revenue</h3>
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <IndianRupee className="w-4 h-4 text-emerald-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900">{fmt(stats?.total || 0)}</p>
            </Card>

            <Card className="p-6 border-t-4 border-t-blue-500">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-500">Active Patients</h3>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900">{stats?.activePatients || 0}</p>
              <p className="text-sm text-slate-500 mt-2">Currently in treatment</p>
            </Card>

            <Card className="p-6 border-t-4 border-t-purple-500">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-500">Appointments (30d)</h3>
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Calendar className="w-4 h-4 text-purple-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900">{stats?.appointments30d || 0}</p>
              <p className="text-sm text-slate-500 mt-2">Booked recently</p>
            </Card>

            <Card className="p-6 border-t-4 border-t-orange-500">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-500">Outstanding Dues</h3>
                <div className="p-2 bg-orange-50 rounded-lg">
                  <Activity className="w-4 h-4 text-orange-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900">{fmt(stats?.outstandingTotal || 0)}</p>
              <p className="text-sm text-slate-500 mt-2">Across {stats?.outstandingCount || 0} active journeys</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-slate-900">Revenue Chart</h3>
                  <select 
                    value={period}
                    onChange={(e) => setPeriod(e.target.value as any)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="daily">Daily</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                
                <div className="h-64 w-full">
                  {chartData && chartData[period]?.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData[period]}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dx={-10} tickFormatter={(v) => `₹${v}`} />
                        <Tooltip 
                          cursor={{fill: '#f1f5f9'}}
                          contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                          formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']}
                        />
                        <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                      No revenue data available for this period.
                    </div>
                  )}
                </div>
             </Card>

             <Card className="p-6">
                <h3 className="font-bold text-slate-900 mb-4">Recent Payments</h3>
                <div className="space-y-4">
                  {stats?.recentPayments?.length > 0 ? (
                    stats.recentPayments.map((pay: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div>
                           <p className="font-semibold text-slate-900">{pay.journey?.template?.name || 'Custom Journey'}</p>
                           <p className="text-xs text-slate-500">{new Date(pay.recordedAt).toLocaleString('en-GB')}</p>
                        </div>
                        <span className="font-bold text-emerald-600">+₹{pay.amount.toLocaleString()}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-slate-500 py-4 text-center">No recent payments.</div>
                  )}
                </div>
             </Card>
          </div>
        </div>
      )}
    </div>
  );
}
