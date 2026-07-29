import { Server, Shield, Database, Activity, PhoneCall } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: 'Service Level Agreement (SLA) & Reliability | DentHive',
  description: 'Our commitment to 99.9% uptime, data security, and instant tech support for dental clinics.',
};

export default function SLAPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden shadow-sm border border-slate-100">
                <img src="/logo.png" alt="DentHive Logo" className="w-full h-full object-cover" />
              </div>
              <span className="font-bold text-xl tracking-tight text-slate-900">DentHive</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">
                Log in
              </Link>
              <Link href="/register" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm">
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex-grow pt-16 pb-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-6">
              Our Reliability Guarantee
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              We know that a slow or crashing software can ruin your clinic's workflow. That's why DentHive is engineered on enterprise-grade infrastructure with a strict <strong>99.9% Uptime SLA</strong>.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-6">
                <Server className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">No Lags, No Hangs</h3>
              <p className="text-slate-600 leading-relaxed">
                DentHive is hosted on a global Edge Network. This means the software automatically scales resources during your peak clinic hours. Whether you have 10 or 1,000 patients, the dashboard remains lightning fast without freezing.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-6">
                <Database className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Daily Automated Backups</h3>
              <p className="text-slate-600 leading-relaxed">
                Your patient data is your most valuable asset. Our managed PostgreSQL databases perform automated backups every 24 hours with geographical replication. Even if your clinic's computer crashes, your data is completely safe in the cloud.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Bank-Grade Security</h3>
              <p className="text-slate-600 leading-relaxed">
                All patient records, prescriptions, and financial data are encrypted both in transit (SSL/TLS) and at rest. We adhere strictly to modern web security standards to ensure your clinic's data remains entirely private.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-6">
                <Activity className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">99.9% Uptime Guarantee</h3>
              <p className="text-slate-600 leading-relaxed">
                We guarantee 99.9% availability of the DentHive core services. We run constant automated health checks to ensure the system is operational when you and your patients need it most.
              </p>
            </div>
          </div>

          <div className="bg-indigo-600 rounded-3xl p-8 md:p-12 text-center shadow-xl border border-indigo-500 overflow-hidden relative">
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-indigo-500 rounded-full blur-3xl opacity-50"></div>
            <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-32 h-32 bg-indigo-700 rounded-full blur-3xl opacity-50"></div>
            
            <div className="relative z-10">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
                <PhoneCall className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Direct WhatsApp Support</h2>
              <p className="text-indigo-100 mb-8 max-w-2xl mx-auto text-lg">
                Unlike other platforms with slow email tickets, every DentHive dashboard includes a dedicated Tech Support button. Need help? Experience a bug? Message our engineering team directly on WhatsApp for instant resolution.
              </p>
              <a 
                href="https://wa.me/916361953329?text=Hi! I have a question about DentHive's reliability."
                target="_blank"
                rel="noreferrer"
                className="inline-block bg-white text-indigo-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-50 transition-colors shadow-lg"
              >
                Chat with Support Now
              </a>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-500 text-sm">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-md overflow-hidden grayscale opacity-50">
              <img src="/logo.png" alt="DentHive Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold tracking-tight">DentHive</span>
          </div>
          <p>© {new Date().getFullYear()} DentHive. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
