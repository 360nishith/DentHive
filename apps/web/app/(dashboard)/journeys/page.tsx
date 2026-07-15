'use client';

import React, { useEffect, useState } from 'react';
import api from '../../../lib/axios';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Activity, Clock, User, Phone, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { useRouter } from 'next/navigation';

export default function JourneysPage() {
  const router = useRouter();
  const [journeys, setJourneys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJourneys = async () => {
    try {
      // The backend /journeys endpoint might just get all journeys.
      const res = await api.get('/journeys');
      // Filter for only ACTIVE journeys (not COMPLETED or CANCELLED)
      const active = res.data.filter((j: any) => j.status === 'ACTIVE');
      setJourneys(active);
    } catch (err) {
      console.error('Failed to fetch journeys', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJourneys();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <Clock className="w-6 h-6 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 md:p-12 w-full max-w-[1800px] mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center">
            <Activity className="w-8 h-8 mr-3 text-indigo-500" />
            Active Journeys
          </h1>
          <p className="text-slate-500 mt-2">All ongoing patient treatment plans that are not yet completed.</p>
        </div>
      </div>

      {journeys.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-1">No Active Journeys</h3>
          <p className="text-slate-500">All treatments are completed, or you haven't started any yet.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {journeys.map((journey) => {
            // Find current stage
            const currentStage = journey.stages?.find((s: any) => s.id === journey.currentStageId);
            const totalStages = journey.stages?.length || 0;
            const completedStages = journey.stages?.filter((s: any) => s.status === 'COMPLETED').length || 0;
            
            // Check if Stalled (No Scheduled Appointment for current stage)
            const hasScheduled = currentStage?.appointments?.some((a: any) => a.status === 'SCHEDULED');
            const isStalled = currentStage && !hasScheduled;

            return (
              <Card key={journey.id} className="p-5 hover:shadow-md transition-shadow flex flex-col relative overflow-hidden group">
                {isStalled && <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />}
                {!isStalled && <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />}
                
                <div className="flex justify-between items-start mb-4">
                  <div className="flex flex-col">
                    <div className="flex items-center">
                      <span className="font-bold text-lg text-slate-900">{journey.patient?.name}</span>
                      {journey.doctor && (
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded ml-2">
                          Dr. {journey.doctor.lastName}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 flex items-center mt-1">
                      <Phone className="w-3 h-3 mr-1" /> {journey.patient?.phoneNumber}
                    </span>
                  </div>
                  {isStalled ? (
                    <Badge variant="warning" className="border-amber-200">Stalled</Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-indigo-50 text-indigo-700">On Track</Badge>
                  )}
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 mb-4 flex-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Treatment</p>
                  <p className="text-sm font-bold text-slate-800">
                    {journey.template?.name || 'Custom Journey'}
                  </p>
                  
                  <div className="mt-3 flex items-center justify-between text-xs font-medium">
                    <span className="text-slate-600">Progress</span>
                    <span className="text-slate-900">{completedStages} / {totalStages} Stages</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                    <div 
                      className={`h-full ${isStalled ? 'bg-amber-400' : 'bg-indigo-500'}`}
                      style={{ width: `${totalStages > 0 ? (completedStages / totalStages) * 100 : 0}%` }}
                    />
                  </div>

                  <div className="mt-4 text-xs">
                    <span className="text-slate-500 block mb-0.5">Current Stage:</span>
                    {currentStage ? (
                      <span className={`font-semibold ${isStalled ? 'text-amber-600' : 'text-indigo-600'}`}>
                        {currentStage.name}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">None</span>
                    )}
                  </div>
                </div>

                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => router.push(`/patients/${journey.patientId}`)}
                >
                  View Profile <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
