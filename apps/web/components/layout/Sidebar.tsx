'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  CalendarDays, 
  Activity, 
  PhoneCall,
  IndianRupee,
  TrendingUp,
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  MessageCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import api from '../../lib/axios';

export const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Patients', href: '/patients', icon: Users },
  { name: 'Appointments', href: '/appointments', icon: CalendarDays },
  { name: 'Active Journeys', href: '/journeys', icon: Activity },
  { name: 'Follow-Ups', href: '/follow-ups', icon: PhoneCall },
  { name: 'Revenue Recovery', href: '/revenue', icon: IndianRupee },
  { name: 'Analytics', href: '/analytics', icon: TrendingUp },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [clinicName, setClinicName] = useState('DentHive');
  const [userInitials, setUserInitials] = useState('DR');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('ADMIN'); // Default to ADMIN for now
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const meta = session.user.user_metadata;
        const appMeta = session.user.app_metadata;
        const firstName = meta?.first_name || meta?.firstName || '';
        const lastName = meta?.last_name || meta?.lastName || '';
        const email = session.user.email || '';
        setUserEmail(email);
        
        if (appMeta?.role) {
          setUserRole(appMeta.role);
        } else if (meta?.role) {
          setUserRole(meta.role);
        }
        if (firstName || lastName) {
          setUserInitials(`${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'DR');
        } else if (email) {
          setUserInitials(email.charAt(0).toUpperCase());
        }
      }

      try {
        const res = await api.get('/tenant');
        if (res.data?.name) setClinicName(res.data.name);
      } catch (e) {
        // keep default
      }
    };
    load();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('supabase.auth.token');
    router.push('/');
  };

  return (
    <div className={`hidden lg:flex flex-col bg-white border-r border-slate-200 z-20 relative flex-shrink-0 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      
      {/* Brand */}
      <div className={`h-20 flex items-center border-b border-slate-100 relative ${isCollapsed ? 'justify-center px-0' : 'px-6'}`}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm border border-slate-100">
          <img src="/logo.png" alt="DentHive Logo" className="w-full h-full object-cover" />
        </div>
        {!isCollapsed && (
          <div className="min-w-0 ml-3">
            <h2 className="text-base font-bold text-slate-900 tracking-tight truncate">{clinicName}</h2>
            <p className="text-[11px] text-slate-400 font-medium">Powered by DentHive</p>
          </div>
        )}
        
        {/* Toggle Collapse Button */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-7 bg-white border border-slate-200 text-slate-400 hover:text-slate-600 rounded-full p-1 shadow-sm z-30"
        >
          {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
        {navItems.map((item) => {
          // Hide sensitive items for STAFF role
          if (userRole === 'STAFF' && ['Revenue Recovery', 'Analytics', 'Settings'].includes(item.name)) {
            return null;
          }
          
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              id={`tour-${item.name.toLowerCase().replace(/ /g, '-')}`}
              href={item.href}
              title={isCollapsed ? item.name : undefined}
              className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} px-4 py-3 rounded-xl text-[15px] font-medium transition-colors ${
                isActive 
                  ? 'bg-indigo-50 text-indigo-700' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'} ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
              {!isCollapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
        {userEmail === 'nishithdharmaraj@gmail.com' && (
          <Link
            href="/admin"
            title={isCollapsed ? 'Super Admin' : undefined}
            className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} px-4 py-3 rounded-xl text-[15px] font-bold transition-colors ${
              pathname.startsWith('/admin')
                ? 'bg-red-50 text-red-700' 
                : 'text-slate-600 hover:bg-red-50 hover:text-red-700'
            }`}
          >
            <Activity className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'} ${pathname.startsWith('/admin') ? 'text-red-600' : 'text-slate-400'}`} />
            {!isCollapsed && <span>Super Admin</span>}
          </Link>
        )}
      </div>

      {/* User Profile + Logout */}
      <div className="p-4 border-t border-slate-100 space-y-1">
        <a 
          href="https://wa.me/916361953329?text=Hi! I need help with my DentHive dashboard." 
          target="_blank" 
          rel="noreferrer"
          title={isCollapsed ? 'Tech Support' : undefined}
          className={`flex items-center ${isCollapsed ? 'justify-center w-full p-3' : 'w-full px-4 py-3'} rounded-xl text-[15px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors mb-2`}
        >
          <MessageCircle className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'} text-emerald-500`} />
          {!isCollapsed && <span>Tech Support</span>}
        </a>

        {/* User info */}
        {!isCollapsed && (
          <div className="flex items-center px-4 py-3 rounded-xl bg-slate-50 mb-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white font-bold text-xs mr-3 flex-shrink-0">
              {userInitials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">{userEmail || 'User'}</p>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{userRole || 'STAFF'}</p>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          title={isCollapsed ? 'Log Out' : undefined}
          className={`flex items-center ${isCollapsed ? 'justify-center w-full p-3' : 'w-full px-4 py-3'} rounded-xl text-[15px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors`}
        >
          <LogOut className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'} text-slate-400`} />
          {!isCollapsed && <span>Log Out</span>}
        </button>
      </div>
    </div>
  );
}
