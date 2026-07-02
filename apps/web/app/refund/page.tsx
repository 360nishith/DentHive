import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href="/" className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700 mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
        </Link>
        
        <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-200">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-4">Cancellation & Refund Policy</h1>
          <p className="text-sm text-slate-500 mb-8">Last updated: {new Date().toLocaleDateString()}</p>
          
          <div className="prose prose-slate max-w-none">
            <p>
              Thank you for subscribing to DentHive. We strive to provide the best clinical management and automation tools for your practice.
              However, we understand that situations arise where you may need to cancel your subscription or request a refund.
            </p>

            <h3>1. Cancellations</h3>
            <p>
              You can cancel your DentHive subscription at any time. Your cancellation will take effect at the end of the current paid term. 
              To cancel, simply navigate to the Billing section of your dashboard and click "Cancel Subscription", or contact our support team.
              Once canceled, you will continue to have access to the platform until the end of your billing cycle.
            </p>

            <h3>2. Refund Policy</h3>
            <p>
              Because DentHive provides a 14-day free trial for you to evaluate the software before purchasing, we generally do not offer refunds for partial months of service or for unused time if you cancel early.
            </p>
            <p>
              Exceptions may be granted in the following circumstances:
            </p>
            <ul>
              <li><strong>Technical Failures:</strong> If you experience severe, documented technical issues that prevent you from using the core features of DentHive, and our team is unable to resolve them within a reasonable timeframe.</li>
              <li><strong>Billing Errors:</strong> If you were charged incorrectly due to a system glitch.</li>
            </ul>

            <h3>3. Requesting a Refund</h3>
            <p>
              To request a refund under the exceptions listed above, please contact our support team within 7 days of the charge. 
              Please include your account details and the reason for your request. Refunds are issued at the sole discretion of DentHive.
            </p>
            <p>
              If approved, your refund will be processed, and a credit will automatically be applied to your credit card or original method of payment within 5-7 business days.
            </p>

            <h3>4. Digital Goods Delivery</h3>
            <p>
              DentHive is a Software as a Service (SaaS) platform. All access to the platform is provided digitally immediately upon successful payment. 
              There are no physical goods shipped or delivered.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
