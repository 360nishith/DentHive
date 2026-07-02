import Link from 'next/link';
import { ArrowRight, MessageSquare, CalendarCheck, Activity } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden shadow-sm border border-slate-100">
                <img src="/logo.png" alt="DentHive Logo" className="w-full h-full object-cover" />
              </div>
              <span className="font-bold text-xl tracking-tight text-slate-900">DentHive</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">
                Log in
              </Link>
              <Link href="/login" className="text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-24 pb-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse"></div>
          <div className="absolute top-0 left-0 -ml-20 mt-20 w-72 h-72 bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse" style={{animationDelay: '2s'}}></div>
          
          <div className="text-center relative z-10 max-w-3xl mx-auto">
            <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl mb-6">
              The OS for Modern <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Dental Clinics</span>
            </h1>
            <p className="text-xl text-slate-600 mb-10 leading-relaxed">
              Automate your WhatsApp reminders, streamline patient journeys, and supercharge your clinic's revenue with zero manual effort.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/login" className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all hover:shadow-lg hover:-translate-y-0.5">
                Start Your 14-Day Free Trial <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Everything you need to grow your practice</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 transition-all hover:shadow-md hover:-translate-y-1">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-6">
                <MessageSquare className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">WhatsApp Automation</h3>
              <p className="text-slate-600 leading-relaxed">
                Send automated appointment reminders and post-op nudges directly via the official Meta Cloud API. No more manual texting.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 transition-all hover:shadow-md hover:-translate-y-1">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-6">
                <CalendarCheck className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Smart Scheduling</h3>
              <p className="text-slate-600 leading-relaxed">
                Manage your calendar with a beautiful, conflict-free scheduling engine designed specifically for complex dental treatments.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 transition-all hover:shadow-md hover:-translate-y-1">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                <Activity className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Revenue Analytics</h3>
              <p className="text-slate-600 leading-relaxed">
                Track payments, outstanding dues, and overall clinic performance with real-time financial dashboards.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer (Crucial for Razorpay KYC) */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden bg-white">
                  <img src="/logo.png" alt="DentHive Logo" className="w-full h-full object-cover" />
                </div>
                <span className="font-bold text-xl tracking-tight text-white">DentHive</span>
              </div>
              <p className="text-sm">
                The ultimate operating system for modern dental clinics. Built for scale.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/login" className="hover:text-white transition-colors">Sign In</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Start Trial</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms & Conditions</Link></li>
                <li><Link href="/refund" className="hover:text-white transition-colors">Cancellation & Refund Policy</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 text-sm text-center">
            <p>&copy; {new Date().getFullYear()} DentHive. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
