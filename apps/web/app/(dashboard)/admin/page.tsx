'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import api from '../../../lib/axios';
import { IndianRupee, Users, TrendingUp, AlertTriangle, Trash2 } from 'lucide-react';
import { Card } from '../../../components/ui/Card';

export default function SuperAdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    clinicName: '',
    subdomain: '',
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: ''
  });
  const [inviting, setInviting] = useState(false);

  // Billing Override Modal State
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [billingForm, setBillingForm] = useState({
    status: 'ACTIVE',
    daysToAdd: 30
  });
  const [updatingBilling, setUpdatingBilling] = useState(false);

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || session.user.email !== 'nishithdharmaraj@gmail.com') {
        router.push('/dashboard');
        return;
      }

      try {
        const [statsRes, tenantsRes] = await Promise.all([
          api.get('/admin/stats'),
          api.get('/admin/tenants')
        ]);
        setStats(statsRes.data);
        setTenants(tenantsRes.data);
      } catch (err) {
        console.error('Failed to load admin data', err);
      } finally {
        setLoading(false);
      }
    };
    checkAuthAndLoad();
  }, [router]);

  const handleDeleteTenant = async (id: string, name: string) => {
    const confirm1 = window.confirm(`WARNING: You are about to COMPLETELY DELETE the clinic "${name}". This will permanently wipe ALL their patients, appointments, billing data, templates, and EVERY user account from the system.\n\nThis action CANNOT be undone.\n\nAre you sure you want to proceed?`);
    if (!confirm1) return;
    
    const confirm2 = window.prompt(`Type "${name}" to confirm permanently deleting this clinic:`);
    if (confirm2 !== name) {
      alert("Clinic name did not match. Deletion cancelled.");
      return;
    }

    try {
      await api.delete(`/admin/tenants/${id}`);
      // Refresh stats and remove from list
      const res = await api.get('/admin/tenants');
      setTenants(res.data);
      alert("Clinic deleted successfully. All data and users have been permanently wiped.");
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete clinic.");
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    try {
      await api.post('/admin/tenants/invite', inviteForm);
      alert('Clinic invited successfully! They can now log in.');
      setShowInviteModal(false);
      window.location.reload();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to invite clinic');
    } finally {
      setInviting(false);
    }
  };

  const handleBillingOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;
    setUpdatingBilling(true);
    try {
      await api.patch(`/admin/tenants/${selectedTenant.id}/billing`, {
        status: billingForm.status,
        daysToAdd: Number(billingForm.daysToAdd)
      });
      alert('Billing successfully overridden! They are unlocked.');
      setShowBillingModal(false);
      
      // Refresh list
      const res = await api.get('/admin/tenants');
      setTenants(res.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update billing');
    } finally {
      setUpdatingBilling(false);
    }
  };

  if (loading) {
    return <div className="p-8">Loading CRM data...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Super Admin CRM</h1>
          <p className="text-slate-500 mt-2">Bird's-eye view of your business.</p>
        </div>
        <button 
          onClick={() => setShowInviteModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
        >
          Invite New Clinic
        </button>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center text-slate-500 mb-4">
            <IndianRupee className="w-5 h-5 mr-2 text-emerald-500" />
            <span className="font-semibold text-sm uppercase tracking-wider">Total MRR</span>
          </div>
          <div className="text-3xl font-black text-slate-900">₹{stats?.totalMRR?.toLocaleString()}</div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center text-slate-500 mb-4">
            <TrendingUp className="w-5 h-5 mr-2 text-indigo-500" />
            <span className="font-semibold text-sm uppercase tracking-wider">Active Subscriptions</span>
          </div>
          <div className="text-3xl font-black text-slate-900">{stats?.activeSubscriptions}</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center text-slate-500 mb-4">
            <Users className="w-5 h-5 mr-2 text-amber-500" />
            <span className="font-semibold text-sm uppercase tracking-wider">Active Trials</span>
          </div>
          <div className="text-3xl font-black text-slate-900">{stats?.activeTrials}</div>
        </Card>

        <Card className="p-6 bg-red-50/50 border border-red-100">
          <div className="flex items-center text-red-500 mb-4">
            <AlertTriangle className="w-5 h-5 mr-2" />
            <span className="font-semibold text-sm uppercase tracking-wider">Expired Trials</span>
          </div>
          <div className="text-3xl font-black text-red-700">{stats?.expiredTrials}</div>
        </Card>
      </div>

      {/* Tenants Table */}
      <Card className="overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">All Clinics ({tenants.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
                <th className="p-4">Clinic Name</th>
                <th className="p-4">Subdomain</th>
                <th className="p-4">Created At</th>
                <th className="p-4">Stats</th>
                <th className="p-4">Plan Type</th>
                <th className="p-4">Status</th>
                <th className="p-4">MRR</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {tenants.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-semibold text-slate-900">{t.name}</td>
                  <td className="p-4 text-slate-500">
                    <a href={`https://${t.subdomain}.dentalflow.com`} target="_blank" className="hover:text-indigo-600 underline">
                      {t.subdomain}
                    </a>
                  </td>
                  <td className="p-4 text-slate-500">
                    {new Date(t.createdAt).toLocaleDateString('en-GB')}
                  </td>
                  <td className="p-4 text-slate-500">
                    <span className="bg-slate-100 px-2 py-1 rounded text-xs mr-2">{t.patientCount} Pts</span>
                    <span className="bg-slate-100 px-2 py-1 rounded text-xs">{t.staffCount} Staff</span>
                  </td>
                  <td className="p-4">
                    {t.isBYOS ? (
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-1 rounded text-xs font-bold uppercase">BYOS</span>
                    ) : (
                      <span className="text-indigo-700 bg-indigo-50 px-2 py-1 rounded text-xs font-bold uppercase">Standard</span>
                    )}
                  </td>
                  <td className="p-4">
                    {t.status === 'SUBSCRIBED' && <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 text-[10px] uppercase font-black rounded-full tracking-wider">Subscribed</span>}
                    {t.status === 'TRIAL' && <span className="bg-amber-100 text-amber-700 px-2.5 py-1 text-[10px] uppercase font-black rounded-full tracking-wider">Trial</span>}
                    {t.status === 'EXPIRED' && <span className="bg-red-100 text-red-700 px-2.5 py-1 text-[10px] uppercase font-black rounded-full tracking-wider">Expired</span>}
                  </td>
                  <td className="p-4 font-bold text-slate-900">
                    ₹{t.mrr}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <label className="cursor-pointer p-2 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-colors" title="Upload Patients CSV">
                        <input 
                          type="file" 
                          accept=".csv" 
                          className="hidden" 
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            
                            const formData = new FormData();
                            formData.append('file', file);
                            
                            try {
                              alert('Uploading and processing CSV...');
                              const res = await api.post(`/admin/tenants/${t.id}/import-csv`, formData, {
                                headers: { 'Content-Type': 'multipart/form-data' }
                              });
                              alert(`✅ Migration Complete!\n\nSuccessfully Imported: ${res.data.successCount}\nFailed/Skipped: ${res.data.failCount}`);
                              e.target.value = ''; // Reset input
                            } catch (err: any) {
                              alert(err.response?.data?.message || "Failed to import CSV.");
                            }
                          }}
                        />
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      </label>
                      <button
                        onClick={() => {
                          setSelectedTenant(t);
                          setBillingForm({ status: 'ACTIVE', daysToAdd: 30 });
                          setShowBillingModal(true);
                        }}
                        className="p-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded transition-colors"
                        title="Override Billing"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </button>
                      <button 
                        onClick={() => handleDeleteTenant(t.id, t.name)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                        title="Reset Clinic"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {showInviteModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Invite New Clinic</h2>
              <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleInviteSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Clinic Name</label>
                <input required type="text" className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={inviteForm.clinicName} onChange={e => setInviteForm({...inviteForm, clinicName: e.target.value})} placeholder="e.g. Apex Dental" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subdomain</label>
                <input required type="text" className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={inviteForm.subdomain} onChange={e => setInviteForm({...inviteForm, subdomain: e.target.value})} placeholder="e.g. apex" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                  <input required type="text" className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={inviteForm.firstName} onChange={e => setInviteForm({...inviteForm, firstName: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                  <input required type="text" className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={inviteForm.lastName} onChange={e => setInviteForm({...inviteForm, lastName: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                <input required type="text" className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={inviteForm.phone} onChange={e => setInviteForm({...inviteForm, phone: e.target.value})} placeholder="9876543210" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Login Email</label>
                <input required type="email" className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={inviteForm.email} onChange={e => setInviteForm({...inviteForm, email: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Temporary Password</label>
                <input required type="text" className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" value={inviteForm.password} onChange={e => setInviteForm({...inviteForm, password: e.target.value})} />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowInviteModal(false)} className="flex-1 px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors">Cancel</button>
                <button type="submit" disabled={inviting} className="flex-1 px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors disabled:opacity-50">
                  {inviting ? 'Inviting...' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Billing Override Modal */}
      {showBillingModal && selectedTenant && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Billing Override</h2>
              <button onClick={() => setShowBillingModal(false)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>
            <p className="text-sm text-slate-500 mb-6">Forcefully update billing status for <strong>{selectedTenant.name}</strong>. This bypasses the payment gateway.</p>
            <form onSubmit={handleBillingOverrideSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Status</label>
                <select 
                  value={billingForm.status}
                  onChange={e => setBillingForm({...billingForm, status: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ACTIVE">ACTIVE (Unlocked)</option>
                  <option value="READ_ONLY">READ ONLY (Expired)</option>
                  <option value="PAST_DUE">PAST DUE (Suspended)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Add Free Days</label>
                <input 
                  type="number"
                  value={billingForm.daysToAdd}
                  onChange={e => setBillingForm({...billingForm, daysToAdd: Number(e.target.value)})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  min="0"
                />
                <p className="text-xs text-slate-500 mt-1">Number of days to extend their current subscription.</p>
              </div>
              <div className="flex justify-end pt-4">
                <button 
                  type="button"
                  onClick={() => setShowBillingModal(false)}
                  className="mr-3 px-4 py-2 text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={updatingBilling}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
                >
                  {updatingBilling ? 'Updating...' : 'Force Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
