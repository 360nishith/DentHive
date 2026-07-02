import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href="/" className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700 mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
        </Link>
        
        <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-200">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-4">Terms and Conditions</h1>
          <p className="text-sm text-slate-500 mb-8">Last updated: {new Date().toLocaleDateString()}</p>
          
          <div className="prose prose-slate max-w-none">
            <p>
              Welcome to DentHive! These terms and conditions outline the rules and regulations for the use of DentHive's Software as a Service (SaaS) Platform.
            </p>

            <h3>1. Terms</h3>
            <p>
              By accessing this platform, you are agreeing to be bound by these Terms and Conditions and agree that you are responsible for compliance with any applicable local laws. 
              If you disagree with any of these terms, you are prohibited from accessing this site.
            </p>

            <h3>2. Use License</h3>
            <p>
              Permission is granted to temporarily access the materials (information or software) on DentHive's website for personal, non-commercial transitory viewing only. 
              This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul>
              <li>Modify or copy the materials;</li>
              <li>Use the materials for any commercial purpose, or for any public display;</li>
              <li>Attempt to decompile or reverse engineer any software contained on DentHive's website;</li>
              <li>Remove any copyright or other proprietary notations from the materials;</li>
            </ul>

            <h3>3. Subscriptions and Payments</h3>
            <p>
              DentHive is a subscription-based service. By subscribing, you authorize DentHive (via Razorpay) to charge the applicable subscription fees to your designated payment method.
              Subscriptions automatically renew unless canceled. You must provide current, complete, and accurate billing information.
            </p>

            <h3>4. Fair Usage Policy</h3>
            <p>
              Automated WhatsApp reminders and messages are subject to Meta's Cloud API limits and terms. DentHive reserves the right to suspend accounts that abuse messaging quotas, engage in spam, or violate Meta's commerce policies.
            </p>

            <h3>5. Disclaimer</h3>
            <p>
              The materials on DentHive's platform are provided on an 'as is' basis. DentHive makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
            </p>

            <h3>6. Governing Law</h3>
            <p>
              These terms and conditions are governed by and construed in accordance with the laws of India, and you irrevocably submit to the exclusive jurisdiction of the courts in that State or location.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
