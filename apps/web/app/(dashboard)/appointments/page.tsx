'use client';

import React, { useEffect, useState } from 'react';
import api from '../../../lib/axios';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { CalendarDays, Clock, User, Phone, CheckCircle2, MessageSquare, Calendar, Zap, XCircle } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { useRouter, useSearchParams } from 'next/navigation';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { ScheduleAppointmentModal } from '../../../components/appointments/ScheduleAppointmentModal';

export default function AppointmentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toLocaleDateString('en-GB'));
  const [allAppointments, setAllAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rescheduleApt, setRescheduleApt] = useState<any>(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('10:00');
  const [tenantStatus, setTenantStatus] = useState('ACTIVE');
  const [isTourMode, setIsTourMode] = useState(false);

  const fetchAppointments = async () => {
    try {
      const now = new Date();
      // Fetch for a rolling 60-day window
      const startWindow = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endWindow = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59);
      
      const res = await api.get('/appointments', {
        params: {
          start: startWindow.toISOString(),
          end: endWindow.toISOString()
        }
      });
      // Filter out COMPLETED and CANCELLED appointments as requested
      const activeApts = res.data.filter((a: any) => a.status === 'SCHEDULED' || a.status === 'RESCHEDULE_REQUESTED' || a.status === 'CONFIRMED');
      setAllAppointments(activeApts);

      const tenantRes = await api.get('/tenant');
      setTenantStatus(tenantRes.data.status);
    } catch (err) {
      console.error('Failed to fetch appointments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleReschedule = async () => {
    if (!newDate || !newTime || !rescheduleApt) return;
    try {
      const [hours, minutes] = newTime.split(':').map(Number);
      const start = new Date(newDate);
      start.setHours(hours, minutes, 0, 0);
      const end = new Date(newDate);
      end.setHours(hours + 1, minutes, 0, 0);
      
      await api.patch(`/appointments/${rescheduleApt.id}`, {
        scheduledStart: start.toISOString(),
        scheduledEnd: end.toISOString(),
        status: 'SCHEDULED'
      });
      setRescheduleApt(null);
      fetchAppointments();
    } catch (e) {
      alert('Failed to reschedule');
    }
  };

  const handleSendMessage = async (patientPhone: string) => {
    // Sanitize phone number by removing spaces, hyphens, and everything except + and digits
    const cleanPhone = patientPhone.replace(/[^\d+]/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=Hello%2C%20this%20is%20DentalFlow%20Clinic.`, '_blank');
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <Clock className="w-6 h-6 text-indigo-500 animate-spin" />
      </div>
    );
  }

  const displayAppointments = allAppointments.filter(apt => {
    const aptDate = new Date(apt.scheduledStart).toLocaleDateString('en-GB');
    if (selectedDate === 'all') return true;
    return aptDate === selectedDate;
  });

  // Group display appointments by date
  const groupedAppointments = displayAppointments.reduce((acc: any, apt: any) => {
    const date = new Date(apt.scheduledStart).toLocaleDateString('en-GB');
    if (!acc[date]) acc[date] = [];
    acc[date].push(apt);
    return acc;
  }, {});

  // Generate calendar days
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
  const calendarDays = Array.from({ length: 35 }).map((_, i) => {
    const dayNumber = i - firstDayOfMonth + 1;
    const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth;
    const isToday = isCurrentMonth && dayNumber === now.getDate();
    
    // Check if there are appointments on this day
    const hasAppt = isCurrentMonth && allAppointments.some(apt => {
      const aptDate = new Date(apt.scheduledStart);
      return aptDate.getDate() === dayNumber && aptDate.getMonth() === now.getMonth();
    });

    return { dayNumber, isCurrentMonth, isToday, hasAppt };
  });

  return (
    <div className="p-8 md:p-12 w-full max-w-[1800px] mx-auto animate-in fade-in duration-500 relative flex flex-col xl:flex-row gap-8">
      {/* Left Column: Appointments List */}
      <div className="flex-1 min-w-0">
        <div id="tour-schedule-layout" className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Schedule</h1>
            <p className="text-slate-500 mt-2">Manage your clinic schedule and upcoming patient visits.</p>
          </div>
        </div>

        <div className="flex gap-4 mb-6 border-b border-slate-200">
          <button 
            onClick={() => setSelectedDate(new Date().toLocaleDateString('en-GB'))}
            className={`px-4 py-2 border-b-2 font-semibold text-sm ${selectedDate === new Date().toLocaleDateString('en-GB') ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Today
          </button>
          <button 
            onClick={() => {
              const tmrw = new Date();
              tmrw.setDate(tmrw.getDate() + 1);
              setSelectedDate(tmrw.toLocaleDateString('en-GB'));
            }}
            className={`px-4 py-2 border-b-2 font-semibold text-sm ${selectedDate === (function(){const d=new Date();d.setDate(d.getDate()+1);return d.toLocaleDateString('en-GB')}()) ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Tomorrow
          </button>
          <button 
            onClick={() => setSelectedDate('all')}
            className={`px-4 py-2 border-b-2 font-semibold text-sm ${selectedDate === 'all' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            All Upcoming
          </button>
        </div>

        {Object.keys(groupedAppointments).length === 0 && !isTourMode ? (
          <Card className="p-12 text-center">
            <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-1">No Appointments Found</h3>
            <p className="text-slate-500">You have no scheduled appointments for this period.</p>
          </Card>
        ) : (
          <div className="space-y-8">
            {Object.keys(groupedAppointments).length === 0 && isTourMode && (
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                  <CalendarDays className="w-5 h-5 mr-2 text-emerald-500" />
                  Today
                  <Badge variant="secondary" className="ml-3 bg-emerald-100 text-emerald-700">Active</Badge>
                </h2>
                <div id="tour-appt-cards" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card className="p-5 hover:shadow-md transition-shadow relative overflow-hidden group border-emerald-100">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                    
                    <div className="flex justify-between items-start mb-3">
                      <div className="font-bold text-slate-900 text-lg flex items-center">
                        <Clock className="w-4 h-4 mr-1.5 text-emerald-500" />
                        10:00 AM
                      </div>
                      <Badge variant="default" className="bg-amber-100 text-amber-700 border-amber-200">Demo Data</Badge>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm font-semibold text-slate-700">
                        <User className="w-4 h-4 mr-2 text-slate-400" />
                        Example Patient
                      </div>
                      <div className="flex items-center text-sm text-slate-500">
                        <Phone className="w-4 h-4 mr-2 text-slate-400" />
                        +91 98765 43210
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 mb-4">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Reason</div>
                      <div className="text-sm font-medium text-slate-900">
                        Initial Consultation
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <Button id="tour-msg-btn" variant="outline" size="sm" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                        <MessageSquare className="w-4 h-4 md:mr-1.5" /> <span className="hidden md:inline">MSG</span>
                      </Button>
                      <Button variant="outline" size="sm" className="text-amber-600 border-amber-200 hover:bg-amber-50">
                        <Calendar className="w-4 h-4 md:mr-1.5" /> <span className="hidden md:inline">Shift</span>
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" title="Cancel Appointment">
                        <XCircle className="w-4 h-4 md:mr-1.5" /> <span className="hidden md:inline">Cancel</span>
                      </Button>
                    </div>
                  </Card>
                </div>
              </div>
            )}
            {Object.entries(groupedAppointments).map(([date, apts]: [string, any]) => {
              const isToday = date === new Date().toLocaleDateString('en-GB');
              return (
                <div key={date}>
                  <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                    <CalendarDays className={`w-5 h-5 mr-2 ${isToday ? 'text-emerald-500' : 'text-indigo-500'}`} />
                    {isToday ? 'Today' : date}
                    {isToday && <Badge variant="secondary" className="ml-3 bg-emerald-100 text-emerald-700">Active</Badge>}
                  </h2>
                  <div id={isToday ? "tour-appt-cards" : undefined} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {apts.map((apt: any) => (
                      <Card key={apt.id} className={`p-5 hover:shadow-md transition-shadow relative overflow-hidden group ${isToday ? 'border-emerald-100' : ''} ${apt.status === 'CANCELLED' ? 'opacity-60 bg-slate-50 grayscale' : ''}`}>
                        <div className={`absolute top-0 left-0 w-1 h-full ${apt.status === 'CANCELLED' ? 'bg-slate-400' : isToday ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                        
                        <div className="flex justify-between items-start mb-3">
                          <div className="font-bold text-slate-900 text-lg flex items-center">
                            <Clock className={`w-4 h-4 mr-1.5 ${isToday ? 'text-emerald-500' : 'text-indigo-500'}`} />
                            {new Date(apt.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {apt.status === 'RESCHEDULE_REQUESTED' ? (
                            <Badge variant="destructive" className="animate-pulse bg-red-100 text-red-700 border-red-200 hover:bg-red-200">Reschedule Req.</Badge>
                          ) : apt.status === 'CANCELLED' ? (
                            <Badge variant="outline" className="bg-slate-100 text-slate-50 border-slate-300">Cancelled</Badge>
                          ) : apt.status === 'CONFIRMED' ? (
                            <Badge variant="success" className="border-emerald-200 shadow-sm">Confirmed</Badge>
                          ) : (
                            <Badge variant="default" className="bg-indigo-50 text-indigo-700 border-indigo-100">Scheduled</Badge>
                          )}
                        </div>

                        <div className="space-y-2 mb-4 cursor-pointer" onClick={() => router.push(`/patients/${apt.patientId}`)}>
                          <div className="flex items-center text-sm font-semibold text-slate-700 hover:text-indigo-600">
                            <User className="w-4 h-4 mr-2 text-slate-400" />
                            {apt.patient.name}
                          </div>
                          <div className="flex items-center text-sm text-slate-500">
                            <Phone className="w-4 h-4 mr-2 text-slate-400" />
                            {apt.patient.phoneNumber}
                          </div>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 mb-4">
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Reason</div>
                          <div className="text-sm font-medium text-slate-900">
                            {apt.treatmentStage?.name || 'Custom Stage'}
                          </div>
                        </div>

                        {apt.status !== 'CANCELLED' && (
                          <div className="grid grid-cols-3 gap-2">
                            <Button id={isToday ? "tour-msg-btn" : undefined} variant="outline" size="sm" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => handleSendMessage(apt.patient.phoneNumber)}>
                              <MessageSquare className="w-4 h-4 xl:mr-1.5" /> <span className="hidden xl:inline">MSG</span>
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-amber-600 border-amber-200 hover:bg-amber-50" 
                              onClick={() => setRescheduleApt(apt)}
                              disabled={tenantStatus === 'READ_ONLY'}
                            >
                              <Calendar className="w-4 h-4 xl:mr-1.5" /> <span className="hidden xl:inline">Shift</span>
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-red-600 border-red-200 hover:bg-red-50" 
                              title="Cancel Appointment"
                              disabled={tenantStatus === 'READ_ONLY'}
                              onClick={async () => {
                                if (confirm('Are you sure you want to cancel this appointment?')) {
                                  try {
                                    await api.patch(`/appointments/${apt.id}`, { status: 'CANCELLED' });
                                    fetchAppointments();
                                  } catch (e) {
                                    alert('Failed to cancel');
                                  }
                                }
                              }}
                            >
                              <XCircle className="w-4 h-4 xl:mr-1.5" /> <span className="hidden xl:inline">Cancel</span>
                            </Button>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right Column: Calendar Widget */}
      <div className="w-full xl:w-[350px] shrink-0">
        <Card className="p-6 sticky top-8">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-indigo-500" />
            {now.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h2>
          
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day} className="text-xs font-semibold text-slate-400 py-1">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              const clickDateStr = day.isCurrentMonth ? new Date(now.getFullYear(), now.getMonth(), day.dayNumber).toLocaleDateString('en-GB') : '';
              const isSelected = day.isCurrentMonth && clickDateStr === selectedDate;
              return (
              <div 
                key={idx} 
                className={`
                  relative aspect-square flex flex-col items-center justify-center rounded-lg text-sm font-medium
                  ${!day.isCurrentMonth ? 'text-slate-300' : 'text-slate-700 hover:bg-slate-50 cursor-pointer'}
                  ${isSelected ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm' : (day.isToday ? 'border border-indigo-600 text-indigo-600' : '')}
                `}
                onClick={() => {
                  if (day.isCurrentMonth) {
                    setSelectedDate(clickDateStr);
                  }
                }}
              >
                {day.isCurrentMonth ? day.dayNumber : ''}
                
                {/* Dot Indicator for appointments */}
                {day.hasAppt && day.isCurrentMonth && (
                  <div className={`absolute bottom-1.5 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-500'}`} />
                )}
              </div>
            )})}
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Total this month</span>
              <span className="font-bold text-slate-900">{allAppointments.length} Appts</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Reschedule Modal */}
      <ScheduleAppointmentModal
        isOpen={!!rescheduleApt}
        onClose={() => setRescheduleApt(null)}
        patientId={rescheduleApt?.patientId || ''}
        stageId={rescheduleApt?.treatmentStageId || null}
        stageName={rescheduleApt?.treatmentStage?.name || 'Custom Stage'}
        aptId={rescheduleApt?.id}
        onScheduled={() => {
          fetchAppointments();
          setRescheduleApt(null);
        }}
      />
    </div>
  );
}
