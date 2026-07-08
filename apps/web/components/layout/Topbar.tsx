'use client';

import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle2, HelpCircle, Activity, Users, Calendar, IndianRupee, Settings, Menu, X, LogOut } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import api from '../../lib/axios';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { navItems } from './Sidebar';

export function Topbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [initials, setInitials] = useState('DR');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [tenantStatus, setTenantStatus] = useState<string>('ACTIVE');
  const [userRole, setUserRole] = useState('ADMIN');
  const [userEmail, setUserEmail] = useState('');

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/tenant/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [daysLeft, setDaysLeft] = useState(14);
  const [subDaysLeft, setSubDaysLeft] = useState(0);

  const fetchTenant = async () => {
    try {
      const res = await api.get('/tenant');
      
      let isActuallySubscribed = false;
      let remainingSubDays = 0;

      const activeSub = res.data.subscriptions?.find((s: any) => s.status === 'ACTIVE');
      if (activeSub) {
        const periodEnd = new Date(activeSub.currentPeriodEnd).getTime();
        if (periodEnd > Date.now()) {
          isActuallySubscribed = true;
          remainingSubDays = Math.ceil((periodEnd - Date.now()) / (1000 * 60 * 60 * 24));
        }
      }
      
      setIsSubscribed(isActuallySubscribed);
      setSubDaysLeft(remainingSubDays);

      const created = new Date(res.data.createdAt).getTime();
      const used = Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24));
      setDaysLeft(Math.max(0, 14 - used));

      // Dynamically compute the status based on time if they haven't paid
      let computedStatus = res.data.status;
      if (!isActuallySubscribed) {
        if (activeSub || used > 14) {
          computedStatus = 'READ_ONLY';
        } else {
          computedStatus = 'TRIAL';
        }
      }
      setTenantStatus(computedStatus);

    } catch (err) {}
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/tenant/notifications/read-all');
      setNotifications([]);
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const meta = session.user.user_metadata;
        const first = meta?.first_name || meta?.firstName || '';
        const last = meta?.last_name || meta?.lastName || '';
        setUserEmail(session.user.email || '');
        if (session.user.app_metadata?.role) {
          setUserRole(session.user.app_metadata.role);
        } else if (meta?.role) {
          setUserRole(meta.role);
        }
        api.get('/users/me').then(meRes => {
          const { firstName, lastName } = meRes.data || {};
          if (firstName || lastName) {
            setInitials(`${(firstName || '').charAt(0)}${(lastName || '').charAt(0)}`.toUpperCase());
          } else if (session.user.email) {
            setInitials(session.user.email.charAt(0).toUpperCase());
          }
        }).catch(() => {
          if (session.user.email) setInitials(session.user.email.charAt(0).toUpperCase());
        });
        
        // Fetch notifications if logged in
        fetchNotifications();
        fetchTenant();
      }
    });
  }, []);

  return (
    <header className="flex flex-col z-50 sticky top-0">
      {tenantStatus === 'READ_ONLY' && !isSubscribed && (
        <div className="bg-red-500 text-white text-xs font-semibold px-4 py-2 text-center w-full shadow-sm">
          {subDaysLeft === 0 ? 'Your subscription has expired.' : 'Your free trial has expired.'} You are in Read-Only mode. <a href="/settings" className="underline hover:text-red-100 ml-1">Renew Now</a>
        </div>
      )}
      {tenantStatus === 'TRIAL' && !isSubscribed && daysLeft <= 3 && (
        <div className="bg-orange-500 text-white text-xs font-semibold px-4 py-2 text-center w-full shadow-sm">
          Your free trial expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}! <a href="/settings" className="underline hover:text-orange-100 ml-1">Subscribe Now</a> to prevent service interruption.
        </div>
      )}
      {isSubscribed && subDaysLeft <= 5 && (
        <div className="bg-amber-500 text-white text-xs font-semibold px-4 py-2 text-center w-full shadow-sm">
          Your subscription expires in {subDaysLeft} day{subDaysLeft !== 1 ? 's' : ''}! <a href="/settings" className="underline hover:text-amber-100 ml-1">Renew Now</a> to prevent service interruption.
        </div>
      )}
      <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between lg:justify-end px-4 lg:px-6 shadow-sm w-full">
        {/* Mobile Hamburger */}
        <button 
          className="lg:hidden p-2 text-slate-500 hover:text-slate-900 rounded-lg"
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Desktop / Right Side Actions */}
        <div className="flex items-center space-x-2 lg:space-x-4 relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            )}
            <Bell className="h-5 w-5" />
          </button>

          <button 
            onClick={() => {
              setShowHelp(!showHelp);
              setShowNotifications(false);
            }}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <HelpCircle className="h-5 w-5" />
          </button>

          {showHelp && (
            <div className="absolute top-12 right-16 w-64 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50 animate-in slide-in-from-top-2 duration-200">
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-slate-900 text-sm">Interactive Guides</h3>
                <p className="text-xs text-slate-500 mt-1">Learn how to use DentHive</p>
              </div>
              <div className="p-2 space-y-1">
                <button onClick={() => { setShowHelp(false); router.push('/dashboard?tour=true'); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg transition-colors text-left font-medium">
                  <Activity className="w-4 h-4" /> Dashboard Overview
                </button>
                <button onClick={() => { setShowHelp(false); router.push('/patients?tour=true'); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg transition-colors text-left font-medium">
                  <Users className="w-4 h-4" /> Patient Management
                </button>
                <button onClick={() => { setShowHelp(false); router.push('/appointments?tour=true'); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg transition-colors text-left font-medium">
                  <Calendar className="w-4 h-4" /> Calendar & Scheduling
                </button>
                <button onClick={() => { setShowHelp(false); router.push('/revenue?tour=true'); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg transition-colors text-left font-medium">
                  <IndianRupee className="w-4 h-4" /> Revenue Recovery
                </button>
                <button onClick={() => { setShowHelp(false); router.push('/settings?tour=true'); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg transition-colors text-left font-medium">
                  <Settings className="w-4 h-4" /> Clinic Settings
                </button>
              </div>
            </div>
          )}

          {showNotifications && (
            <div className="absolute top-12 right-12 w-80 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50 animate-in slide-in-from-top-2 duration-200">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-900">Notifications</h3>
                {notifications.length > 0 && (
                  <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">{notifications.length} New</span>
                )}
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center flex flex-col items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2 opacity-50" />
                    <p className="text-sm font-medium text-slate-600">You're all caught up!</p>
                    <p className="text-xs text-slate-400 mt-1">No new notifications.</p>
                  </div>
                ) : (
                  notifications.map((notif: any) => (
                    <div key={notif.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer">
                      <p className={`text-sm font-semibold ${notif.type === 'ERROR' ? 'text-red-600' : notif.type === 'WARNING' ? 'text-orange-600' : 'text-slate-900'}`}>
                        {notif.title}
                      </p>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{notif.message}</p>
                      <p className="text-[10px] font-medium text-slate-400 mt-2">
                        {new Date(notif.createdAt).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                  ))
                )}
              </div>
              {notifications.length > 0 && (
                <div className="p-3 text-center border-t border-slate-100 bg-slate-50">
                  <button onClick={markAllAsRead} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
                    Mark all as read
                  </button>
                </div>
              )}
            </div>
          )}
          
          <div className="h-6 w-px bg-slate-200 mx-2 hidden sm:block"></div>
          
          <button className="flex items-center space-x-2 focus:outline-none rounded-full ring-offset-2 focus:ring-2 focus:ring-indigo-500">
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-xs">{initials}</span>
            </div>
          </button>
        </div>
      </div>

      {/* Mobile Navigation Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] flex lg:hidden">
          <div 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200" 
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
          <div className="relative flex flex-col w-[280px] bg-white h-full animate-in slide-in-from-left-8 duration-300 shadow-xl">
            <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 bg-white">
            <div className="flex items-center">
              <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-lg shadow-sm border border-slate-100 mr-3" />
              <span className="font-bold text-slate-900">DentHive</span>
            </div>
            <button 
              className="p-2 text-slate-500 hover:text-slate-900 rounded-lg bg-slate-50"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {navItems.map((item) => {
              if (userRole === 'STAFF' && ['Revenue Recovery', 'Analytics', 'Settings'].includes(item.name)) {
                return null;
              }
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                    isActive 
                      ? 'bg-indigo-50 text-indigo-700' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <item.icon className={`w-5 h-5 mr-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  {item.name}
                </Link>
              );
            })}
            
            {userEmail === 'nishithdharmaraj@gmail.com' && (
              <Link
                href="/admin"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center px-4 py-3 rounded-xl text-base font-bold transition-colors ${
                  pathname.startsWith('/admin')
                    ? 'bg-red-50 text-red-700' 
                    : 'text-slate-600 hover:bg-red-50 hover:text-red-700'
                }`}
              >
                <Activity className={`w-5 h-5 mr-4 ${pathname.startsWith('/admin') ? 'text-red-600' : 'text-slate-400'}`} />
                Super Admin
              </Link>
            )}
          </div>
          <div className="p-4 border-t border-slate-100">
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                localStorage.removeItem('supabase.auth.token');
                router.push('/');
              }}
              className="flex items-center w-full px-4 py-3 rounded-xl text-base font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <LogOut className="w-5 h-5 mr-4 text-slate-400" />
              Log Out
            </button>
          </div>
        </div>
        </div>
      )}
    </header>
  );
}
