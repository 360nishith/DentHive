import React from 'react';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

export function Badge({ className = '', variant = 'default', ...props }: BadgeProps) {
  const baseStyles = 'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2';
  
  const variants = {
    default: 'border-transparent bg-slate-900 text-slate-50 shadow hover:bg-slate-900/80',
    secondary: 'border-transparent bg-slate-100 text-slate-900 hover:bg-slate-100/80',
    destructive: 'border-transparent bg-red-500 text-slate-50 shadow hover:bg-red-500/80',
    success: 'border-transparent bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    warning: 'border-transparent bg-amber-50 text-amber-700 hover:bg-amber-100',
    outline: 'text-slate-950',
  };

  return (
    <div className={`${baseStyles} ${variants[variant]} ${className}`} {...props} />
  );
}
