'use client';

import React, { useState, useEffect } from 'react';
import api from '../../lib/axios';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { Building, User, Phone, CheckCircle, Loader2 } from 'lucide-react';

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // Form State
  const [clinicName, setClinicName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  // Protect the route
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      }
    };
    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Create the Clinic and the User Record
      await api.post('/tenant', {
        name: clinicName,
        subdomain,
        userFirstName: firstName,
        userLastName: lastName,
        userPhone: phone,
      });

      // The backend injected the new tenantId into Supabase app_metadata
      // We MUST refresh the session to pull down the new JWT!
      const { data, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !data.session) {
        throw new Error('Failed to refresh session with new credentials');
      }

      // Save the new token so axios picks it up
      localStorage.setItem('supabase.auth.token', JSON.stringify(data));

      // Go to dashboard!
      router.push('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || err.message || 'Failed to create clinic');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Decorative background */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-primary-100 blur-3xl opacity-50" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-blue-100 blur-3xl opacity-50" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <h2 className="mt-6 text-center text-4xl font-extrabold text-slate-900 tracking-tight">
          Welcome to DentHive
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 font-medium">
          Let's set up your clinic so you can get started.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl relative z-10">
        <div className="bg-white/80 backdrop-blur-xl py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-3xl sm:px-10 border border-white">
          
          {/* Progress Steps */}
          <div className="mb-8 flex justify-center space-x-4">
            <div className={`h-2 flex-1 rounded-full ${step === 1 ? 'bg-primary-500' : 'bg-primary-100'}`} />
            <div className={`h-2 flex-1 rounded-full ${step === 2 ? 'bg-primary-500' : 'bg-slate-100'}`} />
          </div>

          <form onSubmit={step === 1 ? (e) => { e.preventDefault(); setStep(2); } : handleSubmit} className="space-y-6">
            
            {error && (
              <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl font-medium border border-red-100">
                {error}
              </div>
            )}

            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2 bg-primary-100 rounded-lg">
                    <Building className="w-6 h-6 text-primary-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Clinic Details</h3>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Clinic Name</label>
                    <input
                      type="text"
                      required
                      value={clinicName}
                      onChange={(e) => setClinicName(e.target.value)}
                      className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      placeholder="e.g. SmileCare Dental"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Subdomain</label>
                    <div className="flex rounded-xl shadow-sm">
                      <input
                        type="text"
                        required
                        value={subdomain}
                        onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                        className="flex-1 min-w-0 block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-l-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                        placeholder="smilecare"
                      />
                      <span className="inline-flex items-center px-4 rounded-r-xl border border-l-0 border-slate-200 bg-slate-100 text-slate-500 sm:text-sm font-medium">
                        .denthive.com
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-8 flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-all"
                >
                  Continue to Personal Details
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Administrator Profile</h3>
                </div>

                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">First Name</label>
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                        placeholder="Sarah"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Last Name</label>
                      <input
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                        placeholder="Connor"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Phone Number</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex space-x-4 mt-8">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 py-4 px-4 border border-slate-200 rounded-xl shadow-sm text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 transition-all"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-[2] flex justify-center items-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Complete Setup
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
