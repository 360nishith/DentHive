'use client';

import React, { useState, useEffect } from 'react';
import api from '../../lib/axios';
import { Button } from '../ui/Button';
import { X, Loader2, Trash2 } from 'lucide-react';

interface EditStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  journeyId: string;
  stageId?: string | null; // If null, we are creating a new stage
  initialName?: string;
  initialCost?: number;
  onSaved: () => void;
}

export function EditStageModal({ isOpen, onClose, journeyId, stageId, initialName, initialCost, onSaved }: EditStageModalProps) {
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(initialName || '');
      setCost(initialCost ? initialCost.toString() : '0');
      setError('');
    }
  }, [isOpen, initialName, initialCost]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Stage name is required');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      if (stageId) {
        // Edit existing stage
        await api.patch(`/journeys/${journeyId}/stages/${stageId}`, {
          name: name.trim(),
          cost: parseInt(cost) || 0
        });
      } else {
        // Create new stage
        await api.post(`/journeys/${journeyId}/stages`, {
          name: name.trim(),
          cost: parseInt(cost) || 0
        });
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save stage');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!stageId) return;
    if (!confirm('Are you sure you want to delete this stage? Associated appointments will be lost.')) return;
    
    setSubmitting(true);
    try {
      await api.delete(`/journeys/${journeyId}/stages/${stageId}`);
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete stage');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 relative z-10 flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-900">
            {stageId ? 'Edit Stage' : 'Add Stage'}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Stage Name *</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Consultation"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Cost (₹)</label>
            <input
              type="number"
              value={cost}
              onChange={e => setCost(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="0"
              min={0}
            />
          </div>

          <div className="pt-4 flex items-center justify-between">
            {stageId ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="text-red-500 hover:text-red-700 p-2 rounded hover:bg-red-50 transition-colors"
                title="Delete Stage"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            ) : <div />}
            <div className="flex space-x-2">
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Save
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
