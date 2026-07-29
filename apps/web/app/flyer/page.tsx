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
            <div className="inline-flex flex-col items-center justify-center p-4 bg-white/10 rounded-2xl mb-6 backdrop-blur-sm border border-white/20">
              <img src="/logo.png" alt="DentHive Logo" className="w-16 h-16 rounded-xl mb-2" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              <span className="text-xl font-bold tracking-wide text-white">DentHive</span>
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

        {/* CORE FEATURES */}
        <div className="p-12 space-y-16">
          <h2 className="text-4xl font-black text-center text-slate-900 mb-12">Everything you need to scale your clinic.</h2>
          
          {/* Feature 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center print:grid-cols-2 print:break-inside-avoid">
            <div>
              <div className="bg-indigo-100 p-3 rounded-lg w-fit mb-4">
                <Smartphone className="w-6 h-6 text-indigo-700" />
              </div>
              <h4 className="font-bold text-slate-900 text-2xl mb-3">WhatsApp Automation</h4>
              <p className="text-slate-600 text-lg leading-relaxed">Instantly send appointment confirmations, 24hr reminders, and custom treatment updates directly to the patient's phone. No app required for them.</p>
            </div>
            <div className="bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
               <img src="/guide/whatsapp.png" alt="WhatsApp Automation" className="w-full h-auto object-cover" />
            </div>
          </div>
          
          {/* Feature 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center print:grid-cols-2 print:break-inside-avoid">
            <div className="order-2 md:order-1 print:order-1 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
               <img src="/guide/prescription.png" alt="Digital Prescriptions" className="w-full h-auto object-cover" />
            </div>
            <div className="order-1 md:order-2 print:order-2">
              <div className="bg-orange-100 p-3 rounded-lg w-fit mb-4">
                <Printer className="w-6 h-6 text-orange-700" />
              </div>
              <h4 className="font-bold text-slate-900 text-2xl mb-3">Digital Prescriptions</h4>
              <p className="text-slate-600 text-lg leading-relaxed">Throw away the prescription pad. Generate beautiful, branded PDF prescriptions with one click and fire them straight to WhatsApp or print them on the spot.</p>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center print:grid-cols-2 print:break-inside-avoid">
            <div>
              <div className="bg-emerald-100 p-3 rounded-lg w-fit mb-4">
                <TrendingUp className="w-6 h-6 text-emerald-700" />
              </div>
              <h4 className="font-bold text-slate-900 text-2xl mb-3">Revenue Recovery (Zero Fees)</h4>
              <p className="text-slate-600 text-lg leading-relaxed">Send direct UPI payment links via WhatsApp. The patient taps, pays via GPay/PhonePe, and the money goes directly to your bank with absolutely zero transaction fees.</p>
            </div>
            <div className="bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
               <img src="/guide/billing.png" alt="Revenue Recovery" className="w-full h-auto object-cover" />
            </div>
          </div>

          {/* Feature 4 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center print:grid-cols-2 print:break-inside-avoid">
            <div className="order-2 md:order-1 print:order-1 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
               <img src="/guide/followups.png" alt="Stalled Patient Revival" className="w-full h-auto object-cover" />
            </div>
            <div className="order-1 md:order-2 print:order-2">
              <div className="bg-purple-100 p-3 rounded-lg w-fit mb-4">
                <Users className="w-6 h-6 text-purple-700" />
              </div>
              <h4 className="font-bold text-slate-900 text-2xl mb-3">Stalled Patient Revival</h4>
              <p className="text-slate-600 text-lg leading-relaxed">DentHive's AI automatically flags patients who stopped showing up mid-treatment and helps your staff revive those high-value journeys effortlessly.</p>
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
                <span className="font-medium text-lg text-slate-200">Nishith Dharmaraj</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600 p-2 rounded-full shrink-0">
                  <Phone className="w-4 h-4 text-white" />
                </div>
                <span className="font-medium text-lg text-slate-200">+91 6361953329</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600 p-2 rounded-full shrink-0">
                  <ArrowRight className="w-4 h-4 text-white" />
                </div>
                <span className="font-medium text-lg text-slate-200">denthive.support@gmail.com</span>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
