import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, User, LayoutDashboard, Clock, WalletCards } from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const ConsultantLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/consultant' },
    { label: 'Timesheet', icon: Clock, path: '/consultant/timesheet' },
    { label: 'Spese', icon: WalletCards, path: '/consultant/expenses' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex flex-col bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        {/* Top bar */}
        <header className="py-3 px-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-wider text-blue-600">ISInnova</h1>
            <span className="text-xs text-gray-400 uppercase tracking-widest border-l border-gray-300 pl-2 ml-2">Portale Consulente</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500">Consulente</p>
            </div>
            <div className="h-9 w-9 bg-blue-100 rounded-full flex items-center justify-center border border-blue-200 text-blue-700">
              <User className="w-4 h-4" />
            </div>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="text-gray-500 hover:text-red-600 hover:bg-red-50"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* Nav bar */}
        <nav className="px-6 flex overflow-x-auto gap-1 border-t border-gray-100 bg-gray-50/50">
          {navItems.map((item) => {
            const isActive = item.path === '/consultant'
              ? currentPath === '/consultant'
              : currentPath.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap",
                  isActive
                    ? "border-blue-600 text-blue-600 bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300 hover:bg-white/50"
                )}
              >
                <item.icon className={cn("w-4 h-4", isActive ? "text-blue-600" : "text-gray-400")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
          {children}
        </div>
      </main>
    </div>
  );
};

export default ConsultantLayout;
