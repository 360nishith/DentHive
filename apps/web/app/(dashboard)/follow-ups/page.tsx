'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { PhoneCall, CheckCircle2, XCircle, Clock, Loader2, ArrowRight, Calendar, AlertTriangle, MessageCircle } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { useRouter } from 'next/navigation';
import api from '../../../lib/axios';
import { ScheduleAppointmentModal } from '../../../components/appointments/ScheduleAppointmentModal';

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

import { supabase } from '../../../lib/supabase';

export default function FollowUpsPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'logs' | 'stalled'>('logs');
  const [items, setItems] = useState<any[]>([]);
  const [stalledItems, setStalledItems] = useState<any[]>([]);
  const [stalledSort, setStalledSort] = useState<'newest' | 'oldest'>('newest');
  const [loading, setLoading] = useState(true);
  
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [currentUserRole, setCurrentUserRole] = useState('ADMIN');
  
  // Reschedule state
  const [rescheduleApt, setRescheduleApt] = useState<any>(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('10:00');

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const role = session?.user?.app_metadata?.role || session?.user?.user_metadata?.role || 'ADMIN';
      setCurrentUserRole(role);

      let urlSuffix = '';
      if (selectedDoctorId) {
        urlSuffix = `?doctorId=${selectedDoctorId}`;
      }

      const [pendingRes, stalledRes] = await Promise.all([
        api.get(`/followups/pending${urlSuffix}`),
        api.get(`/followups/stalled${urlSuffix}`)
      ]);
      setItems(pendingRes.data);
      setStalledItems(stalledRes.data);

      if (role === 'STAFF' || role === 'ADMIN') {
        const uRes = await api.get('/users');
        setDoctors(uRes.data.filter((u: any) => u.role?.name === 'DENTIST' || u.role?.name === 'ADMIN'));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDoctorId]);

  const handleReschedule = async () => {
    if (!newDate || !newTime || !rescheduleApt) return;
    try {
      const [hours, minutes] = newTime.split(':').map(Number);
      const start = new Date(newDate);
      start.setHours(hours, minutes, 0, 0); 
      const end = new Date(newDate);
      end.setHours(hours + 1, minutes, 0, 0);
      
      // We will create a new appointment for the current stalled stage
      await api.post('/appointments', {
        patientId: rescheduleApt.patientId,
        treatmentStageId: rescheduleApt.currentStageId,
        scheduledStart: start.toISOString(),
        scheduledEnd: end.toISOString()
      });
      
      setRescheduleApt(null);
      loadData(); // refresh to remove from stalled
    } catch (e) {
      alert('Failed to reschedule');
    }
  };

  const handleWhatsAppNudge = (item: any) => {
    if (!item.patientPhone) return alert('No phone number on record for this patient.');
    
    // Remove non-numeric characters for WhatsApp link
    let phoneStr = item.patientPhone.replace(/\D/g, '');
    if (phoneStr.length === 10) phoneStr = '91' + phoneStr;

    // Use the exact user requested template
    const text = `Hello ${item.patientName}, this is ${item.clinicName}. We noticed you haven't booked your next visit for your ${item.currentStageName || item.treatmentName} yet. Please let us know when you are free so we can finish your treatment.`;
    
    window.open(`https://wa.me/${phoneStr}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const getStatusBadge = (status: string) => {
    if (status === 'READ') {
      return (
        <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold shadow-sm">
          <CheckCircle2 className="w-3 h-3" /> Read
        </span>
      );
    }
    if (status === 'PROCESSED' || status === 'DELIVERED') {
      return (
        <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold">
          <CheckCircle2 className="w-3 h-3" /> Delivered
        </span>
      );
    }
    if (status === 'SENT') {
      return (
        <span className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">
          <CheckCircle2 className="w-3 h-3" /> Sent
        </span>
      );
    }
    if (status === 'FAILED') {
      return (
        <span className="flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 rounded-full text-xs font-semibold">
          <XCircle className="w-3 h-3" /> Failed
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold">
        <Clock className="w-3 h-3" /> Pending
      </span>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-500 relative">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2 tracking-tight">
          <PhoneCall className="w-6 h-6 text-indigo-500" />
          Follow-Ups & Recalls
        </h1>
        <p className="text-sm text-slate-500 mt-1">Automated WhatsApp delivery logs and pending patient recalls.</p>
      </div>

      <div className="flex justify-between items-end mb-6 border-b border-slate-200">
        <div className="flex gap-4">
          <button 
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 border-b-2 font-semibold text-sm ${activeTab === 'logs' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            WhatsApp Logs & Recalls
          </button>
          <button 
            onClick={() => setActiveTab('stalled')}
            className={`px-4 py-2 border-b-2 font-semibold text-sm flex items-center gap-1.5 ${activeTab === 'stalled' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {stalledItems.length > 0 && <AlertTriangle className="w-4 h-4" />}
            Stalled Patients ({stalledItems.length})
          </button>
        </div>

        {(currentUserRole === 'STAFF' || currentUserRole === 'ADMIN') && doctors.length > 0 && (
          <div className="mb-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
            <span className="text-sm font-medium text-slate-500">Doctor:</span>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-900 outline-none cursor-pointer"
            >
              <option value="">All Doctors</option>
              {doctors.map(d => (
                <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
        </div>
      ) : activeTab === 'logs' ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Patient</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Trigger Type</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    No follow-ups or recalls found.
                  </td>
                </tr>
              ) : (
                items.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{item.patientName}</span>
                        {item.doctorName && (
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            {item.doctorName}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-600">{item.triggerType}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-500">{formatDate(item.date)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(item.status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-amber-50 flex justify-between items-center">
            <h3 className="text-amber-800 font-semibold text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Stalled Patients (Not done with treatment & no future appointment scheduled)
            </h3>
            <select
              value={stalledSort}
              onChange={(e) => setStalledSort(e.target.value as 'newest' | 'oldest')}
              className="text-xs border-amber-200 bg-white text-amber-900 rounded-md shadow-sm focus:border-amber-500 focus:ring-amber-500"
            >
              <option value="newest">Recently Stalled</option>
              <option value="oldest">Longest Stalled</option>
            </select>
          </div>
          <div className="overflow-x-auto w-full">
            <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Patient</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Journey</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Reason</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Stalled Since</th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {stalledItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No stalled patients found. Great job!
                  </td>
                </tr>
              ) : (
                [...stalledItems].sort((a, b) => stalledSort === 'newest' ? a.daysStalled - b.daysStalled : b.daysStalled - a.daysStalled).map((item: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-slate-900 cursor-pointer hover:text-indigo-600" onClick={() => router.push(`/patients/${item.patientId}`)}>
                          {item.patientName}
                        </div>
                        {item.doctorName && (
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            {item.doctorName}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{item.patientPhone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900 font-medium">{item.treatmentName}</div>
                      <div className="text-xs text-slate-500">{item.lastCompletedStage ? `Completed: ${item.lastCompletedStage}` : 'Just Started'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-rose-600">{item.stallReason || 'Not Started'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold w-max">
                        <Clock className="w-3 h-3" /> {item.daysStalled} day{item.daysStalled !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => handleWhatsAppNudge(item)}>
                          <MessageCircle className="w-4 h-4 mr-1.5" /> Nudge
                        </Button>
                        <Button variant="outline" size="sm" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50" onClick={() => setRescheduleApt(item)}>
                          <Calendar className="w-4 h-4 mr-1.5" /> Reschedule
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Reschedule Modal Overlay */}
      <ScheduleAppointmentModal
        isOpen={!!rescheduleApt}
        onClose={() => setRescheduleApt(null)}
        patientId={rescheduleApt?.patientId || ''}
        stageId={rescheduleApt?.currentStageId || null}
        stageName={rescheduleApt?.treatmentName || 'Custom Stage'}
        aptId={rescheduleApt?.latestApptId}
        defaultTime={rescheduleApt?.latestApptDate ? new Date(rescheduleApt.latestApptDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '10:00'}
        onScheduled={() => {
          loadData();
          setRescheduleApt(null);
        }}
      />
    </div>
  );
}
