'use client';

import React from 'react';
import { Calendar, Phone, Zap, TrendingUp, Printer, Users, CheckCircle, ArrowRight, Activity, Smartphone } from 'lucide-react';
import Link from 'next/link';

export default function FlyerPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-8 print:py-0 print:bg-white font-sans text-slate-800">
      
      {/* Floating Action Button (Hidden in Print) */}
      <div className="fixed top-6 right-6 print:hidden z-50 flex gap-4">
        <Link href="/dashboard" className="px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 font-medium transition-all">
          Back to Dashboard
        </Link>
        <button 
          onClick={() => window.print()}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 font-bold flex items-center gap-2 transition-all hover:scale-105"
        >
          <Printer className="w-4 h-4" />
          Save as PDF Flyer
        </button>
      </div>

      <main className="max-w-4xl mx-auto bg-white shadow-xl print:shadow-none print:w-full overflow-hidden">
        
        {/* HERO SECTION */}
        <div className="bg-indigo-900 text-white p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center p-4 bg-white/10 rounded-2xl mb-6 backdrop-blur-sm border border-white/20">
              <img src="/logo.png" alt="DentHive Logo" className="w-16 h-16 rounded-xl" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </div>
            <h1 className="text-5xl font-extrabold mb-6 tracking-tight leading-tight">
              Stop Losing Money to <span className="text-rose-400">No-Shows</span> & Empty Chairs
            </h1>
            <p className="text-xl text-indigo-100 max-w-2xl mx-auto font-medium">
              DentHive is the ultimate AI-powered clinic automation system that fills your schedule, automates your patient follow-ups, and recovers lost revenue—all on autopilot.
            </p>
          </div>
        </div>

        {/* THE PROBLEM / THE SOLUTION */}
        <div className="flex flex-col md:flex-row border-b border-slate-100">
          <div className="flex-1 p-10 bg-slate-50 border-r border-slate-100">
            <h3 className="text-lg font-bold text-rose-600 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" /> The Old Way
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-slate-600">
                <span className="text-rose-500 font-bold mt-0.5">✕</span>
                Staff wasting hours manually calling patients to confirm appointments.
              </li>
              <li className="flex items-start gap-3 text-slate-600">
                <span className="text-rose-500 font-bold mt-0.5">✕</span>
                Patients forgetting their appointments resulting in empty chairs.
              </li>
              <li className="flex items-start gap-3 text-slate-600">
                <span className="text-rose-500 font-bold mt-0.5">✕</span>
                Awkward payment collection conversations at the front desk.
              </li>
            </ul>
          </div>
          <div className="flex-1 p-10 bg-white">
            <h3 className="text-lg font-bold text-emerald-600 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5" /> The DentHive Way
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-slate-700 font-medium">
                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                100% Automated WhatsApp confirmations & reminders.
              </li>
              <li className="flex items-start gap-3 text-slate-700 font-medium">
                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                Intelligent "Stalled Journey" tracking to revive old leads.
              </li>
              <li className="flex items-start gap-3 text-slate-700 font-medium">
                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                One-click WhatsApp UPI payment links with 0% gateway fees.
              </li>
            </ul>
          </div>
        </div>

        {/* CORE FEATURES GRID */}
        <div className="p-12">
          <h2 className="text-3xl font-black text-center text-slate-900 mb-10">Everything you need to scale your clinic.</h2>
          
          <div className="grid grid-cols-2 gap-8">
            <div className="flex gap-4">
              <div className="bg-indigo-100 p-3 rounded-lg h-fit shrink-0">
                <Smartphone className="w-6 h-6 text-indigo-700" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-lg mb-1">WhatsApp Automation</h4>
                <p className="text-slate-600 text-sm leading-relaxed">Instantly send appointment confirmations, 24hr reminders, and custom treatment updates directly to the patient's phone. No app required for them.</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="bg-orange-100 p-3 rounded-lg h-fit shrink-0">
                <Printer className="w-6 h-6 text-orange-700" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-lg mb-1">Digital Prescriptions</h4>
                <p className="text-slate-600 text-sm leading-relaxed">Throw away the prescription pad. Generate beautiful, branded PDF prescriptions with one click and fire them straight to WhatsApp or print them on the spot.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="bg-emerald-100 p-3 rounded-lg h-fit shrink-0">
                <TrendingUp className="w-6 h-6 text-emerald-700" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-lg mb-1">Revenue Recovery (Zero Fees)</h4>
                <p className="text-slate-600 text-sm leading-relaxed">Send direct UPI payment links via WhatsApp. The patient taps, pays via GPay/PhonePe, and the money goes directly to your bank with absolutely zero transaction fees.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="bg-purple-100 p-3 rounded-lg h-fit shrink-0">
                <Users className="w-6 h-6 text-purple-700" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-lg mb-1">Stalled Patient Revival</h4>
                <p className="text-slate-600 text-sm leading-relaxed">DentHive's AI automatically flags patients who stopped showing up mid-treatment and helps your staff revive those high-value journeys effortlessly.</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA / CONTACT FOOTER */}
        <div className="bg-slate-900 text-white p-12 mt-4 text-center print:break-inside-avoid">
          <h2 className="text-3xl font-bold mb-4">Ready to modernize your clinic?</h2>
          <p className="text-slate-400 mb-8 max-w-xl mx-auto">
            Stop letting revenue slip through the cracks. Join the clinics already using DentHive to automate their front desk and fill their chairs.
          </p>
          
          <div className="bg-white/10 border border-white/20 rounded-2xl p-8 max-w-md mx-auto backdrop-blur-md">
            <p className="text-sm text-indigo-300 font-bold uppercase tracking-wider mb-2">Book a Free Demo Today</p>
            <h3 className="text-2xl font-bold text-white mb-6">Contact Us</h3>
            
            <div className="space-y-3 text-left">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600 p-2 rounded-full shrink-0">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <span className="font-medium text-lg text-slate-200">Nishith</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600 p-2 rounded-full shrink-0">
                  <Phone className="w-4 h-4 text-white" />
                </div>
                <span className="font-medium text-lg text-slate-200">+91 XXXXX XXXXX</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600 p-2 rounded-full shrink-0">
                  <ArrowRight className="w-4 h-4 text-white" />
                </div>
                <span className="font-medium text-lg text-slate-200">hello@denthive.in</span>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
