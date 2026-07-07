'use client';

import React, { useState } from 'react';
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
