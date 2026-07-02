import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href="/" className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700 mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
        </Link>
        
        <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-200">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-4">Privacy Policy</h1>
          <p className="text-sm text-slate-500 mb-8">Last updated: {new Date().toLocaleDateString()}</p>
          
          <div className="prose prose-slate max-w-none">
            <p>
              At DentHive, accessible from denthive.com, one of our main priorities is the privacy of our visitors and clients. 
              This Privacy Policy document contains types of information that is collected and recorded by DentHive and how we use it.
            </p>

            <h3>1. Information We Collect</h3>
            <p>
              We collect information to provide better services to all our users. The personal information that you are asked to provide, 
              and the reasons why you are asked to provide it, will be made clear to you at the point we ask you to provide your personal information.
            </p>
            <ul>
              <li><strong>Account Information:</strong> When you register for an Account, we may ask for your contact information, including items such as name, company name, address, email address, and telephone number.</li>
              <li><strong>Patient Data:</strong> Clinics using DentHive will input patient data. This data is strictly segregated and only accessible by the authorized clinic personnel.</li>
              <li><strong>WhatsApp Communications:</strong> We process WhatsApp messages on your behalf via the official Meta Cloud API to facilitate appointment reminders.</li>
            </ul>

            <h3>2. How We Use Your Information</h3>
            <p>We use the information we collect in various ways, including to:</p>
            <ul>
              <li>Provide, operate, and maintain our platform</li>
              <li>Improve, personalize, and expand our platform</li>
              <li>Understand and analyze how you use our platform</li>
              <li>Develop new products, services, features, and functionality</li>
              <li>Communicate with you, either directly or through one of our partners, including for customer service, to provide you with updates and other information relating to the platform.</li>
            </ul>

            <h3>3. Third-Party Services</h3>
            <p>
              DentHive utilizes third-party services such as Razorpay for payment processing and Meta (WhatsApp) for messaging. 
              These third parties have their own privacy policies addressing how they use such information.
            </p>

            <h3>4. Contact Us</h3>
            <p>
              If you have any questions or suggestions about our Privacy Policy, do not hesitate to contact us.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
