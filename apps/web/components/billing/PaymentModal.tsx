'use client';

import React, { useState, useEffect } from 'react';
import api from '../../lib/axios';
import { Button } from '../ui/Button';
import { X, IndianRupee, Smartphone, Banknote, CreditCard, Loader2, CheckCircle, MessageCircle } from 'lucide-react';
import QRCode from 'react-qr-code';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  journeyId: string;
  journeyName: string;
  onPaymentRecorded: () => void;
}

const METHODS = [
  { id: 'UPI', label: 'UPI', icon: Smartphone },
  { id: 'CASH', label: 'Cash', icon: Banknote },
  { id: 'CARD', label: 'Card', icon: CreditCard },
];

export function PaymentModal({ isOpen, onClose, journeyId, journeyName, onPaymentRecorded }: PaymentModalProps) {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('CASH');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [sendingWA, setSendingWA] = useState(false);
  const [waSent, setWaSent] = useState(false);

  useEffect(() => {
    if (!isOpen || !journeyId) return;
    setLoading(true);
    setSuccess(false);
    setError('');
    setAmount('');
    setWaSent(false);
    api.get(`/billing/payments/journey/${journeyId}`)
      .then(res => {
        setSummary(res.data);
        if (res.data?.balance > 0) setAmount(String(res.data.balance));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isOpen, journeyId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseInt(amount);
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return; }
    setSubmitting(true);
    setError('');
    try {
      await api.post('/billing/payments', { journeyId, amount: amt, paymentMethod: method });
      setSuccess(true);
      onPaymentRecorded();
      const res = await api.get(`/billing/payments/journey/${journeyId}`);
      setSummary(res.data);
      setAmount('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Payment failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!summary?.patientId) return;
    const amt = parseInt(amount);
    if (!amt || amt <= 0) { setError('Enter a valid amount before sending the link'); return; }
    
    setSendingWA(true);
    setError('');
    try {
      await api.post('/whatsapp/send-payment', {
        patientId: summary.patientId,
        amount: amt,
        journeyName
      });
      setWaSent(true);
      setTimeout(() => setWaSent(false), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send WhatsApp message');
    } finally {
      setSendingWA(false);
    }
  };

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

  const currentAmount = parseInt(amount) || 0;
  // Generate upi string if upiVpa is available
  const upiString = (summary?.upiVpa && currentAmount > 0) 
    ? `upi://pay?pa=${summary.upiVpa}&pn=${encodeURIComponent(summary.clinicName || 'Clinic')}&am=${currentAmount}&cu=INR`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 relative z-10 flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
              <IndianRupee className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Collect Payment</h2>
              <p className="text-xs text-slate-500 truncate max-w-[200px]">{journeyName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          {/* Balance Summary */}
          {loading ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div>
          ) : summary ? (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Total</p>
                <p className="text-base font-bold text-slate-900">{fmt(summary.totalCost)}</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
                <p className="text-[11px] font-semibold text-emerald-500 uppercase tracking-wide mb-1">Paid</p>
                <p className="text-base font-bold text-emerald-700">{fmt(summary.totalPaid)}</p>
              </div>
              <div className={`rounded-xl p-3 text-center border ${summary.balance > 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
                <p className={`text-[11px] font-semibold uppercase tracking-wide mb-1 ${summary.balance > 0 ? 'text-red-400' : 'text-emerald-500'}`}>Balance</p>
                <p className={`text-base font-bold ${summary.balance > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{fmt(summary.balance)}</p>
              </div>
            </div>
          ) : null}

          {success && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-sm font-semibold">
              <CheckCircle className="w-4 h-4" /> Payment recorded!
            </div>
          )}

          {summary?.balance > 0 ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 font-medium">{error}</div>
              )}

              {/* Amount */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Amount (₹)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <IndianRupee className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-lg font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                    placeholder="0"
                    min={1}
                    max={summary?.balance}
                    required
                  />
                </div>
                {summary?.balance > 0 && (
                  <button type="button" onClick={() => setAmount(String(summary.balance))} className="text-xs text-indigo-600 hover:text-indigo-800 mt-1 font-semibold">
                    Pay full balance ({fmt(summary.balance)})
                  </button>
                )}
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {METHODS.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMethod(m.id)}
                      className={`flex flex-col items-center py-3 px-2 rounded-xl border-2 transition-all text-sm font-semibold ${
                        method === m.id
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 text-slate-500 hover:border-indigo-200'
                      }`}
                    >
                      <m.icon className="w-5 h-5 mb-1" />
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* UPI QR Display & WhatsApp Link */}
              {method === 'UPI' && upiString && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center gap-4">
                  <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                    <QRCode value={upiString} size={160} />
                  </div>
                  <div className="text-center w-full">
                    <p className="text-xs text-slate-500 font-medium mb-3">Scan with PhonePe, GPay, or Paytm</p>
                    <div className="flex items-center gap-2 w-full">
                      <div className="h-px bg-slate-200 flex-1"></div>
                      <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">OR</span>
                      <div className="h-px bg-slate-200 flex-1"></div>
                    </div>
                    <Button 
                      type="button" 
                      onClick={handleSendWhatsApp}
                      disabled={sendingWA || waSent}
                      className="w-full mt-3 bg-green-500 hover:bg-green-600 text-white shadow-sm border-0"
                    >
                      {waSent ? (
                        <><CheckCircle className="w-4 h-4 mr-2" /> Link Sent!</>
                      ) : sendingWA ? (
                        <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending...</>
                      ) : (
                        <><MessageCircle className="w-4 h-4 mr-2" /> Send via WhatsApp</>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <Button type="submit" disabled={submitting} className="w-full h-12 text-base">
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : `Confirm ${amount ? fmt(parseInt(amount) || 0) : ''} Collected`}
              </Button>
            </form>
          ) : summary?.balance <= 0 ? (
            <div className="text-center py-4">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="font-bold text-slate-900">Fully Paid</p>
              <p className="text-sm text-slate-500 mt-1">No outstanding balance for this journey.</p>
            </div>
          ) : null}

          {/* Payment history */}
          {summary?.payments?.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Payment History</h3>
              <div className="space-y-1.5">
                {summary.payments.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg text-sm border border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 bg-white border border-slate-200 rounded-full font-medium text-slate-600">{p.paymentMethod}</span>
                      <span className="text-slate-500 text-xs">{new Date(p.recordedAt).toLocaleDateString('en-GB')}</span>
                    </div>
                    <span className="font-bold text-emerald-700">{fmt(p.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
