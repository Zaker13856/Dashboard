import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, User, Bell, LayoutDashboard, Briefcase, Users, CreditCard, BarChart2, BookOpen, Archive } from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const AdminHeader = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { label: 'Projects', icon: Briefcase, path: '/admin/projects' },
    { label: 'Consultants', icon: Users, path: '/admin/consultants' },
    { label: 'Reports', icon: BarChart2, path: '/admin/reports' },
    { label: 'Expenses', icon: CreditCard, path: '/admin/expenses' },
    { label: 'EU Expert Guida', icon: BookOpen, path: '/eu-expert-guida.html', external: true },
    { label: 'Repository', icon: Archive, path: '/admin/repository' },
  ];

  return (
    <div className="flex flex-col bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      {/* Top Bar: Brand, User Profile, Logout */}
      <header className="py-3 px-6 flex justify-between items-center">
         <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-wider text-blue-600">HOSTINGER</h1>
            <span className="text-xs text-gray-400 uppercase tracking-widest border-l border-gray-300 pl-2 ml-2">Admin Portal</span>
         </div>
         
         <div className="flex items-center gap-4">
           <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700">
             <Bell className="w-5 h-5" />
           </Button>
           
           <div className="h-6 w-px bg-gray-200 mx-1"></div>
           
           <div className="flex items-center gap-3">
             <div className="text-right hidden sm:block">
               <p className="text-sm font-semibold text-gray-900">{user?.name || 'Admin User'}</p>
               <p className="text-xs text-gray-500">Administrator</p>
             </div>
             <div className="h-9 w-9 bg-blue-100 rounded-full flex items-center justify-center border border-blue-200 text-blue-700">
                <User className="w-4 h-4" />
             </div>
           </div>
           
           <Button 
             variant="ghost" 
             onClick={handleLogout}
             className="ml-2 text-gray-500 hover:text-red-600 hover:bg-red-50"
             title="Logout"
           >
             <LogOut className="w-5 h-5" />
           </Button>
         </div>
      </header>

      {/* Global Navigation Bar */}
      <nav className="px-6 flex overflow-x-auto gap-1 border-t border-gray-100 bg-gray-50/50">
        {navItems.map((item) => {
          const isActive = !item.external && (item.path === '/admin'
            ? currentPath === '/admin'
            : currentPath.startsWith(item.path));
          const className = cn(
            "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap",
            isActive
              ? "border-blue-600 text-blue-600 bg-white"
              : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300 hover:bg-white/50"
          );
          const iconEl = <item.icon className={cn("w-4 h-4", isActive ? "text-blue-600" : "text-gray-400")} />;
          if (item.external) {
            return (
              <a key={item.path} href={item.path} target="_blank" rel="noopener noreferrer" className={className}>
                {iconEl}
                <span>{item.label}</span>
              </a>
            );
          }
          return (
            <Link key={item.path} to={item.path} className={className}>
              {iconEl}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default AdminHeader;