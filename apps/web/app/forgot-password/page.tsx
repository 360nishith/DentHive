'use client';

import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Attempt to send reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 overflow-hidden relative">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary-100 blur-3xl opacity-60 animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-100 blur-3xl opacity-60 animate-pulse" style={{ animationDelay: '2s' }} />

      <div className="relative z-10 w-full max-w-md p-8 sm:p-10 bg-white/70 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50">
        
        <div className="mb-8">
          <Link href="/login" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to login
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Reset Password</h1>
          <p className="text-slate-500 mt-2 font-medium">Enter your email and we'll send you a link to reset your password.</p>
        </div>

        {success ? (
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-2">Check your inbox</h3>
            <p className="text-sm text-slate-600">We've sent a password reset link to <strong>{email}</strong>.</p>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl font-medium border border-red-100 flex items-center">
                <span className="w-2 h-2 rounded-full bg-red-500 mr-2" />
                {error}
              </div>
            )}

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary-500 transition-colors">
                <Mail className="h-5 w-5" />
              </div>
              <input
                type="email"
                required
                className="block w-full pl-11 pr-4 py-4 bg-white/50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-medium"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-4 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-semibold shadow-lg shadow-slate-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
