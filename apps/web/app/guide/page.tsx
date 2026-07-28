'use client';

import React from 'react';
import { Calendar, Phone, Zap, TrendingUp, Printer, Home, CheckCircle } from 'lucide-react';
import Link from 'next/link';



export default function GuidePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <div className="print:hidden bg-indigo-600 text-white px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <Zap className="w-6 h-6 text-indigo-300" />
          <h1 className="text-xl font-bold tracking-tight">DentHive Guides</h1>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 hover:text-indigo-200 transition-colors text-sm font-medium">
            <Home className="w-4 h-4" /> Back to Dashboard
          </Link>
          <button 
            onClick={() => window.print()} 
            className="flex items-center gap-2 bg-white text-indigo-600 px-4 py-2 rounded-md text-sm font-bold shadow hover:bg-indigo-50 transition-colors"
          >
            <Printer className="w-4 h-4" /> Print to PDF
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto p-8 print:p-0 bg-white shadow-sm my-8 print:my-0 print:shadow-none print:w-full">
        {/* Title Page / Header */}
        <div className="border-b-4 border-indigo-500 pb-8 mb-12 text-center pt-8">
          <div className="inline-flex items-center justify-center p-4 bg-indigo-50 rounded-full mb-6">
            <Zap className="w-12 h-12 text-indigo-600" />
          </div>
          <h1 className="text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">DentHive User Guide</h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-8">
            The complete handbook for automating your clinic, filling your chairs, and recovering lost revenue effortlessly.
          </p>

          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg text-left text-sm max-w-2xl mx-auto print:hidden shadow-sm">
            <strong>👋 Clinic Owner Instructions:</strong> To add your screenshots to this guide, take screenshots of your app and save them with these exact names in your `apps/web/public/guide` folder:
            <ul className="list-disc pl-5 mt-2 font-mono text-xs">
              <li>scheduling.png</li>
              <li>whatsapp.png</li>
              <li>followups.png</li>
              <li>billing.png</li>
              <li>templates.png</li>
              <li>custom-journey.png</li>
              <li>patient-profile.png</li>
            </ul>
            Refresh this page after adding the files, and they will magically appear below!
          </div>
        </div>

        <section className="mb-16 print:break-inside-avoid">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-indigo-100 p-3 rounded-lg">
              <Calendar className="w-6 h-6 text-indigo-600" />
            </div>
            <h2 className="text-3xl font-bold text-slate-800">1. Smart Scheduling</h2>
          </div>
          
          <p className="text-lg text-slate-600 mb-6 leading-relaxed">
            The DentHive calendar is designed to be your clinic's command center. It gives you a crystal-clear view of your day and integrates directly with our WhatsApp automation engine.
          </p>

          <div className="bg-slate-100 rounded-xl overflow-hidden mb-6 border border-slate-200 flex items-center justify-center min-h-[300px] print:break-inside-avoid">
            <img 
              src="/guide/scheduling.png" 
              alt="Dashboard Calendar" 
              className="w-full h-auto object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement?.classList.add('bg-slate-100');
                e.currentTarget.parentElement!.innerHTML = '<div class="text-center p-12"><p class="text-slate-400 font-medium">Add scheduling.png to public/guide/</p></div>';
              }}
            />
          </div>
        </section>

        <section className="mb-16 print:break-before-page">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-emerald-100 p-3 rounded-lg">
              <Phone className="w-6 h-6 text-emerald-600" />
            </div>
            <h2 className="text-3xl font-bold text-slate-800">2. WhatsApp Automations</h2>
          </div>
          
          <p className="text-lg text-slate-600 mb-6 leading-relaxed">
            Never waste time calling patients to confirm appointments again. DentHive operates a 24/7 background worker that handles all your patient communication automatically.
          </p>

          <div className="bg-slate-100 rounded-xl overflow-hidden mb-6 border border-slate-200 flex items-center justify-center min-h-[300px] print:break-inside-avoid">
             <img 
              src="/guide/whatsapp.png" 
              alt="WhatsApp Interaction" 
              className="w-full h-auto object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement?.classList.add('bg-slate-100');
                e.currentTarget.parentElement!.innerHTML = '<div class="text-center p-12"><p class="text-slate-400 font-medium">Add whatsapp.png to public/guide/</p></div>';
              }}
            />
          </div>
        </section>

        <section className="mb-16 print:break-before-page">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-amber-100 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
            <h2 className="text-3xl font-bold text-slate-800">3. Stalled Journeys & Follow-Ups</h2>
          </div>
          
          <p className="text-lg text-slate-600 mb-6 leading-relaxed">
            The biggest leak in clinic revenue is patients who complete one stage of a multi-stage treatment but forget to book the next session. DentHive catches them all.
          </p>

          <div className="bg-slate-100 rounded-xl overflow-hidden mb-6 border border-slate-200 flex items-center justify-center min-h-[300px] print:break-inside-avoid">
             <img 
              src="/guide/followups.png" 
              alt="Follow-Ups Dashboard" 
              className="w-full h-auto object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement?.classList.add('bg-slate-100');
                e.currentTarget.parentElement!.innerHTML = '<div class="text-center p-12"><p class="text-slate-400 font-medium">Add followups.png to public/guide/</p></div>';
              }}
            />
          </div>
        </section>

        <section className="mb-16 print:break-before-page">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-rose-100 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-rose-600" />
            </div>
            <h2 className="text-3xl font-bold text-slate-800">4. Revenue Collection</h2>
          </div>
          
          <p className="text-lg text-slate-600 mb-6 leading-relaxed">
            Eliminate awkward payment conversations at the front desk. DentHive allows you to instantly generate a secure UPI payment link and send it directly to a patient's WhatsApp with one click.
          </p>

          <div className="bg-slate-100 rounded-xl overflow-hidden mb-6 border border-slate-200 flex items-center justify-center min-h-[300px] print:break-inside-avoid">
             <img 
              src="/guide/billing.png" 
              alt="Revenue Collection Dashboard" 
              className="w-full h-auto object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement?.classList.add('bg-slate-100');
                e.currentTarget.parentElement!.innerHTML = '<div class="text-center p-12"><p class="text-slate-400 font-medium">Add billing.png to public/guide/</p></div>';
              }}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6 print:grid-cols-2">
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" /> Instant UPI Links
              </h3>
              <p className="text-slate-600 text-sm">Simply enter the treatment amount and click send. The patient receives a professional WhatsApp message with a secure link that opens directly in Google Pay, PhonePe, or Paytm.</p>
            </div>
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" /> Zero Transaction Fees
              </h3>
              <p className="text-slate-600 text-sm">Because DentHive generates direct UPI links tied to the doctor's VPA, 100% of the money goes directly into the clinic's bank account instantly, with zero gateway fees.</p>
            </div>
          </div>
        </section>

        <section className="mb-16 print:break-before-page">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-purple-100 p-3 rounded-lg">
              <Zap className="w-6 h-6 text-purple-600" />
            </div>
            <h2 className="text-3xl font-bold text-slate-800">5. Treatment Templates</h2>
          </div>
          
          <p className="text-lg text-slate-600 mb-6 leading-relaxed">
            Standardize your clinic's workflows by creating reusable Treatment Templates for common procedures like Root Canals, Aligners, or Implants.
          </p>

          <div className="bg-slate-100 rounded-xl overflow-hidden mb-6 border border-slate-200 flex items-center justify-center min-h-[300px] print:break-inside-avoid">
             <img 
              src="/guide/templates.png" 
              alt="Treatment Templates Dashboard" 
              className="w-full h-auto object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement?.classList.add('bg-slate-100');
                e.currentTarget.parentElement!.innerHTML = '<div class="text-center p-12"><p class="text-slate-400 font-medium">Add templates.png to public/guide/</p></div>';
              }}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6 print:grid-cols-2">
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" /> Define Stages
              </h3>
              <p className="text-slate-600 text-sm">Break down a complex procedure into simple stages (e.g., Consultation &rarr; Scan &rarr; Delivery). This helps DentHive track exactly where a patient is in their journey.</p>
            </div>
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" /> Ensure Consistency
              </h3>
              <p className="text-slate-600 text-sm">When every doctor follows the same template, your clinic provides a consistent, high-quality experience for every single patient.</p>
            </div>
          </div>
        </section>

        <section className="mb-16 print:break-before-page">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-cyan-100 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-cyan-600" />
            </div>
            <h2 className="text-3xl font-bold text-slate-800">6. Custom Patient Journeys</h2>
          </div>
          
          <p className="text-lg text-slate-600 mb-6 leading-relaxed">
            Not every patient fits perfectly into a template. DentHive allows you to spin up a completely custom journey on the fly for unique cases.
          </p>

          <div className="bg-slate-100 rounded-xl overflow-hidden mb-6 border border-slate-200 flex items-center justify-center min-h-[300px] print:break-inside-avoid">
             <img 
              src="/guide/custom-journey.png" 
              alt="Custom Journey Creation" 
              className="w-full h-auto object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement?.classList.add('bg-slate-100');
                e.currentTarget.parentElement!.innerHTML = '<div class="text-center p-12"><p class="text-slate-400 font-medium">Add custom-journey.png to public/guide/</p></div>';
              }}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6 print:grid-cols-2">
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" /> Dynamic Stages
              </h3>
              <p className="text-slate-600 text-sm">Add or remove treatment stages on the fly. If a patient needs an unexpected extraction before an implant, you can seamlessly add it to their personal journey.</p>
            </div>
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" /> Ultimate Flexibility
              </h3>
              <p className="text-slate-600 text-sm">Track complex, multi-doctor, or highly personalized treatment plans without being constrained by rigid software rules.</p>
            </div>
          </div>
        </section>

        <section className="mb-16 print:break-before-page">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Phone className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-3xl font-bold text-slate-800">7. Patient Profiles & History</h2>
          </div>
          
          <p className="text-lg text-slate-600 mb-6 leading-relaxed">
            The Patient Profile is the central hub for everything related to a specific individual, giving you a complete 360-degree view of their history.
          </p>

          <div className="bg-slate-100 rounded-xl overflow-hidden mb-6 border border-slate-200 flex items-center justify-center min-h-[300px] print:break-inside-avoid">
             <img 
              src="/guide/patient-profile.png" 
              alt="Patient Profile Dashboard" 
              className="w-full h-auto object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement?.classList.add('bg-slate-100');
                e.currentTarget.parentElement!.innerHTML = '<div class="text-center p-12"><p class="text-slate-400 font-medium">Add patient-profile.png to public/guide/</p></div>';
              }}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6 print:grid-cols-2">
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" /> Medical History
              </h3>
              <p className="text-slate-600 text-sm">Instantly view past appointments, upcoming schedules, and active treatment journeys all on one beautifully organized screen.</p>
            </div>
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" /> WhatsApp Logs
              </h3>
              <p className="text-slate-600 text-sm">See a complete audit trail of every automated WhatsApp message sent to the patient and whether they confirmed, rescheduled, or ignored it.</p>
            </div>
          </div>
        </section>

      </main>
      
      <div className="hidden print:block text-center text-slate-400 text-sm py-4 border-t border-slate-200 max-w-4xl mx-auto">
        Powered by DentHive - The Smart Operating System for Dental Clinics.
      </div>
    </div>
  );
}
