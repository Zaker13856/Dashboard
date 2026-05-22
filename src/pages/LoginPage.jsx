
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, KeyRound, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated && user) {
      const from = location.state?.from?.pathname;
      if (from) {
        navigate(from, { replace: true });
        return;
      }
      if (user.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/consultant', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate, location]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Inputs are trimmed within the AuthContext login function, 
      // but passing them exactly as typed from the form state.
      const result = await login(username, password);
      
      if (!result.success) {
        setError(result.error || "Email o password non valida");
        toast({
          title: "Accesso Negato",
          description: result.error || "Email o password non valida",
          variant: "destructive",
        });
        setIsLoading(false);
      } else {
        toast({
          title: "Accesso Effettuato",
          description: `Benvenuto, ${result.user.name || result.user.email}!`,
        });
      }
    } catch (err) {
      console.error('Login submit error:', err);
      setError("Si è verificato un errore di rete. Riprova.");
      toast({
        title: "Errore",
        description: "Errore imprevisto durante l'accesso.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-2xl border-0 overflow-hidden bg-white">
          <div className="h-2 w-full" style={{background: 'linear-gradient(to right, #F5A623, #4A90D9, #5CB85C)'}} />
          <CardHeader className="text-center pt-8 pb-4">
            <div className="mx-auto mb-4">
              <img src="/isinnova-logo.jpg" alt="ISINNOVA" className="h-16 w-auto mx-auto object-contain" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">DASHBOARD</CardTitle>
            <CardDescription>
              Inserisci le tue credenziali per accedere al sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-10">
            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <Alert variant="destructive" className="py-2 animate-in slide-in-from-top-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="username">Email</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input 
                    id="username"
                    placeholder="es. utente@isinnova.org" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-9 h-10 text-gray-900 bg-white"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input 
                    id="password"
                    type="password"
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 h-10 text-gray-900 bg-white"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 text-base font-semibold bg-slate-900 hover:bg-slate-800 transition-all text-white"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verifica in corso...
                  </span>
                ) : "Accedi"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default LoginPage;
