'use client';

import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  IndianRupee, 
  Plus,
  AlertTriangle,
  CalendarDays,
  Play,
  Users,
  Activity,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import api from '../../../lib/axios';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

export default function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userName, setUserName] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [stats, setStats] = useState({ patients: 0, todayRevenue: 0, todayPayments: 0, outstanding: 0 });
  const [stalledJourneys, setStalledJourneys] = useState<any[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
  const [stalledSort, setStalledSort] = useState('newest'); // newest, oldest
  const [userRole, setUserRole] = useState('ADMIN');
  const [isTourMode, setIsTourMode] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      // Get user info from Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const meta = session.user.user_metadata;
        const appMeta = session.user.app_metadata;
        const first = meta?.first_name || meta?.firstName || session.user.email?.split('@')[0] || 'Doctor';
        setUserName(first);
        if (appMeta?.role) {
          setUserRole(appMeta.role);
        } else if (meta?.role) {
          setUserRole(meta.role);
        }
      }

      // Get clinic name from our API
      try {
        const res = await api.get('/tenant');
        if (res.data?.name) setClinicName(res.data.name);
      } catch (e) {}

      // Get dashboard stats
      try {
        const today = new Date().toISOString().split('T')[0];
        // If staff, don't fetch revenue to avoid 403
        const pRes = api.get('/patients?limit=1').catch(() => ({ data: { meta: { total: 0 } } }));
        const stalledRes = api.get('/followups/stalled').catch(() => ({ data: [] }));
        const apptRes = api.get(`/appointments?start=${today}T00:00:00.000Z&end=${today}T23:59:59.999Z`).catch(() => ({ data: [] }));
        
        let revRes: any = { data: {} };
        const activeRole = session?.user?.app_metadata?.role || session?.user?.user_metadata?.role;
        if (activeRole !== 'STAFF') {
          revRes = await api.get('/billing/revenue').catch(() => ({ data: {} }));
        }

        const [p, stalled, appt] = await Promise.all([pRes, stalledRes, apptRes]);

        setStats({
          patients: p.data?.meta?.total || 0,
          todayRevenue: revRes.data?.today?.amount || 0,
          todayPayments: revRes.data?.today?.count || 0,
          outstanding: revRes.data?.outstandingTotal || 0,
        });
        setStalledJourneys(stalled.data || []);
        // Filter out completed/cancelled ones so we only see upcoming for today
        setTodayAppointments((appt.data || []).filter((a: any) => a.status === 'SCHEDULED' || a.status === 'RESCHEDULE_REQUESTED' || a.status === 'CONFIRMED'));
      } catch (e) {}
    };
    loadData();
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const startTour = () => {
    setIsTourMode(true);
    const tourObj = driver({
      showProgress: true,
      animate: true,
      onDestroyed: () => setIsTourMode(false),
      steps: [
        { element: '#tour-dashboard-header', popover: { title: 'Welcome to DentHive', description: 'This is your main dashboard. Here you get a high-level overview of everything happening in your clinic today.', side: 'bottom', align: 'start' } },
        { element: '#tour-kpi-cards', popover: { title: 'Clinic Metrics', description: 'Track your total registered patients and today\'s revenue collections at a glance.', side: 'bottom', align: 'start' } },
        { element: '#add-patient-btn', popover: { title: 'Quick Add', description: 'Use this button anytime to quickly register a new patient that just walked in.', side: 'bottom', align: 'start' } },
        { element: '#dashboard-stalled', popover: { title: 'Stalled Journeys', description: 'Our AI flags patients who have dropped out of treatment without booking their next visit so you can follow up.', side: 'top', align: 'start' } },
        { element: '#dashboard-appointments', popover: { title: 'Today\'s Calendar', description: 'See all the appointments lined up for today. You can view their profiles or simulate cancellations.', side: 'top', align: 'start' } }
      ]
    });
    tourObj.drive();
  };

  useEffect(() => {
    if (searchParams.get('tour') === 'true') {
      router.replace('/dashboard');
      setTimeout(startTour, 500);
    }
  }, [searchParams]);

  return (
    <div className="p-8 md:p-12 w-full max-w-[1800px] mx-auto animate-in fade-in duration-500">
      
      {/* Page Header */}
      <div id="tour-dashboard-header" className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            {greeting()}{userName ? `, ${userName}` : ''}.
            {clinicName ? ` Welcome to ${clinicName}.` : ' Here is what\'s happening today.'}
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-3">
          {clinicName && (
            <div className="flex items-center px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-semibold border border-indigo-100">
              🏥 {clinicName}
            </div>
          )}
          <Button id="add-patient-btn" onClick={() => router.push('/patients')}>
            <Plus className="w-4 h-4 mr-2" />
            New Patient
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div id="tour-kpi-cards" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        
        {/* Patients Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600">Total Patients</CardTitle>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-md">
              <Users className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{stats.patients}</div>
            <p className="text-sm text-slate-500 mt-2">Registered in this clinic</p>
          </CardContent>
        </Card>

        {/* Revenue Card (Hidden for Staff) */}
        {userRole !== 'STAFF' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-slate-600">Today's Collections</CardTitle>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-md">
                <IndianRupee className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">₹{stats.todayRevenue.toLocaleString('en-IN')}</div>
              <p className="text-sm text-slate-500 mt-2">
                {stats.todayPayments} payment{stats.todayPayments !== 1 ? 's' : ''} today
              </p>
            </CardContent>
          </Card>
        )}

        {/* Action Card */}
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-6 rounded-xl shadow-md text-white flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <h3 className="text-lg font-bold mb-1 relative z-10">Quick Add</h3>
          <p className="text-indigo-100 text-sm mb-4 relative z-10">Register a new patient into the clinic system instantly.</p>
          <Button 
            variant="secondary" 
            className="w-full text-indigo-700 relative z-10 hover:bg-white/90"
            onClick={() => router.push('/patients')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Patient
          </Button>
        </div>

      </div>

      {/* Main Data Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Stalled Journeys */}
        <div id="dashboard-stalled" className="flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-amber-500 mr-2" />
              <h2 className="text-base font-bold text-slate-900">Stalled Journeys</h2>
              <Badge variant="warning" className="ml-3 border-amber-200">Requires Action</Badge>
            </div>
            
            <div className="relative">
              <select 
                value={stalledSort}
                onChange={(e) => setStalledSort(e.target.value)}
                className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none pr-6"
              >
                <option value="newest">Recently Stalled</option>
                <option value="oldest">Longest Stalled</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>
          </div>
          
          <Card className="flex-1 overflow-hidden flex flex-col">
            {stalledJourneys.length === 0 && !isTourMode ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center flex-1 justify-center">
                <Activity className="w-8 h-8 mb-3 opacity-30" />
                <p className="text-sm font-medium">No stalled journeys</p>
                <p className="text-xs mt-1">Live data will appear here as patients progress</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto max-h-[300px]">
                {stalledJourneys.length === 0 && isTourMode && (
                  <div className="p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">Demo Data</Badge>
                        <p className="text-sm font-bold text-slate-900">John Smith</p>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Root Canal • Started
                      </p>
                      <p className="text-xs text-amber-600 mt-1 font-medium">
                        ⚠️ Stalled for 14 days
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                      Book Next
                    </Button>
                  </div>
                )}
                {[...stalledJourneys].sort((a, b) => stalledSort === 'newest' ? a.daysStalled - b.daysStalled : b.daysStalled - a.daysStalled).map((stalled, idx) => (
                  <div key={idx} className="p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{stalled.patientName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {stalled.treatmentName} • {stalled.lastCompletedStage ? `Completed: ${stalled.lastCompletedStage}` : 'Started'}
                      </p>
                      {stalled.daysStalled > 0 && (
                        <p className="text-xs text-amber-600 mt-1 font-medium">
                          ⚠️ Stalled for {stalled.daysStalled} day{stalled.daysStalled !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => router.push(`/patients/${stalled.patientId}`)}
                      className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                    >
                      Book Next
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Today's Appointments */}
        <div id="dashboard-appointments" className="flex flex-col">
          <div className="flex items-center mb-4">
            <CalendarDays className="w-5 h-5 text-indigo-500 mr-2" />
            <h2 className="text-base font-bold text-slate-900">Today's Appointments</h2>
          </div>
          
          <Card className="flex-1 overflow-hidden flex flex-col">
            {todayAppointments.length === 0 && !isTourMode ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center flex-1 justify-center">
                <CalendarDays className="w-8 h-8 mb-3 opacity-30" />
                <p className="text-sm font-medium">No appointments remaining today</p>
                <p className="text-xs mt-1">Schedule appointments from a patient's profile</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto max-h-[300px]">
                {todayAppointments.length === 0 && isTourMode && (
                  <div className="p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">Demo Data</Badge>
                        <p className="text-sm font-bold text-slate-900">Jane Doe</p>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Dental Checkup • 02:00 PM
                      </p>
                    </div>
                    <div className="flex gap-2 mt-3 sm:mt-0">
                      <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">Cancel</Button>
                      <Button variant="outline" size="sm" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50">View Profile</Button>
                    </div>
                  </div>
                )}
                {todayAppointments.map((appt, idx) => {
                  const timeStr = new Date(appt.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div key={idx} className="p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{appt.patient?.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-slate-500">
                            {appt.treatmentStage?.name || 'Custom Stage'} • {timeStr}
                          </p>
                          {appt.status === 'RESCHEDULE_REQUESTED' && (
                            <Badge variant="destructive" className="animate-pulse bg-red-100 text-red-700 border-red-200 hover:bg-red-200">Reschedule Req.</Badge>
                          )}
                          {appt.status === 'CONFIRMED' && (
                            <Badge variant="success" className="border-emerald-200 shadow-sm">Confirmed</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3 sm:mt-0">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={async () => {
                            if (!confirm("Simulate patient cancelling today's appointment? They will be moved to Stalled Patients.")) return;
                            try {
                              await api.patch(`/appointments/${appt.id}`, { status: 'CANCELLED' });
                              loadData(); // Re-fetch immediately without hard refresh
                            } catch (e) {}
                          }}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          Cancel
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => router.push(`/patients/${appt.patientId}`)}
                          className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                        >
                          View Profile
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 text-center">
              <button 
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                onClick={() => router.push('/appointments')}
              >
                View Full Calendar →
              </button>
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}
