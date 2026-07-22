import React, { useState, useEffect } from 'react';
import api from '../../lib/axios';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Pill, Printer, Plus, X, Loader2 } from 'lucide-react';
import { PrintPrescriptionModal } from './PrintPrescriptionModal';

export function PatientPrescriptions({ patientId, patientDoctorId, tenantStatus, currentUserRole }: any) {
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [printData, setPrintData] = useState<any>(null);

  // New Prescription Form State
  const [items, setItems] = useState<any[]>([{ medicineName: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [patientId]);

  const fetchData = async () => {
    try {
      const [presRes, medRes] = await Promise.all([
        api.get(`/prescriptions/patient/${patientId}`),
        api.get(`/medicines`)
      ]);
      setPrescriptions(presRes.data);
      setMedicines(medRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setItems([...items, { medicineName: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
  };

  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const savePrescription = async () => {
    setSaving(true);
    try {
      await api.post('/prescriptions', {
        patientId,
        notes,
        doctorId: patientDoctorId,
        items: items.filter(i => i.medicineName.trim() !== '')
      });
      setShowAdd(false);
      setItems([{ medicineName: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
      setNotes('');
      fetchData();
    } catch (err) {
      alert('Failed to save prescription');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>;

  return (
    <Card className="overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900 flex items-center">
          <Pill className="w-5 h-5 mr-2 text-indigo-500" />
          Prescriptions
        </h2>
        <Button 
          variant="ghost" 
          size="sm" 
          className={tenantStatus === 'READ_ONLY' ? 'text-slate-400 cursor-not-allowed' : 'text-indigo-600'} 
          onClick={() => setShowAdd(!showAdd)}
          disabled={tenantStatus === 'READ_ONLY' || showAdd}
        >
          <Plus className="w-4 h-4 mr-1" /> New Prescription
        </Button>
      </div>

      {showAdd && (
        <div className="p-6 bg-slate-50 border-b border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800">Draft New Prescription</h3>
            <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
          </div>
          
          <div className="space-y-4">
            {items.map((item, i) => (
              <div key={i} className="flex gap-2 items-start bg-white p-3 rounded-lg border border-slate-200">
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Medicine</label>
                    <input 
                      list={`medicines-list-${i}`}
                      placeholder="e.g. Paracetamol"
                      className="w-full text-sm border border-slate-200 rounded px-2 py-1 outline-none"
                      value={item.medicineName}
                      onChange={e => {
                        const val = e.target.value;
                        const newItems = [...items];
                        newItems[i].medicineName = val;
                        
                        const med = medicines.find(m => m.medicineName === val);
                        if (med && med.dosage && !newItems[i].dosage) {
                          newItems[i].dosage = med.dosage;
                        }
                        
                        setItems(newItems);
                      }}
                    />
                    <datalist id={`medicines-list-${i}`}>
                      {medicines.map(m => <option key={m.id} value={m.medicineName} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Dosage</label>
                    <input 
                      placeholder="500mg"
                      className="w-full text-sm border border-slate-200 rounded px-2 py-1 outline-none"
                      value={item.dosage}
                      onChange={e => updateItem(i, 'dosage', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Frequency</label>
                    <input 
                      placeholder="1-0-1 (After Food)"
                      className="w-full text-sm border border-slate-200 rounded px-2 py-1 outline-none"
                      value={item.frequency}
                      onChange={e => updateItem(i, 'frequency', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Duration</label>
                    <input 
                      placeholder="5 days"
                      className="w-full text-sm border border-slate-200 rounded px-2 py-1 outline-none"
                      value={item.duration}
                      onChange={e => updateItem(i, 'duration', e.target.value)}
                    />
                  </div>
                </div>
                <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 mt-6"><X className="w-5 h-5"/></button>
              </div>
            ))}
            
            <Button variant="outline" size="sm" onClick={addItem} className="text-xs h-7">
              + Add Another Medicine
            </Button>

            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Additional Notes / Advice</label>
              <textarea 
                className="w-full text-sm border border-slate-200 rounded p-2 outline-none h-16 resize-none"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Drink plenty of water..."
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={savePrescription} disabled={saving} className="bg-indigo-600 text-white">
                {saving ? 'Saving...' : 'Save & Prepare Print'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {prescriptions.length === 0 && !showAdd ? (
        <div className="p-8 text-center text-slate-500 font-medium">
          No prescriptions found.
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {prescriptions.map(p => (
            <div key={p.id} className="p-5 bg-white hover:bg-slate-50 transition-colors flex justify-between items-center">
              <div>
                <div className="font-bold text-slate-900">
                  {new Date(p.createdAt).toLocaleDateString('en-GB')}
                </div>
                <div className="text-sm text-slate-500 mt-1">
                  {p.items.length} Medicines • Dr. {p.doctor?.firstName || 'Unknown'}
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setPrintData(p)}
              >
                <Printer className="w-4 h-4 mr-2" /> Print
              </Button>
            </div>
          ))}
        </div>
      )}

      {printData && (
        <PrintPrescriptionModal 
          prescription={printData} 
          onClose={() => setPrintData(null)} 
        />
      )}
    </Card>
  );
}
