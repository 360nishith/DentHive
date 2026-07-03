'use client';

import React, { useEffect, useState } from 'react';
import api from '../../../../lib/axios';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Badge } from '../../../../components/ui/Badge';
import { 
  User, Phone, Calendar, Clock, Activity, ArrowLeft,
  CalendarDays, FileText, Edit2, Check, X, Pencil, Trash2, IndianRupee, Plus, Bell
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { StartJourneyModal } from '../../../../components/journeys/StartJourneyModal';
import { ScheduleAppointmentModal } from '../../../../components/appointments/ScheduleAppointmentModal';
import { PaymentModal } from '../../../../components/billing/PaymentModal';
import { EditStageModal } from '../../../../components/journeys/EditStageModal';

function calcAge(dob: string | null): string {
  if (!dob) return '—';
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)) + ' yrs';
}

export default function PatientDetails({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [patient, setPatient] = useState<any>(null);
  const [journeys, setJourneys] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isJourneyModalOpen, setIsJourneyModalOpen] = useState(false);
  const [schedulingStage, setSchedulingStage] = useState<{id: string, name: string, aptId?: string} | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<{journeyId: string, name: string} | null>(null);
  const [billingData, setBillingData] = useState<Record<string, any>>({});
  const [editingStage, setEditingStage] = useState<{journeyId: string, stageId: string | null, name: string, cost: number} | null>(null);
  const [advancingStageId, setAdvancingStageId] = useState<string | null>(null);

  // Edit profile state
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editGender, setEditGender] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [tenantStatus, setTenantStatus] = useState('ACTIVE');
  const [subdomain, setSubdomain] = useState('');

  const fetchPatientData = async () => {
    try {
      const [patientRes, journeysRes, appointmentsRes, billingRes] = await Promise.all([
        api.get(`/patients/${params.id}`),
        api.get(`/journeys/patient/${params.id}`),
        api.get(`/appointments/patient/${params.id}`),
        api.get(`/billing/payments/patient/${params.id}`),
      ]);
      setPatient(patientRes.data);
      setJourneys(journeysRes.data);
      setAppointments(appointmentsRes.data);

      // Convert billing array into a map keyed by journeyId
      const billing: Record<string, any> = {};
      (billingRes.data as any[]).forEach(b => { billing[b.journeyId] = b; });
      setBillingData(billing);

      const tenantRes = await api.get('/tenant');
      setTenantStatus(tenantRes.data.status);
      setSubdomain(tenantRes.data.subdomain);
    } catch (err) {
      console.error('Failed to fetch patient details', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPatientData(); }, [params.id]);

  const startEditProfile = () => {
    const nameParts = patient.name.split(' ');
    setEditName(patient.name);
    setEditPhone(patient.phoneNumber.startsWith('+91') ? patient.phoneNumber : (patient.phoneNumber.length === 10 ? `+91 ${patient.phoneNumber}` : patient.phoneNumber));
    setEditAge(patient.dateOfBirth ? String(calcAge(patient.dateOfBirth)).replace(' yrs', '') : '');
    setEditGender(patient.gender || '');
    setEditingProfile(true);
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const nameParts = editName.trim().split(' ');
      await api.patch(`/patients/${patient.id}`, {
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(' ') || '.',
        phone: editPhone,
        age: editAge,
        gender: editGender,
      });
      setEditingProfile(false);
      fetchPatientData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save');
    } finally {
      setSavingProfile(false);
    }
  };

  const fireTestReminder = async (aptId: string) => {
    try {
      await api.post(`/appointments/${aptId}/test-reminder`);
      alert('Demo reminder sent to WhatsApp!');
    } catch (e) {
      alert('Failed to send demo reminder');
    }
  };

  const cancelAppointment = async (aptId: string) => {
    if (!confirm('Cancel this appointment?')) return;
    try {
      await api.patch(`/appointments/${aptId}`, { status: 'CANCELLED' });
      fetchPatientData();
    } catch (err) {
      console.error('Failed to cancel', err);
    }
  };

  const deletePatient = async () => {
    if (!confirm('Are you absolutely sure you want to permanently delete this patient? This action will archive them and halt all future automated messages.')) return;
    try {
      await api.post(`/patients/${patient.id}/archive`);
      router.push('/patients');
    } catch (err) {
      console.error('Failed to delete patient', err);
      alert('Failed to delete patient');
    }
  };

  if (loading) {
    return (
      <div className="p-8 md:p-12 w-full max-w-[1800px] mx-auto animate-pulse">
        <div className="h-4 bg-slate-100 rounded w-32 mb-8" />
        <div className="flex items-center gap-6 mb-10">
          <div className="w-20 h-20 bg-slate-100 rounded-2xl flex-shrink-0" />
          <div className="space-y-3 flex-1">
            <div className="h-7 bg-slate-100 rounded w-48" />
            <div className="h-4 bg-slate-100 rounded w-72" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-64 bg-slate-100 rounded-xl" />
            <div className="h-40 bg-slate-100 rounded-xl" />
          </div>
          <div className="space-y-4">
            <div className="h-48 bg-slate-100 rounded-xl" />
            <div className="h-32 bg-slate-100 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-8 text-center mt-20">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Patient not found</h2>
        <Button variant="outline" onClick={() => router.push('/patients')}>Back to Directory</Button>
      </div>
    );
  }

  return (
    <div className="p-8 md:p-12 w-full max-w-[1800px] mx-auto animate-in fade-in duration-500">
      <StartJourneyModal 
        isOpen={isJourneyModalOpen} 
        onClose={() => setIsJourneyModalOpen(false)} 
        patientId={patient.id} 
        onJourneyStarted={fetchPatientData}
      />
      <ScheduleAppointmentModal
        isOpen={schedulingStage !== null}
        onClose={() => setSchedulingStage(null)}
        patientId={patient.id}
        stageId={schedulingStage?.id || null}
        stageName={schedulingStage?.name || ''}
        onScheduled={fetchPatientData}
      />
      <PaymentModal
        isOpen={paymentTarget !== null}
        onClose={() => setPaymentTarget(null)}
        journeyId={paymentTarget?.journeyId || ''}
        journeyName={paymentTarget?.name || ''}
        onPaymentRecorded={fetchPatientData}
      />
      <EditStageModal
        isOpen={editingStage !== null}
        onClose={() => setEditingStage(null)}
        journeyId={editingStage?.journeyId || ''}
        stageId={editingStage?.stageId}
        initialName={editingStage?.name}
        initialCost={editingStage?.cost}
        onSaved={fetchPatientData}
      />

      <button 
        onClick={() => router.push('/patients')}
        className="flex items-center text-sm font-semibold text-slate-500 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Patients
      </button>

      {/* Profile Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 gap-4">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-2xl shadow-sm flex-shrink-0">
            {patient.name.charAt(0)}
          </div>

          {editingProfile ? (
            <div className="space-y-3">
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="block text-2xl font-extrabold text-slate-900 border-b-2 border-indigo-400 bg-transparent focus:outline-none w-full"
                placeholder="Full Name"
              />
              <div className="flex flex-wrap gap-3">
                <input
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 w-40"
                  placeholder="Phone"
                />
                <input
                  type="number"
                  value={editAge}
                  onChange={e => setEditAge(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 w-20"
                  placeholder="Age"
                  min={1} max={120}
                />
                <select
                  value={editGender}
                  onChange={e => setEditGender(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="">Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={saveProfile} disabled={savingProfile}>
                  <Check className="w-4 h-4 mr-1" />
                  {savingProfile ? 'Saving...' : 'Save'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingProfile(false)}>
                  <X className="w-4 h-4 mr-1" /> Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{patient.name}</h1>
              <div className="flex flex-wrap items-center mt-2 gap-3">
                <Badge variant={patient.status === 'ACTIVE' ? 'success' : 'secondary'}>
                  {patient.status}
                </Badge>
                {patient.gender && <Badge variant="secondary">{patient.gender}</Badge>}
                <div className="flex items-center text-sm font-medium text-slate-500">
                  <Phone className="w-4 h-4 mr-1.5" />
                  {patient.phoneNumber}
                </div>
                <div className="flex items-center text-sm font-medium text-slate-500">
                  <User className="w-4 h-4 mr-1.5" />
                  {calcAge(patient.dateOfBirth)}
                </div>
              </div>
            </div>
          )}
        </div>

        {!editingProfile && (
          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              onClick={startEditProfile}
              disabled={tenantStatus === 'READ_ONLY'}
              className={tenantStatus === 'READ_ONLY' ? 'opacity-50 cursor-not-allowed' : ''}
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
            <Button 
              onClick={() => setIsJourneyModalOpen(true)}
              disabled={tenantStatus === 'READ_ONLY'}
              className={tenantStatus === 'READ_ONLY' ? 'opacity-50 cursor-not-allowed' : ''}
            >
              <Activity className="w-4 h-4 mr-2" />
              Start Journey
            </Button>
            <Button
              variant="ghost"
              className="text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-200"
              onClick={deletePatient}
              disabled={tenantStatus === 'READ_ONLY'}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">

          {/* Treatment Journeys */}
          <Card className="overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-indigo-500" />
                Treatment Journeys
              </h2>
              <Button 
                variant="ghost" 
                size="sm" 
                className={tenantStatus === 'READ_ONLY' ? 'text-slate-400 cursor-not-allowed' : 'text-indigo-600'} 
                onClick={() => setIsJourneyModalOpen(true)}
                disabled={tenantStatus === 'READ_ONLY'}
              >
                + New Journey
              </Button>
            </div>
            
            {journeys.length === 0 ? (
              <div className="p-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-500 font-medium">No active treatment journeys for this patient.</p>
                <Button variant="outline" className="mt-4" onClick={() => setIsJourneyModalOpen(true)}>
                  Create First Journey
                </Button>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                {journeys.map(journey => (
                  <div key={journey.id} className="border border-slate-200 rounded-xl p-5 bg-white">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg">{journey.template?.name}</h3>
                        <p className="text-sm text-slate-500">Started on {new Date(journey.createdAt).toLocaleDateString('en-GB')}</p>
                        {billingData[journey.id] && (
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-xs font-semibold text-slate-500">
                              ₹{billingData[journey.id].totalPaid.toLocaleString('en-IN')} / ₹{billingData[journey.id].totalCost.toLocaleString('en-IN')}
                            </span>
                            <Badge variant={
                              billingData[journey.id].paymentStatus === 'PAID' ? 'success' :
                              billingData[journey.id].paymentStatus === 'PARTIAL' ? 'warning' : 'secondary'
                            }>
                              {billingData[journey.id].paymentStatus}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <Badge variant={journey.status === 'ACTIVE' ? 'default' : journey.status === 'COMPLETED' ? 'success' : 'secondary'}>
                          {journey.status}
                        </Badge>
                        {billingData[journey.id]?.balance > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] px-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                            onClick={() => {
                              const currentStageName = journey.stages?.find((s: any) => s.id === journey.currentStageId)?.name;
                              const baseName = journey.template?.name;
                              const finalName = [baseName, currentStageName].filter(Boolean).join(' - ') || 'Custom Treatment';
                              setPaymentTarget({ journeyId: journey.id, name: finalName });
                            }}
                            disabled={tenantStatus === 'READ_ONLY'}
                          >
                            <IndianRupee className="w-3 h-3 mr-1" />
                            Collect
                          </Button>
                        )}
                        {journey.status === 'ACTIVE' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-slate-400 hover:text-amber-500 h-7 px-2 text-[11px]"
                            title="Abort Journey"
                            disabled={tenantStatus === 'READ_ONLY'}
                            onClick={async () => {
                              if (!confirm('Abort this journey? This will mark it as CANCELLED.')) return;
                              try {
                                await api.patch(`/journeys/${journey.id}`, { status: 'CANCELLED' });
                                fetchPatientData();
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                          >
                            <X className="w-3.5 h-3.5 mr-1" />
                            Abort
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-slate-400 hover:text-red-500 h-7 w-7 p-0"
                          title="Delete Journey Permanently"
                          disabled={tenantStatus === 'READ_ONLY'}
                          onClick={async () => {
                            if (!confirm('Delete this journey permanently?')) return;
                            try {
                              await api.delete(`/journeys/${journey.id}`);
                              fetchPatientData();
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Stage Timeline */}
                    <div className="mt-6 relative w-full overflow-x-auto pb-4">
                      <div className="absolute top-4 left-0 w-[200%] h-0.5 bg-slate-100 rounded-full" />
                      <div className="relative flex gap-8 px-4 min-w-max">
                        {journey.stages.map((stage: any, idx: number) => {
                          const isComplete = stage.status === 'COMPLETED';
                          const isCurrent = journey.currentStageId === stage.id;
                          const isScheduled = appointments.some(a => a.treatmentStageId === stage.id && a.status !== 'CANCELLED');
                          return (
                            <div key={stage.id} className="flex flex-col items-center relative z-10 w-[120px]">
                              <button 
                                onClick={() => !isComplete && setEditingStage({ journeyId: journey.id, stageId: stage.id, name: stage.name, cost: stage.cost })}
                                disabled={isComplete || tenantStatus === 'READ_ONLY'}
                                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all shadow-sm ${
                                  isComplete ? 'bg-indigo-500 border-indigo-500 text-white' :
                                  isCurrent ? 'bg-white border-indigo-500 text-indigo-600 ring-4 ring-indigo-50 hover:bg-indigo-50 cursor-pointer' :
                                  'bg-white border-slate-200 text-slate-400 hover:border-slate-300 cursor-pointer'
                                }`}
                                title={!isComplete ? "Edit Stage" : ""}
                              >
                                {isComplete ? <Check className="w-4 h-4" /> : idx + 1}
                              </button>
                              
                              <div className={`text-xs mt-2 text-center font-medium leading-tight px-1 ${isCurrent ? 'text-indigo-600' : isComplete ? 'text-slate-400' : 'text-slate-500'}`}>
                                {stage.name}
                              </div>
                              {stage.cost > 0 && (
                                <div className="text-[10px] font-semibold text-slate-400 mt-0.5">
                                  ₹{stage.cost.toLocaleString()}
                                </div>
                              )}

                              {isCurrent && (
                                <div className="mt-3 flex flex-row gap-1.5 w-full">
                                  {isScheduled ? (
                                    <div className="flex gap-1 items-center flex-1">
                                      <Badge variant="secondary" className="text-[10px] flex-1 justify-center">📅 Booked</Badge>
                                      <button
                                        className="text-indigo-500 hover:text-indigo-700"
                                        title="Reschedule"
                                        onClick={() => setSchedulingStage({ id: stage.id, name: stage.name })}
                                        disabled={tenantStatus === 'READ_ONLY'}
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-[10px] px-2 flex-1"
                                      onClick={() => setSchedulingStage({ id: stage.id, name: stage.name })}
                                      disabled={tenantStatus === 'READ_ONLY'}
                                    >
                                      Schedule
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    className="h-7 text-[10px] px-2 flex-1 relative overflow-hidden"
                                    disabled={tenantStatus === 'READ_ONLY' || advancingStageId === stage.id}
                                    onClick={async () => {
                                      setAdvancingStageId(stage.id);
                                      try {
                                        await api.post(`/journeys/${journey.id}/advance`, {
                                          currentStageOrder: stage.sequenceOrder
                                        });
                                        // Optimistically update locally before fetch completes
                                        setJourneys(journeys.map(j => {
                                          if (j.id === journey.id) {
                                            const updatedStages = j.stages.map((s: any) => 
                                              s.id === stage.id ? { ...s, status: 'COMPLETED' } : s
                                            );
                                            return { ...j, stages: updatedStages };
                                          }
                                          return j;
                                        }));
                                        await fetchPatientData();
                                      } catch (err) {
                                        console.error('Failed to advance stage', err);
                                      } finally {
                                        setAdvancingStageId(null);
                                      }
                                    }}
                                  >
                                    {advancingStageId === stage.id ? (
                                      <div className="flex items-center justify-center">
                                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1" />
                                      </div>
                                    ) : (
                                      <>✓ Done</>
                                    )}
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Add custom stage button at the end */}
                        {journey.status === 'ACTIVE' && (
                          <div className="flex flex-col items-center relative z-10 w-[80px]">
                            <button
                              onClick={() => setEditingStage({ journeyId: journey.id, stageId: null, name: '', cost: 0 })}
                              className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 border-2 border-dashed border-slate-300 bg-slate-50 hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50 transition-all shadow-sm"
                              title="Add Stage"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <div className="text-[10px] mt-2 text-center font-medium text-slate-400">
                              Add Stage
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Appointments */}
          <Card className="overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center">
                <CalendarDays className="w-5 h-5 mr-2 text-indigo-500" />
                Appointments
              </h2>
            </div>
            {appointments.length === 0 ? (
              <div className="p-12 flex flex-col items-center justify-center text-center">
                <p className="text-slate-500 font-medium">No appointments yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {appointments.map(apt => (
                  <div key={apt.id} className="p-5 flex justify-between items-center bg-white hover:bg-slate-50 transition-colors">
                    <div>
                      <div className="font-bold text-slate-900">
                        {new Date(apt.scheduledStart).toLocaleDateString('en-GB')} at {new Date(apt.scheduledStart).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                      <div className="text-sm text-slate-500 mt-0.5">
                        {apt.treatmentStage?.templateStage?.name}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {apt.status === 'RESCHEDULE_REQUESTED' ? (
                        <Badge variant="destructive" className="animate-pulse bg-red-100 text-red-700 border-red-200">
                          Reschedule Req.
                        </Badge>
                      ) : (
                        <Badge variant={apt.status === 'SCHEDULED' ? 'default' : apt.status === 'CANCELLED' ? 'secondary' : 'success'}>
                          {apt.status}
                        </Badge>
                      )}
                      {apt.status === 'SCHEDULED' && (
                        <div className="flex items-center">
                          {subdomain === 'nishith' && (
                            <button
                              className="text-indigo-400 hover:text-indigo-600 transition-colors p-1 mr-1"
                              title="Send Demo WhatsApp Reminder Now"
                              onClick={() => fireTestReminder(apt.id)}
                            >
                              <Bell className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            className="text-slate-400 hover:text-red-500 transition-colors p-1"
                            title="Cancel"
                            onClick={() => cancelAppointment(apt.id)}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          <Card>
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-base font-bold text-slate-900">Patient Info</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-500">Name</span>
                <span className="text-sm font-bold text-slate-900">{patient.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-500">Phone</span>
                <span className="text-sm font-bold text-slate-900">{patient.phoneNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-500">Age</span>
                <span className="text-sm font-bold text-slate-900">{calcAge(patient.dateOfBirth)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-500">Gender</span>
                <span className="text-sm font-bold text-slate-900">{patient.gender || '—'}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <span className="text-sm font-medium text-slate-500">Registered</span>
                <span className="text-sm font-bold text-slate-900">{new Date(patient.createdAt).toLocaleDateString('en-GB')}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <span className="text-sm font-medium text-slate-500">Total Visits</span>
                <span className="text-sm font-bold text-slate-900">{appointments.filter(a => a.status !== 'CANCELLED').length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-500">Active Journeys</span>
                <span className="text-sm font-bold text-slate-900">{journeys.filter(j => j.status === 'ACTIVE').length}</span>
              </div>
            </div>
          </Card>

          <Card>
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Clinical Notes</h2>
              <Button variant="ghost" size="sm">Add</Button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-500 italic">No notes have been added yet.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
