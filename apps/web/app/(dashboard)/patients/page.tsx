'use client';

import React, { useEffect, useState } from 'react';
import api from '../../../lib/axios';
import { 
  Search, 
  Plus, 
  Users, 
  ChevronRight,
  MoreVertical,
  Phone,
  Clock
} from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { AddPatientModal } from '../../../components/patients/AddPatientModal';
import { useRouter, useSearchParams } from 'next/navigation';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

interface Patient {
  id: string;
  name: string;
  phoneNumber: string;
  gender: string | null;
  dateOfBirth: string | null;
  status: string;
  createdAt: string;
}

import { supabase } from '../../../lib/supabase';

function calcAge(dob: string | null): string {
  if (!dob) return '—';
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)) + ' yrs';
}

export default function PatientsDirectory() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isTourMode, setIsTourMode] = useState(false);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [currentUserRole, setCurrentUserRole] = useState('ADMIN');

  const [tenantStatus, setTenantStatus] = useState('ACTIVE');

  const startTour = () => {
    setIsTourMode(true);
    const tourObj = driver({
      showProgress: true,
      animate: true,
      onDestroyed: () => setIsTourMode(false),
      steps: [
        { element: '#tour-patient-search', popover: { title: 'Find Patients Fast', description: 'Search by name or phone number to instantly pull up a patient record.', side: 'bottom', align: 'start' } },
        { element: '#tour-add-patient', popover: { title: 'Register New Patient', description: 'Click here to add a new patient. Once added, you can start their treatment journey.', side: 'bottom', align: 'end' } },
        { element: '#tour-patient-table', popover: { title: 'Patient Directory', description: 'Click anywhere on a patient\'s row to open their full CRM profile, view their medical history, and manage their appointments.', side: 'top', align: 'start' } }
      ]
    });
    tourObj.drive();
  };

  useEffect(() => {
    if (searchParams.get('tour') === 'true') {
      router.replace('/patients');
      setTimeout(startTour, 500);
    }
  }, [searchParams]);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const role = session?.user?.app_metadata?.role || session?.user?.user_metadata?.role || 'ADMIN';
      setCurrentUserRole(role);

      let url = `/patients?search=${search}`;
      if (selectedDoctorId) {
        url += `&doctorId=${selectedDoctorId}`;
      }

      const res = await api.get(url);
      setPatients(res.data.data);
      
      const tenantRes = await api.get('/tenant');
      setTenantStatus(tenantRes.data.status);

      if (role === 'STAFF') {
        const uRes = await api.get('/users');
        setDoctors(uRes.data.filter((u: any) => u.role?.name === 'DENTIST' || u.role?.name === 'ADMIN'));
      }
    } catch (err) {
      console.error('Failed to fetch patients', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      fetchPatients();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, selectedDoctorId]);

  return (
    <div className="p-8 md:p-12 w-full max-w-[1800px] mx-auto animate-in fade-in duration-500">
      
      {/* Page Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Patient Directory</h1>
          <p className="text-sm text-slate-500 mt-1">Manage and search your entire clinic patient list.</p>
        </div>
        <div className="mt-4 md:mt-0" id="tour-add-patient">
          <Button 
            onClick={() => setIsModalOpen(true)}
            disabled={tenantStatus === 'READ_ONLY'}
            className={tenantStatus === 'READ_ONLY' ? 'opacity-50 cursor-not-allowed' : ''}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Patient
          </Button>
        </div>
      </div>

      <Card className="flex flex-col overflow-hidden">
        
        {/* Toolbar */}
        <div id="tour-patient-search" className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4 w-full max-w-2xl">
            <div className="relative w-full max-w-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors shadow-sm"
                placeholder="Search by name or phone..."
              />
            </div>
            {(currentUserRole === 'STAFF' || currentUserRole === 'ADMIN') && (currentUserRole === 'STAFF' ? doctors.length > 0 : true) && (
              <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2 flex-shrink-0">
                <span className="text-sm font-medium text-slate-500">Doctor:</span>
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    className="bg-transparent text-sm font-semibold text-slate-900 outline-none cursor-pointer"
                  >
                    {currentUserRole === 'STAFF' ? (
                      <option value="">All Doctors</option>
                    ) : (
                      <option value="">My Patients</option>
                    )}
                    <option value="UNASSIGNED">Unassigned Patients</option>
                    {currentUserRole === 'STAFF' && doctors.map(d => (
                      <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName}</option>
                    ))}
                  </select>
              </div>
            )}
          </div>
          
          <div className="text-sm font-medium text-slate-500 flex items-center">
            <Users className="w-4 h-4 mr-2" />
            {patients.length} Patients
          </div>
        </div>

        {/* Data Table */}
        <div id="tour-patient-table" className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th scope="col" className="px-6 py-3 font-medium border-b border-slate-200">Name</th>
                <th scope="col" className="px-6 py-3 font-medium border-b border-slate-200">Contact</th>
                <th scope="col" className="px-6 py-3 font-medium border-b border-slate-200">Age / Gender</th>
                <th scope="col" className="px-6 py-3 font-medium border-b border-slate-200">Status</th>
                <th scope="col" className="px-6 py-3 font-medium border-b border-slate-200 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-8 h-8 bg-slate-100 rounded-full" /><div className="h-3.5 bg-slate-100 rounded w-32" /></div></td>
                    <td className="px-6 py-4"><div className="h-3.5 bg-slate-100 rounded w-28" /></td>
                    <td className="px-6 py-4"><div className="h-3.5 bg-slate-100 rounded w-16" /></td>
                    <td className="px-6 py-4"><div className="h-5 bg-slate-100 rounded-full w-14" /></td>
                    <td className="px-6 py-4 text-right"><div className="h-5 bg-slate-100 rounded w-5 ml-auto" /></td>
                  </tr>
                ))
              ) : patients.length === 0 && !isTourMode ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Users className="w-6 h-6 text-slate-400" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mb-1">No patients found</h3>
                    <p className="text-sm text-slate-500 mb-4">Get started by adding your first patient.</p>
                    <Button variant="outline" onClick={() => setIsModalOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" /> Add Patient
                    </Button>
                  </td>
                </tr>
              ) : (
                <>
                  {patients.length === 0 && isTourMode && (
                    <tr className="hover:bg-slate-50/80 transition-colors cursor-pointer group">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs mr-3 border border-indigo-100">
                            E
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                              Example Patient
                            </span>
                            <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-700 hover:bg-amber-100">Demo Data</Badge>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-slate-600 font-medium">
                          <Phone className="w-3 h-3 mr-2 text-slate-400" />
                          +91 98765 43210
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-700">30 yrs</span>
                          <Badge variant="secondary">Male</Badge>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="success">Active</Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="icon" className="text-slate-400">
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  )}
                  {patients.map((patient) => (
                  <tr 
                    key={patient.id} 
                    onClick={() => router.push(`/patients/${patient.id}`)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs mr-3 border border-indigo-100">
                          {patient.name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {patient.name}
                          </span>
                          {patient.doctor ? (
                            <span className="text-[10px] font-bold text-slate-400 mt-0.5">
                              Dr. {patient.doctor.firstName} {patient.doctor.lastName}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-rose-500 mt-0.5">
                              UNASSIGNED
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-slate-600 font-medium">
                        <Phone className="w-3 h-3 mr-2 text-slate-400" />
                        {patient.phoneNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-700">{calcAge(patient.dateOfBirth)}</span>
                        {patient.gender && (
                          <Badge variant="secondary">{patient.gender}</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {patient.status === 'ACTIVE' ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Archived</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="icon" className="text-slate-400">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </td>
                    </tr>
                  ))
                }
                </>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <AddPatientModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => {
          setIsModalOpen(false);
          fetchPatients();
        }}
      />
    </div>
  );
}
