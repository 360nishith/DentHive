'use client';

import React, { useState, useEffect } from 'react';
import api from '../../lib/axios';
import { Button } from '../ui/Button';
import { X, CalendarDays } from 'lucide-react';

interface ScheduleAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  stageId: string | null;
  stageName: string;
  aptId?: string;
  onScheduled: () => void;
}

export function ScheduleAppointmentModal({ isOpen, onClose, patientId, stageId, stageName, aptId, onScheduled }: ScheduleAppointmentModalProps) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [existingAppointments, setExistingAppointments] = useState<any[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  useEffect(() => {
    if (!date) {
      setExistingAppointments([]);
      return;
    }
    
    const fetchAppointments = async () => {
      setLoadingAppointments(true);
      try {
        const start = new Date(date);
        const end = new Date(date);
        end.setDate(end.getDate() + 1);
        const res = await api.get('/appointments', {
          params: { start: start.toISOString(), end: end.toISOString() }
        });
        
        // Filter out completed and cancelled appointments to exactly match the Calendar view
        const activeApts = (res.data || []).filter((a: any) => 
          a.status === 'SCHEDULED' || 
          a.status === 'RESCHEDULE_REQUESTED' || 
          a.status === 'CONFIRMED'
        );
        
        setExistingAppointments(activeApts);
      } catch (err) {
        console.error('Failed to fetch day appointments', err);
      } finally {
        setLoadingAppointments(false);
      }
    };
    
    fetchAppointments();
  }, [date]);

  if (!isOpen || !stageId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time) return;

    setSubmitting(true);
    setError('');

    // Combine date and time to ISO strings (simplified for this MVP)
    // A robust system would handle timezones properly.
    const startDateTime = new Date(`${date}T${time}:00`);
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1 hour duration

    try {
      if (aptId) {
        // Shifting an existing appointment
        await api.patch(`/appointments/${aptId}`, {
          scheduledStart: startDateTime.toISOString(),
          scheduledEnd: endDateTime.toISOString(),
          status: 'SCHEDULED' // Reset status just like the shift button does
        });
      } else {
        // Creating a new appointment
        await api.post('/appointments', {
          patientId,
          treatmentStageId: stageId,
          scheduledStart: startDateTime.toISOString(),
          scheduledEnd: endDateTime.toISOString()
        });
      }
      onScheduled();
      onClose();
    } catch (err: any) {
      console.error('Failed to schedule appointment', err);
      setError(err.response?.data?.message || 'Failed to schedule appointment. The slot might be booked.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 relative z-10">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-900 flex items-center">
            <CalendarDays className="w-5 h-5 mr-2 text-indigo-500" />
            Schedule Appointment
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 font-medium">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Reason (Clinical Stage)</label>
              <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-medium">
                {stageName}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Date</label>
                <input 
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Time</label>
                <input 
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* Existing Appointments Panel */}
            {date && (
              <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Existing Bookings on {new Date(date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
                <div className="p-2 max-h-[160px] overflow-y-auto">
                  {loadingAppointments ? (
                    <div className="text-center p-4 text-xs text-slate-500">Loading schedule...</div>
                  ) : existingAppointments.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {existingAppointments.filter(a => a.status !== 'CANCELLED' && a.status !== 'NO_SHOW').sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime()).map(apt => (
                        <div key={apt.id} className={`flex items-center gap-3 p-2 rounded-lg border text-sm ${aptId === apt.id ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200'}`}>
                          <div className="text-xs font-bold text-slate-700 w-[60px] shrink-0 text-center bg-slate-100 rounded py-1">
                            {new Date(apt.scheduledStart).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900 truncate">
                              {apt.patient?.name || 'Unknown'} {aptId === apt.id && <span className="text-[10px] text-indigo-500 ml-1">(This slot)</span>}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">{apt.treatmentStage?.name || 'Treatment'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-4 text-xs font-medium text-emerald-600 bg-emerald-50 rounded-lg">
                      Schedule is completely free!
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-end space-x-3">
            <Button variant="ghost" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !date || !time}>
              {submitting ? 'Scheduling...' : 'Confirm Booking'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
