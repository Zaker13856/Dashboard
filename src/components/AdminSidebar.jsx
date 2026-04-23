import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Briefcase, Users, CreditCard, Clock, Settings, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

const AdminSidebar = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { label: 'Projects', icon: Briefcase, path: '/admin/projects' },
    { label: 'Consultants', icon: Users, path: '/admin/consultants' },
    { label: 'Expenses', icon: CreditCard, path: '/admin/expenses' },
    { label: 'EU Expert', icon: BookOpen, path: '/eu-expert-guida.html', external: true },
    { label: 'Timesheets', icon: Clock, path: '/admin/timesheets' },
    { label: 'Settings', icon: Settings, path: '/admin/settings' },
  ];

  return (
    <div className="hidden md:flex fixed left-0 top-0 h-full w-64 flex-col bg-slate-900 text-white shadow-xl z-50">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold tracking-wider text-blue-400">HOSTINGER</h1>
        <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">Admin Portal</p>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-2">
        {navItems.map((item) => {
          const isActive = !item.external && (currentPath === item.path || (item.path !== '/admin' && currentPath.startsWith(item.path)));
          const cls = cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group",
            isActive
              ? "bg-blue-600 text-white shadow-md shadow-blue-900/20"
              : "text-slate-400 hover:bg-slate-800 hover:text-white"
          );
          const iconCls = cn("w-5 h-5 transition-colors", isActive ? "text-white" : "text-slate-500 group-hover:text-white");
          if (item.external) {
            return (
              <a key={item.path} href={item.path} target="_blank" rel="noopener noreferrer" className={cls}>
                <item.icon className={iconCls} />
                <span>{item.label}</span>
              </a>
            );
          }
          return (
            <Link key={item.path} to={item.path} className={cls}>
              <item.icon className={iconCls} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800 rounded-lg p-3">
          <p className="text-xs text-slate-400 text-center">System v1.0.2</p>
        </div>
      </div>
    </div>
  );
};

export default AdminSidebar;