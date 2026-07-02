'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { PhoneCall, CheckCircle2, XCircle, Clock, Loader2, ArrowRight, Calendar, AlertTriangle } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { useRouter } from 'next/navigation';
import api from '../../../lib/axios';

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

export default function FollowUpsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'logs' | 'stalled'>('logs');
  const [items, setItems] = useState<any[]>([]);
  const [stalledItems, setStalledItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Reschedule state
  const [rescheduleApt, setRescheduleApt] = useState<any>(null);
  const [newDate, setNewDate] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [pendingRes, stalledRes] = await Promise.all([
        api.get('/followups/pending'),
        api.get('/followups/stalled')
      ]);
      setItems(pendingRes.data);
      setStalledItems(stalledRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReschedule = async () => {
    if (!newDate || !rescheduleApt) return;
    try {
      const start = new Date(newDate);
      start.setHours(10, 0, 0, 0); 
      const end = new Date(newDate);
      end.setHours(11, 0, 0, 0);
      
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

  const getStatusBadge = (status: string) => {
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

      <div className="flex gap-4 mb-6 border-b border-slate-200">
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

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
        </div>
      ) : activeTab === 'logs' ? (
        <Card className="overflow-hidden">
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
                      <div className="font-semibold text-slate-900">{item.patientName}</div>
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
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-amber-50">
            <h3 className="text-amber-800 font-semibold text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Stalled Patients (Not done with treatment & no future appointment scheduled)
            </h3>
          </div>
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
                stalledItems.map((item: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-900 cursor-pointer hover:text-indigo-600" onClick={() => router.push(`/patients/${item.patientId}`)}>
                        {item.patientName}
                      </div>
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
                      <Button variant="outline" size="sm" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50" onClick={() => setRescheduleApt(item)}>
                        <Calendar className="w-4 h-4 mr-1.5" /> Reschedule
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      )}

      {/* Reschedule Modal Overlay */}
      {rescheduleApt && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <Card className="p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Reschedule Patient</h3>
            <p className="text-sm text-slate-500 mb-4">Select a new date to bring {rescheduleApt.patientName} back in.</p>
            
            <input 
              type="date" 
              className="w-full border border-slate-200 rounded-lg p-3 mb-6 outline-none focus:ring-2 focus:ring-indigo-500"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
            
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setRescheduleApt(null)}>Cancel</Button>
              <Button className="flex-1 bg-indigo-600 text-white" onClick={handleReschedule}>Confirm</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
