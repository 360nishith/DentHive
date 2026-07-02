import Link from 'next/link';
import { ArrowLeft, Mail, Phone, MapPin } from 'lucide-react';

export default function ContactUs() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href="/" className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700 mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
        </Link>
        
        <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-200">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-4">Contact Us</h1>
          <p className="text-slate-600 mb-8">
            Have questions about DentHive, need technical support, or want to explore enterprise pricing? 
            Our team is here to help. Please reach out to us using the contact information below.
          </p>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 flex flex-col gap-4">
              <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Email Us</h3>
                <p className="text-sm text-slate-500 mb-2">For support, billing, or general inquiries.</p>
                <a href="mailto:denthive.support@gmail.com" className="text-indigo-600 hover:underline font-medium">denthive.support@gmail.com</a>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 flex flex-col gap-4">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Call Us</h3>
                <p className="text-sm text-slate-500 mb-2">Available Mon-Fri, 9am - 6pm IST.</p>
                <a href="tel:+916361953329" className="text-emerald-600 hover:underline font-medium">+91 63619 53329</a>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 flex flex-col gap-4 md:col-span-2">
              <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Office Address</h3>
                <p className="text-sm text-slate-500 mb-2">Our physical headquarters (as registered).</p>
                <address className="not-italic text-slate-700 leading-relaxed">
                  DentHive Solutions<br />
                  Behind Telephone Exchange<br />
                  Yekkur-Bajal Road, Mangalore<br />
                  India
                </address>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
