'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Building, Building2, Settings as SettingsIcon, Settings, CreditCard, MessageSquare, Users, Loader2, Link2, CheckCircle2, Save, Plus, Download, AlertOctagon, Layout } from 'lucide-react';
import api from '../../../lib/axios';
import { supabase } from '../../../lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import PrintLayoutDesigner from './PrintLayoutDesigner';
import MedicinesManager from './MedicinesManager';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', upiVpa: '', waPhoneNumberId: '', waAccessToken: '', waAppSecret: '', contactPhone: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'whatsapp' | 'staff' | 'billing' | 'danger' | 'print_layout' | 'medicines'>('profile');
  const [userEmail, setUserEmail] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState('');
  const [waConnected, setWaConnected] = useState(false);
  const [staff, setStaff] = useState<any[]>([]);
  const [prices, setPrices] = useState({ 
    standard: Number(process.env.NEXT_PUBLIC_SAAS_PRICE_STANDARD || 2499), 
    discounted: Number(process.env.NEXT_PUBLIC_SAAS_PRICE_DISCOUNTED || 1999) 
  });
  const [wiping, setWiping] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    roleName: 'STAFF',
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });
  const [inviting, setInviting] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();

  const startTour = () => {
    const tourObj = driver({
      showProgress: true,
      animate: true,
      steps: [
        { element: '#tour-settings-nav', popover: { title: 'Settings Menu', description: 'Navigate between your clinic profile, team management, and billing settings.', side: 'right', align: 'start' } },
        { element: '#tour-settings-staff-btn', popover: { title: 'Staff & Team', description: 'Click here to invite receptionists and doctors. Staff accounts have restricted access.', side: 'right', align: 'start' } },
        { element: '#tour-settings-wa-btn', popover: { title: 'WhatsApp Integration', description: 'Configure your Meta API keys here to enable automated patient reminders.', side: 'right', align: 'start' } },
        { element: '#tour-settings-billing-btn', popover: { title: 'Billing & Subscriptions', description: 'Manage your Razorpay autopilot subscription and check your current plan limits.', side: 'right', align: 'start' } }
      ]
    });
    tourObj.drive();
  };

  useEffect(() => {
    if (searchParams.get('tour') === 'true') {
      router.replace('/settings');
      setTimeout(startTour, 500);
    }
  }, [searchParams]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) setUserEmail(session.user.email);
      if (session?.user?.app_metadata?.role) setCurrentUserRole(session.user.app_metadata.role);
    });

    Promise.all([
      api.get('/tenant'),
      api.get('/users'),
      api.get('/billing/prices').catch(() => ({ 
        data: { 
          standard: Number(process.env.NEXT_PUBLIC_SAAS_PRICE_STANDARD || 2499), 
          discounted: Number(process.env.NEXT_PUBLIC_SAAS_PRICE_DISCOUNTED || 1999) 
        } 
      }))
    ]).then(([tenantRes, usersRes, pricesRes]) => {
      if (tenantRes.data) {
        setTenant(tenantRes.data);
        setFormData({ 
          name: tenantRes.data.name || '', 
          upiVpa: tenantRes.data.upiVpa || '',
          waPhoneNumberId: tenantRes.data.waPhoneNumberId || '',
          waAccessToken: tenantRes.data.waAccessToken || '',
          waAppSecret: tenantRes.data.waAppSecret || '',
          contactPhone: tenantRes.data.contactPhone || '',
          logoUrl: tenantRes.data.logoUrl || '',
          defaultPaperSize: tenantRes.data.defaultPaperSize || 'A4',
          printConfig: tenantRes.data.printConfig || { elements: [] }
        });
        if (tenantRes.data.waAccessToken) {
          setWaConnected(true);
        }
      }
      if (usersRes.data) {
        setStaff(usersRes.data);
      }
      if (pricesRes.data) {
        setPrices(pricesRes.data);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/tenant', formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteForm.roleName === 'DENTIST') {
      const extraCost = (prices as any).extraDoctor || 2000;
      const isTrial = tenant?.status === 'TRIAL';
      const confirmBilling = confirm(`Adding a DENTIST is free during your trial, but will add ₹${extraCost}/month to your subscription once the trial ends or if you are already on a paid plan. Do you want to proceed?`);
      if (!confirmBilling) return;
    }

    setInviting(true);
    try {
      await api.post('/auth/invite', inviteForm);
      alert(`${inviteForm.roleName} created successfully! They can now log in using the email and password provided.`);
      const res = await api.get('/users');
      setStaff(res.data);
      setShowInviteModal(false);
      setInviteForm({ roleName: 'STAFF', firstName: '', lastName: '', email: '', password: '' });
    } catch (err: any) {
      alert('Failed to invite staff: ' + (err.response?.data?.message || err.message));
    } finally {
      setInviting(false);
    }
  };

  const connectWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/tenant', formData);
      setWaConnected(true);
      setTenant((prev: any) => ({ ...prev, waAccessToken: formData.waAccessToken }));
      alert('WhatsApp keys saved successfully!');
    } catch (e: any) {
      alert("Failed to save WhatsApp keys: " + (e.response?.data?.message || e.message));
    } finally {
      setSaving(false);
    }
  };

  const deleteStaff = async (id: string) => {
    const confirmation = prompt('Are you sure you want to remove this staff member? This will instantly revoke their access. Type "REMOVE" to confirm.');
    if (confirmation !== 'REMOVE') {
      alert('Removal cancelled.');
      return;
    }
    try {
      await api.delete(`/users/${id}`);
      setStaff(staff.filter(s => s.id !== id));
    } catch (err) {
      alert('Failed to remove staff');
    }
  };

  const [subscribing, setSubscribing] = useState(false);
  const [upgradingCycle, setUpgradingCycle] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'semi_annual' | 'annual'>('monthly');

  const handleResetDemo = async () => {
    const confirmation = prompt('DANGER: This will instantly wipe ALL patients, appointments, and revenue from the database. It cannot be undone. Type "RESET" to confirm.');
    if (confirmation !== 'RESET') {
      if (confirmation) alert('Confirmation failed. Data was not wiped.');
      return;
    }
    
    setWiping(true);
    try {
      await api.delete('/tenant/demo-data');
      alert('Demo data wiped successfully. The dashboard is now clean.');
      window.location.reload();
    } catch (e: any) {
      alert('Failed to wipe demo data: ' + (e.response?.data?.message || e.message));
    } finally {
      setWiping(false);
    }
  };

  const [payingArrears, setPayingArrears] = useState(false);

  const handlePayArrears = async () => {
    setPayingArrears(true);
    try {
      const res = await api.post('/billing/pay-arrears');
      const order = res.data;
      
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        order_id: order.id,
        name: formData.name || 'DentHive',
        description: `Pay Outstanding Balance`,
        handler: async function (response: any) {
          alert('Outstanding balance paid successfully! Thank you.');
          window.location.reload();
        },
        prefill: {
          name: 'Admin',
        },
        theme: {
          color: '#ef4444' // red theme for arrears
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        alert('Payment failed. Please try again.');
      });
      rzp.open();
    } catch (err: any) {
      alert('Failed to initialize payment: ' + (err.response?.data?.message || err.message));
    } finally {
      setPayingArrears(false);
    }
  };

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      const res = await api.post('/billing/checkout', { billingCycle });
      const order = res.data;
      
      const cycleText = billingCycle === 'annual' ? 'Annual' : (billingCycle === 'semi_annual' ? '6-Month' : 'Monthly');

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        order_id: order.id,
        name: formData.name || 'DentHive',
        description: `${cycleText} Pre-Paid Pass`,
        handler: async function (response: any) {
          alert(`Payment Successful! Your clinic is now activated for the ${cycleText} cycle.`);
          window.location.reload();
        },
        prefill: {
          name: 'Admin',
        },
        theme: {
          color: '#4f46e5'
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        alert('Payment failed. Please try again.');
      });
      rzp.open();
    } catch (err: any) {
      console.error(err);
      alert('Failed to initialize Razorpay checkout');
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2 tracking-tight">
          <SettingsIcon className="w-6 h-6 text-indigo-500" />
          Settings
        </h1>
        <p className="text-sm text-slate-500 mt-1">Manage your clinic preferences and billing.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0">
          <nav id="tour-settings-nav" className="flex overflow-x-auto md:flex-col space-x-2 md:space-x-0 md:space-y-1 pb-2 md:pb-0 hide-scrollbar">
            <button 
              onClick={() => setActiveTab('profile')}
              className={`flex-shrink-0 whitespace-nowrap md:w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <Building2 className="w-4 h-4" /> Clinic Profile
            </button>
            <button 
              onClick={() => setActiveTab('print_layout')}
              className={`flex-shrink-0 whitespace-nowrap md:w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'print_layout' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <Layout className="w-4 h-4" /> Print Layout
            </button>
            <button 
              onClick={() => setActiveTab('medicines')}
              className={`flex-shrink-0 whitespace-nowrap md:w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'medicines' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <SettingsIcon className="w-4 h-4" /> Medicines
            </button>
            
            {currentUserRole !== 'DENTIST' && (
              <>
                <button 
                  id="tour-settings-staff-btn"
                  onClick={() => setActiveTab('staff')}
                  className={`flex-shrink-0 whitespace-nowrap md:w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'staff' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  <Users className="w-4 h-4" /> Staff & Team
                </button>
                <button 
                  id="tour-settings-wa-btn"
                  onClick={() => setActiveTab('whatsapp')}
                  className={`flex-shrink-0 whitespace-nowrap md:w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'whatsapp' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  <MessageSquare className="w-4 h-4" /> WhatsApp API
                </button>
                <button 
                  id="tour-settings-billing-btn"
                  onClick={() => setActiveTab('billing')}
                  className={`flex-shrink-0 whitespace-nowrap md:w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'billing' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  <CreditCard className="w-4 h-4" /> Billing & Plan
                </button>
              </>
            )}
            {['nishithdharmaraj@gmail.com', 'salesdemo@denthive.in', 'doctordemo@denthive.in'].includes(userEmail || '') && (
              <button 
                onClick={() => setActiveTab('danger')}
                className={`flex-shrink-0 whitespace-nowrap md:w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'danger' ? 'bg-red-50 text-red-700' : 'text-red-600 hover:bg-red-50 hover:text-red-700'}`}
              >
                <AlertOctagon className="w-4 h-4" /> Danger Zone
              </button>
            )}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'profile' && (
            <Card className="p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-6">Clinic Information</h2>
              <form onSubmit={handleSave} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Clinic Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    disabled={currentUserRole !== 'ADMIN'}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Clinic Contact Phone</label>
                    <input
                      type="text"
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({...formData, contactPhone: e.target.value})}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <p className="text-xs text-slate-500 mt-1">This number will be sent to patients in automated WhatsApp messages (e.g. cancellations) so they can call you.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">UPI VPA</label>
                  <input
                    type="text"
                    value={formData.upiVpa}
                    onChange={(e) => setFormData({...formData, upiVpa: e.target.value})}
                    placeholder="e.g. clinic@okaxis"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <p className="text-xs text-slate-500 mt-1">Payments will be routed directly to this UPI address.</p>
                </div>
                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    disabled={saving}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-medium text-sm transition-colors"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saved ? 'Saved!' : 'Save Changes'}
                  </button>
                </div>
              </form>

              {currentUserRole !== 'STAFF' && (
                <div className="mt-8 pt-6 border-t border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900 mb-2">Data Management</h3>
                  <p className="text-xs text-slate-500 mb-4">Export all of your patient, journey, and appointment data. You own your data.</p>
                  <button
                    onClick={async () => {
                      try {
                        const res = await api.get('/tenant/export');
                        const blob = new Blob([res.data.csv], { type: 'text/csv' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `denthive_backup_${new Date().toISOString().split('T')[0]}.csv`;
                        a.click();
                        window.URL.revokeObjectURL(url);
                      } catch (e) {
                        alert('Failed to export data');
                      }
                    }}
                    className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Export Data to CSV
                  </button>
                </div>
              )}
            </Card>
          )}

          {activeTab === 'print_layout' && (
            <Card className="p-6">
              <PrintLayoutDesigner formData={formData} setFormData={setFormData} onSave={handleSave} saving={saving} />
            </Card>
          )}

          {activeTab === 'medicines' && (
            <Card className="p-6">
              <MedicinesManager />
            </Card>
          )}

          {activeTab === 'staff' && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-900">Staff & Team</h2>
                <button onClick={() => setShowInviteModal(true)} className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
                  <Plus className="w-4 h-4" /> Invite Staff
                </button>
              </div>
              <p className="text-sm text-slate-500 mb-4">Staff members have restricted access. They cannot view Revenue, Analytics, or Settings.</p>
              
              <div className="space-y-3">
                {staff.map((s, i) => {
                  const roleName = s.role?.name || 'STAFF';
                  return (
                    <div key={i} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg bg-slate-50">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900">{s.firstName} {s.lastName}</p>
                          {s.status === 'ARREARS_PENDING' && (
                            <span className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                              Payment Pending
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{s.email}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${roleName === 'ADMIN' ? 'bg-purple-100 text-purple-700' : roleName === 'DENTIST' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-700'}`}>
                          {roleName}
                        </span>
                        {roleName !== 'ADMIN' && (
                          <button onClick={() => deleteStaff(s.id)} className="text-red-500 hover:text-red-600 text-sm font-medium">Remove</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {activeTab === 'whatsapp' && (
            <Card className="p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-100 pb-4">WhatsApp Integration</h2>
              
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    Meta Cloud API 
                    {waConnected ? (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] uppercase font-bold rounded-full tracking-wider flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Connected</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] uppercase font-bold rounded-full tracking-wider">Not Configured</span>
                    )}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">Automated reminders and post-op nudges require Meta integration.</p>
                </div>
              </div>

              {/* Webhook UI removed for BYOS architecture */}

              <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg space-y-4 mt-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Permanent Access Token</label>
                    <input type="password" autoComplete="new-password" value={formData.waAccessToken} onChange={e => setFormData({...formData, waAccessToken: e.target.value})} placeholder="EAABw..." className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Phone Number ID</label>
                    <input type="text" autoComplete="off" value={formData.waPhoneNumberId} onChange={e => setFormData({...formData, waPhoneNumberId: e.target.value})} placeholder="10239..." className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">App Secret</label>
                    <input type="password" autoComplete="new-password" value={formData.waAppSecret} onChange={e => setFormData({...formData, waAppSecret: e.target.value})} placeholder="a1b2c3d4..." className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none" />
                  </div>
                  <Button onClick={connectWhatsApp} disabled={saving} className="bg-indigo-600 text-white w-full">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Link2 className="w-4 h-4 mr-2" />}
                    {saving ? 'Connecting...' : 'Save Meta Keys'}
                  </Button>
                </div>
            </Card>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-6">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    {tenant?.subscriptions?.some((s: any) => ['ACTIVE', 'PENDING'].includes(s.status) && new Date(s.currentPeriodEnd).getTime() > Date.now()) ? (
                      <>
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          Current Plan: <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs uppercase font-bold rounded-full tracking-wider">Subscribed</span>
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                          {tenant.subscriptions.find((s: any) => ['ACTIVE', 'PENDING'].includes(s.status)).cancelAtPeriodEnd 
                            ? `Your subscription will end on ${new Date(tenant.subscriptions.find((s: any) => ['ACTIVE', 'PENDING'].includes(s.status)).currentPeriodEnd).toLocaleDateString('en-GB')}. You will not be charged again.`
                            : `Your autopilot subscription renews on ${new Date(tenant.subscriptions.find((s: any) => ['ACTIVE', 'PENDING'].includes(s.status)).currentPeriodEnd).toLocaleDateString('en-GB')}.`
                          }
                        </p>
                      </>
                    ) : (
                      (() => {
                        const hasOldSub = tenant?.subscriptions?.some((s: any) => ['ACTIVE', 'PENDING'].includes(s.status));
                        const daysUsed = tenant?.createdAt ? Math.floor((Date.now() - new Date(tenant.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;
                        const isExpired = hasOldSub || daysUsed > 30;
                        const daysLeft = Math.max(0, 30 - daysUsed);

                        return (
                          <>
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                              Current Plan: 
                              {isExpired ? (
                                <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs uppercase font-bold rounded-full tracking-wider">Expired</span>
                              ) : (
                                <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs uppercase font-bold rounded-full tracking-wider">Free Trial</span>
                              )}
                            </h2>
                            <p className="text-sm text-slate-500 mt-1">
                              {isExpired ? (
                                <>{hasOldSub ? 'Your subscription has expired. Please renew to restore full access to your dashboard.' : 'Your 30-day free trial has expired. Please subscribe to restore full access to your dashboard.'}</>
                              ) : (
                                <>Your 30-day trial expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}. Subscribe to prevent service interruption.</>
                              )}
                            </p>
                          </>
                        );
                      })()
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="font-bold text-xl text-slate-900">
                        DentHive {(tenant?.waAccessToken && tenant?.waPhoneNumberId) ? 'BYOS' : 'Unified'} 
                        {billingCycle === 'annual' ? ' Annual' : (billingCycle === 'semi_annual' ? ' 6-Month' : '')} Plan
                      </h3>
                      <p className="text-slate-500 text-sm mt-1">{(tenant?.waAccessToken && tenant?.waPhoneNumberId) ? 'Bring your own WhatsApp SIM.' : 'Everything you need to run your clinic.'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-slate-900">
                        ₹{(() => {
                          const base = (tenant?.waAccessToken && tenant?.waPhoneNumberId) ? prices.discounted : prices.standard;
                          const dentistCount = staff.filter(s => s.role?.name === 'DENTIST').length;
                          const extraCost = (prices as any).extraDoctor ? dentistCount * (prices as any).extraDoctor : dentistCount * 2000;
                          let finalPrice = base + extraCost;
                          if (billingCycle === 'semi_annual') {
                            finalPrice = Math.round(finalPrice * 6 * 0.95);
                          } else if (billingCycle === 'annual') {
                            finalPrice = Math.round(finalPrice * 12 * 0.90);
                          }
                          return finalPrice.toLocaleString('en-IN');
                        })()}
                        <span className="text-sm font-medium text-slate-500">
                          {billingCycle === 'annual' ? '/year' : (billingCycle === 'semi_annual' ? '/6-months' : '/month')}
                        </span>
                      </p>
                      {staff.filter(s => s.role?.name === 'DENTIST').length > 0 && (
                        <p className="text-xs text-slate-500 mt-1">
                          (Includes ₹{(() => {
                            const extra = ((prices as any).extraDoctor || 2000) * staff.filter(s => s.role?.name === 'DENTIST').length;
                            if (billingCycle === 'semi_annual') return Math.round(extra * 6 * 0.95).toLocaleString('en-IN');
                            if (billingCycle === 'annual') return Math.round(extra * 12 * 0.90).toLocaleString('en-IN');
                            return extra.toLocaleString('en-IN');
                          })()} for {staff.filter(s => s.role?.name === 'DENTIST').length} extra dentist{staff.filter(s => s.role?.name === 'DENTIST').length > 1 ? 's' : ''})
                        </p>
                      )}
                    </div>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {[
                      'Unlimited Patient Journeys & Appointments', 
                      `Automated WhatsApp Reminders & Recalls via ${(tenant?.waAccessToken && tenant?.waPhoneNumberId) ? 'Your Own SIM' : 'DentalHive SIM'}`, 
                      'Advanced Revenue Analytics', 
                      'Dynamic UPI QR Generation', 
                      'Unlimited Staff Accounts'
                    ].map((feature, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm font-medium text-slate-700">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {!(tenant?.waAccessToken && tenant?.waPhoneNumberId) && (
                    <div className="mb-6 p-4 bg-indigo-50/80 border border-indigo-100 rounded-xl flex items-start space-x-3">
                      <div className="p-2 bg-white rounded-lg shrink-0 shadow-sm border border-indigo-100/50">
                        <MessageSquare className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        {prices.discounted > prices.standard ? (
                          <>
                            <h5 className="text-sm font-bold text-indigo-900">Want to use your own clinic's phone number?</h5>
                            <p className="text-[13px] text-indigo-700 mt-1 leading-snug">
                              Upgrade to the <strong>BYOS Plan</strong> for just <strong>₹{prices.discounted - prices.standard}</strong> more per month! Use your own dedicated WhatsApp number for all patient communications. Contact our team for a seamless Meta integration setup.
                            </p>
                          </>
                        ) : (
                          <>
                            <h5 className="text-sm font-bold text-indigo-900">Want to save ₹{prices.standard - prices.discounted} every month?</h5>
                            <p className="text-[13px] text-indigo-700 mt-1 leading-snug">
                              Switch to the <strong>BYOS Plan</strong>. Use your own clinic's phone number for patient communications and your monthly subscription will automatically drop to <strong>₹{prices.discounted}/month</strong>! Contact our team for a one-time seamless Meta integration setup.
                            </p>
                          </>
                        )}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-3">
                          <Button 
                            size="sm"
                            className="bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-bold h-8 shadow-sm justify-center w-full sm:w-auto" 
                            onClick={() => window.open('https://wa.me/916361953329?text=Hi! I want to request the Done-For-You WhatsApp BYOS setup for my clinic.', '_blank')}
                          >
                            Request 1-on-1 Setup
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-50 text-xs font-bold h-8 justify-center w-full sm:w-auto" 
                            onClick={() => setActiveTab('whatsapp')}
                          >
                            I have my own keys
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                      <button
                        onClick={() => setBillingCycle('monthly')}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all ${billingCycle === 'monthly' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}
                      >
                        Monthly
                      </button>
                      <button
                        onClick={() => setBillingCycle('semi_annual')}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${billingCycle === 'semi_annual' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}
                      >
                        6 Months <span className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0.5 rounded-full">5% OFF</span>
                      </button>
                      <button
                        onClick={() => setBillingCycle('annual')}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${billingCycle === 'annual' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}
                      >
                        Annual <span className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0.5 rounded-full">10% OFF</span>
                      </button>
                    </div>

                    {tenant?.pendingArrears > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col gap-3">
                        <div className="flex items-start gap-3">
                          <AlertOctagon className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                          <div>
                            <h4 className="text-sm font-bold text-red-900">Outstanding Balance: ₹{tenant.pendingArrears}</h4>
                            <p className="text-xs text-red-700 mt-1">
                              You have unpaid charges for adding new doctors mid-cycle. This balance will be automatically added to your next pass purchase, or you can pay it right now to clear your account.
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={handlePayArrears}
                          disabled={payingArrears}
                          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-10"
                        >
                          {payingArrears ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                          {payingArrears ? 'Initializing...' : `Pay ₹${tenant.pendingArrears} Now`}
                        </Button>
                      </div>
                    )}

                    {tenant?.subscriptions?.some((s: any) => ['ACTIVE', 'PENDING'].includes(s.status)) ? (
                      tenant.subscriptions.find((s: any) => ['ACTIVE', 'PENDING'].includes(s.status)).cancelAtPeriodEnd ? (
                        <Button 
                          disabled
                          className="w-full bg-slate-200 text-slate-500 text-base h-12 font-bold cursor-not-allowed"
                        >
                          Cancellation Pending
                        </Button>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <Button 
                            onClick={handleSubscribe} 
                            disabled={subscribing}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-base h-12 shadow-md disabled:opacity-70"
                          >
                            {subscribing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                            {subscribing ? 'Initializing...' : 'Buy Pass / Extend Time'}
                          </Button>
                        </div>
                      )
                    ) : (
                      <Button 
                        onClick={handleSubscribe} 
                        disabled={subscribing}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-base h-12 shadow-md disabled:opacity-70"
                      >
                        {subscribing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                        {subscribing ? 'Initializing Checkout...' : 'Subscribe Now via Razorpay'}
                      </Button>
                    )}
                  </div>

                  <p className="text-xs text-center text-slate-400 mt-3 font-medium flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Secure payment powered by Razorpay
                  </p>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-sm font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Billing History</h3>
                <div className="text-center py-6 text-slate-500 text-sm">
                  No previous invoices found.
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'danger' && ['nishithdharmaraj@gmail.com', 'salesdemo@denthive.in', 'doctordemo@denthive.in'].includes(userEmail || '') && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <Card className="p-6 border-red-200 bg-red-50/30">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-red-100 text-red-600 rounded-lg">
                    <AlertOctagon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-red-900">Reset Demo Data</h2>
                    <p className="text-sm text-red-700 mt-1 mb-4">
                      This action will permanently delete all operational data from your clinic (Patients, Appointments, WhatsApp Logs, Revenue, Follow-ups, and extra Staff). 
                      Only the original clinic owner will remain. It will NOT delete your templates or clinic settings. This is specifically for clearing out dummy data after a sales demo.
                    </p>
                    <Button 
                      onClick={handleResetDemo}
                      disabled={wiping}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold"
                    >
                      {wiping ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      {wiping ? 'Wiping Database...' : 'Factory Reset Operational Data'}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      {showInviteModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Invite Team Member</h2>
              <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleInviteSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={inviteForm.roleName} onChange={e => setInviteForm({...inviteForm, roleName: e.target.value})}>
                  <option value="STAFF">STAFF (Front Desk)</option>
                  <option value="DENTIST">DENTIST (Doctor)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                  <input required type="text" className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={inviteForm.firstName} onChange={e => setInviteForm({...inviteForm, firstName: e.target.value})} placeholder="e.g. John" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                  <input required type="text" className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={inviteForm.lastName} onChange={e => setInviteForm({...inviteForm, lastName: e.target.value})} placeholder="e.g. Doe" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Login Email</label>
                <input required type="email" className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={inviteForm.email} onChange={e => setInviteForm({...inviteForm, email: e.target.value})} placeholder="john@clinic.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Temporary Password</label>
                <input required type="text" className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={inviteForm.password} onChange={e => setInviteForm({...inviteForm, password: e.target.value})} placeholder="Create a temporary password" />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowInviteModal(false)} className="flex-1 px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors">Cancel</button>
                <button type="submit" disabled={inviting} className="flex-1 px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors disabled:opacity-50">
                  {inviting ? 'Inviting...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
