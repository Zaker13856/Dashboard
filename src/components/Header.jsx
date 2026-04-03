import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, User, ShieldCheck } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const Header = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Hide Global Header on Admin Pages (AdminLayout has its own header)
  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  if (!isAuthenticated || !user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-gray-200 py-4 px-6 mb-6 shadow-sm">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${user.role === 'admin' ? 'bg-purple-600' : 'bg-blue-600'} text-white`}>
            {user.role === 'admin' ? <ShieldCheck className="h-5 w-5" /> : <User className="h-5 w-5" />}
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 leading-tight">{user.name}</h2>
            <p className="text-xs text-gray-500 capitalize font-medium">{user.role}</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          onClick={handleLogout}
          className="flex items-center gap-2 text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </Button>
      </div>
    </header>
  );
};

export default Header;