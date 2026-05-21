import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LogOut, User, LayoutDashboard, WalletCards, BookOpen, KeyRound } from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const ConsultantLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const currentPath = location.pathname;

  const [pwOpen, setPwOpen] = useState(false);

  React.useEffect(() => {
    const handler = () => setPwOpen(true);
    document.addEventListener('open-change-password', handler);
    return () => document.removeEventListener('open-change-password', handler);
  }, []);
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPw !== confirmPw) {
      toast({ title: 'Errore', description: 'Le password non coincidono.', variant: 'destructive' });
      return;
    }
    if (newPw.length < 6) {
      toast({ title: 'Errore', description: 'Password minimo 6 caratteri.', variant: 'destructive' });
      return;
    }
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setPwLoading(false);
    if (error) {
      toast({ title: 'Errore', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Password aggiornata', description: 'Nuova password attiva da subito.' });
      setPwOpen(false);
      setNewPw('');
      setConfirmPw('');
    }
  };

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/consultant' },
    { label: 'Spese', icon: WalletCards, path: '/consultant/expenses' },
    { label: 'EU Expert Guida', icon: BookOpen, path: '/eu-expert-guida.html', external: true },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex flex-col bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        {/* Top bar */}
        <header className="py-3 px-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-wider text-blue-600">ISINNOVA</h1>
            <span className="text-xs text-gray-400 uppercase tracking-widest border-l border-gray-300 pl-2 ml-2">Portale Consulente</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500">{{ consulente: 'Consulente', socio: 'Socio', dipendente: 'Dipendente' }[user?.tipo] || 'Consulente'}</p>
              {user?.tipo === 'socio' && user?.qualifica_socio && (
                <p className="text-xs text-purple-600 font-medium">{user.qualifica_socio}</p>
              )}
              {user?.tipo === 'socio' && user?.socio_dal && (
                <p className="text-[11px] text-gray-400">Socio dal {new Date(user.socio_dal).toLocaleDateString('it-IT')}</p>
              )}
            </div>
            <div className="h-9 w-9 bg-blue-100 rounded-full flex items-center justify-center border border-blue-200 text-blue-700">
              <User className="w-4 h-4" />
            </div>
            <Button
              variant="ghost"
              onClick={() => setPwOpen(true)}
              className="text-gray-500 hover:text-blue-600 hover:bg-blue-50"
              title="Cambia password"
            >
              <KeyRound className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="text-gray-500 hover:text-red-600 hover:bg-red-50"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </Button>

            <Dialog open={pwOpen} onOpenChange={setPwOpen}>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-blue-600" /> Cambia Password
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleChangePassword} className="space-y-4 pt-2">
                  <div className="space-y-1">
                    <Label>Nuova password</Label>
                    <Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="••••••••" required />
                  </div>
                  <div className="space-y-1">
                    <Label>Conferma password</Label>
                    <Input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="••••••••" required />
                  </div>
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={pwLoading}>
                    {pwLoading ? 'Salvataggio...' : 'Aggiorna Password'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* Nav bar */}
        <nav className="px-6 flex overflow-x-auto gap-1 border-t border-gray-100 bg-gray-50/50">
          {navItems.map((item) => {
            const isActive = !item.external && (item.path === '/consultant'
              ? currentPath === '/consultant'
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

      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
          {children}
        </div>
      </main>
    </div>
  );
};

export default ConsultantLayout;
