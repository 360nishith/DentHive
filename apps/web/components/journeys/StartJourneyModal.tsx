'use client';

import React, { useState, useEffect } from 'react';
import api from '../../lib/axios';
import { Button } from '../ui/Button';
import { X, Activity, Loader2, Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';

interface StartJourneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  onJourneyStarted: () => void;
}

export function StartJourneyModal({ isOpen, onClose, patientId, onJourneyStarted }: StartJourneyModalProps) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // "Create New Protocol" panel
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCost, setNewCost] = useState('');
  const [newStages, setNewStages] = useState([{ name: '', intervalDays: '0' }]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await api.get('/journey-templates');
      if (res.data.length === 0) {
        await api.post('/journey-templates/seed/default');
        const res2 = await api.get('/journey-templates');
        setTemplates(res2.data);
      } else {
        setTemplates(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch templates', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchTemplates();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;
    setSubmitting(true);
    try {
      await api.post('/journeys', { 
        patientId, 
        templateId: selectedTemplate === 'CUSTOM' ? undefined : selectedTemplate 
      });
      onJourneyStarted();
      onClose();
    } catch (error) {
      console.error('Failed to start journey', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this protocol? This cannot be undone.')) return;
    try {
      await api.delete(`/journey-templates/${id}`);
      if (selectedTemplate === id) setSelectedTemplate(null);
      fetchTemplates();
    } catch (err) {
      console.error('Failed to delete', err);
    }
  };

  const addStage = () => setNewStages([...newStages, { name: '', intervalDays: '0' }]);
  const removeStage = (i: number) => setNewStages(newStages.filter((_, idx) => idx !== i));
  const updateStage = (i: number, field: string, val: string) => {
    const updated = [...newStages];
    updated[i] = { ...updated[i], [field]: val };
    setNewStages(updated);
  };

  const handleCreateProtocol = async () => {
    if (!newName.trim()) { setCreateError('Protocol name is required'); return; }
    if (newStages.some(s => !s.name.trim())) { setCreateError('All stages need a name'); return; }
    setCreating(true);
    setCreateError('');
    try {
      // Create the template with stages
      const res = await api.post('/journey-templates', {
        name: newName.trim(),
        estimatedCost: parseInt(newCost) || 0,
        stages: newStages.map((s, i) => ({
          sequenceOrder: i + 1,
          name: s.name.trim(),
          defaultIntervalDays: 0,
        })),
      });
      setNewName(''); setNewCost('');
      setNewStages([{ name: '', intervalDays: '0' }]);
      setShowCreate(false);
      setSelectedTemplate(res.data.id);
      await fetchTemplates();
    } catch (err: any) {
      setCreateError(err.response?.data?.message || 'Failed to create protocol');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 relative z-10 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-900 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-indigo-500" />
            Start Treatment Journey
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          
          {/* Template list */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Select Treatment Protocol
            </label>
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              </div>
            ) : (
              <div className="space-y-2">
                <div
                  onClick={() => setSelectedTemplate('CUSTOM')}
                  className={`p-4 border rounded-xl cursor-pointer transition-all flex items-center justify-between ${
                    selectedTemplate === 'CUSTOM'
                      ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                      : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="font-bold text-slate-900">Custom Journey (Blank)</div>
                    <div className="text-sm text-slate-500 mt-0.5">Build stages on the go</div>
                  </div>
                </div>
                
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl.id)}
                    className={`p-4 border rounded-xl cursor-pointer transition-all flex items-center justify-between ${
                      selectedTemplate === tpl.id
                        ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                        : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-slate-900">{tpl.name}</div>
                      <div className="text-sm text-slate-500 mt-0.5">Est. ₹{tpl.estimatedCost.toLocaleString()}</div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteTemplate(tpl.id, e)}
                      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-3"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Create New Protocol Toggle */}
          <button
            type="button"
            onClick={() => setShowCreate(!showCreate)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 text-slate-600 hover:text-indigo-600 transition-all text-sm font-semibold"
          >
            <span className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create New Protocol
            </span>
            {showCreate ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* Create Protocol Form */}
          {showCreate && (
            <div className="border border-slate-200 rounded-xl p-4 space-y-4 bg-slate-50/50">
              {createError && (
                <div className="text-sm text-red-600 font-medium bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {createError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Protocol Name *</label>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                  placeholder="e.g. Dental Implant, Scaling & Polishing"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Estimated Cost (₹)</label>
                <input
                  type="number"
                  value={newCost}
                  onChange={e => setNewCost(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                  placeholder="0"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-600">Stages *</label>
                  <button
                    type="button"
                    onClick={addStage}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Stage
                  </button>
                </div>
                <div className="space-y-2">
                  {newStages.map((stage, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex-shrink-0">
                        {i + 1}
                      </div>
                      <input
                        value={stage.name}
                        onChange={e => updateStage(i, 'name', e.target.value)}
                        className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        placeholder="Stage name"
                      />
                      {newStages.length > 1 && (
                        <button type="button" onClick={() => removeStage(i)} className="text-slate-300 hover:text-red-500 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  </div>
              </div>

              <Button
                type="button"
                onClick={handleCreateProtocol}
                disabled={creating}
                className="w-full"
              >
                {creating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : 'Save Protocol'}
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end space-x-3 bg-slate-50/50 flex-shrink-0">
          <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || !selectedTemplate}>
            {submitting ? 'Starting...' : 'Start Journey'}
          </Button>
        </div>
      </div>
    </div>
  );
}
