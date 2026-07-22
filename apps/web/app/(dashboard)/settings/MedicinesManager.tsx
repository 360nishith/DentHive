import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/Button';
import { Pill, Trash2, Edit2, Check, X, Loader2, Plus } from 'lucide-react';
import api from '../../../lib/axios';

export default function MedicinesManager() {
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMed, setNewMed] = useState({ medicineName: '', dosage: '' });
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMedicines();
  }, []);

  const fetchMedicines = async () => {
    try {
      const res = await api.get('/medicines');
      setMedicines(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newMed.medicineName) return alert('Name is required');
    setSaving(true);
    try {
      await api.post('/medicines', newMed);
      setNewMed({ medicineName: '', dosage: '' });
      setAdding(false);
      fetchMedicines();
    } catch (e) {
      alert('Failed to add medicine');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this medicine?')) return;
    try {
      await api.delete(`/medicines/${id}`);
      fetchMedicines();
    } catch (e) {
      alert('Failed to delete medicine');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Medicines Directory</h2>
          <p className="text-sm text-slate-500">Manage your frequent medicines for quick prescribing.</p>
        </div>
        <Button onClick={() => setAdding(true)} className="bg-indigo-600 text-white shadow-sm" disabled={adding}>
          <Plus className="w-4 h-4 mr-2" /> Add Medicine
        </Button>
      </div>

      {adding && (
        <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg space-y-4">
          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
            <h3 className="font-bold text-slate-800 text-sm">Add New Medicine</h3>
            <button onClick={() => setAdding(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Medicine Name *</label>
              <input type="text" value={newMed.medicineName} onChange={e => setNewMed({...newMed, medicineName: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none" placeholder="e.g. Amoxicillin" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Default Dosage</label>
              <input type="text" value={newMed.dosage} onChange={e => setNewMed({...newMed, dosage: e.target.value})} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none" placeholder="e.g. 500mg" />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={handleAdd} disabled={saving} className="bg-indigo-600 text-white">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              Save Medicine
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-slate-400" /></div>
      ) : medicines.length === 0 && !adding ? (
        <div className="text-center p-8 text-slate-500 font-medium border border-dashed border-slate-300 rounded-lg">
          No medicines added yet.
        </div>
      ) : (
        <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden">
          {medicines.map(m => (
            <div key={m.id} className="p-4 bg-white flex justify-between items-center hover:bg-slate-50 transition-colors">
              <div>
                <div className="font-bold text-slate-900 flex items-center">
                  <Pill className="w-4 h-4 text-indigo-500 mr-2" />
                  {m.medicineName}
                </div>
                <div className="text-xs text-slate-500 mt-1 flex gap-3">
                  {m.dosage && <span>💊 {m.dosage}</span>}
                </div>
              </div>
              <button onClick={() => handleDelete(m.id)} className="text-slate-400 hover:text-red-500 p-2 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
