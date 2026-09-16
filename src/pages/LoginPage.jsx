
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, KeyRound, AlertCircle, ShieldCheck, Smartphone } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Step verifica 2FA (admin con TOTP già attivo)
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [mfaSubmitting, setMfaSubmitting] = useState(false);

  // Step attivazione 2FA obbligatoria (admin senza TOTP)
  const [setupData, setSetupData] = useState(null); // { factorId, qrCode, secret }
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupCode, setSetupCode] = useState('');
  const [setupError, setSetupError] = useState('');
  const [setupSubmitting, setSetupSubmitting] = useState(false);

  const {
    login, isAuthenticated, user, mfaPending,
    verifyMfaCode, enrollMfa, verifyMfaEnrollment, cancelMfaLogin,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (mfaPending?.type === 'setup' && !setupData && !setupLoading) {
      setSetupLoading(true);
      enrollMfa().then((result) => {
        setSetupLoading(false);
        if (result.error) {
          setSetupError(result.error);
        } else {
          setSetupData(result);
        }
      });
    }
    if (!mfaPending) {
      // reset stati locali quando si torna alla schermata di login
      setSetupData(null);
      setMfaCode('');
      setMfaError('');
      setSetupCode('');
      setSetupError('');
    }
  }, [mfaPending, setupData, setupLoading, enrollMfa]);

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
      } else if (result.mfaRequired || result.mfaSetupRequired) {
        // Niente redirect: la UI passa allo step 2FA (vedi mfaPending nel context)
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

  const handleVerifyMfa = async (e) => {
    e.preventDefault();
    setMfaError('');
    setMfaSubmitting(true);
    const result = await verifyMfaCode(mfaCode);
    setMfaSubmitting(false);
    if (!result.success) {
      setMfaError(result.error || 'Codice non valido.');
      setMfaCode('');
      return;
    }
    toast({ title: "Accesso Effettuato", description: "Verifica in due passaggi completata." });
  };

  const handleConfirmSetup = async (e) => {
    e.preventDefault();
    setSetupError('');
    setSetupSubmitting(true);
    const result = await verifyMfaEnrollment(setupData.factorId, setupCode);
    setSetupSubmitting(false);
    if (!result.success) {
      setSetupError(result.error || 'Codice non valido.');
      setSetupCode('');
      return;
    }
    toast({ title: "2FA Attivata", description: "Autenticazione a due fattori configurata con successo." });
  };

  const handleCancelMfa = async () => {
    setIsLoading(false);
    setMfaSubmitting(false);
    setSetupSubmitting(false);
    await cancelMfaLogin();
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

          {mfaPending?.type === 'verify' ? (
            <>
              <CardHeader className="text-center pt-8 pb-4">
                <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-blue-50 flex items-center justify-center">
                  <ShieldCheck className="h-7 w-7 text-blue-600" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">Verifica in due passaggi</CardTitle>
                <CardDescription>
                  Apri Microsoft Authenticator e inserisci il codice a 6 cifre
                </CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-10">
                <form onSubmit={handleVerifyMfa} className="space-y-5">
                  {mfaError && (
                    <Alert variant="destructive" className="py-2 animate-in slide-in-from-top-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{mfaError}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="mfaCode">Codice a 6 cifre</Label>
                    <Input
                      id="mfaCode"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      placeholder="123456"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                      className="h-10 text-center text-lg tracking-[0.3em] text-gray-900 bg-white"
                      autoFocus
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 text-base font-semibold bg-slate-900 hover:bg-slate-800 transition-all text-white"
                    disabled={mfaSubmitting || mfaCode.length !== 6}
                  >
                    {mfaSubmitting ? "Verifica in corso..." : "Verifica"}
                  </Button>
                  <button
                    type="button"
                    onClick={handleCancelMfa}
                    className="w-full text-sm text-gray-500 hover:text-gray-700"
                  >
                    Annulla e torna al login
                  </button>
                </form>
              </CardContent>
            </>
          ) : mfaPending?.type === 'setup' ? (
            <>
              <CardHeader className="text-center pt-8 pb-4">
                <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-blue-50 flex items-center justify-center">
                  <Smartphone className="h-7 w-7 text-blue-600" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">Attiva l'autenticazione a due fattori</CardTitle>
                <CardDescription>
                  Obbligatoria per gli account amministratore. Scansiona il QR code con Microsoft Authenticator (o un'app compatibile).
                </CardDescription>
              </CardHeader>
              <CardContent className="px-8 pb-10">
                {setupLoading && (
                  <p className="text-center text-sm text-gray-500 py-6">Generazione QR code...</p>
                )}
                {setupError && !setupData && (
                  <Alert variant="destructive" className="py-2 mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{setupError}</AlertDescription>
                  </Alert>
                )}
                {setupData && (
                  <form onSubmit={handleConfirmSetup} className="space-y-5">
                    <div className="flex justify-center">
                      <img src={setupData.qrCode} alt="QR code 2FA" className="h-44 w-44 border rounded-lg p-2 bg-white" />
                    </div>
                    <p className="text-xs text-gray-500 text-center break-all">
                      Non riesci a scansionare? Inserisci manualmente: <span className="font-mono">{setupData.secret}</span>
                    </p>
                    {setupError && (
                      <Alert variant="destructive" className="py-2 animate-in slide-in-from-top-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{setupError}</AlertDescription>
                      </Alert>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="setupCode">Codice generato dall'app</Label>
                      <Input
                        id="setupCode"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="123456"
                        value={setupCode}
                        onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, ''))}
                        className="h-10 text-center text-lg tracking-[0.3em] text-gray-900 bg-white"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-11 text-base font-semibold bg-slate-900 hover:bg-slate-800 transition-all text-white"
                      disabled={setupSubmitting || setupCode.length !== 6}
                    >
                      {setupSubmitting ? "Attivazione in corso..." : "Conferma e attiva"}
                    </Button>
                    <button
                      type="button"
                      onClick={handleCancelMfa}
                      className="w-full text-sm text-gray-500 hover:text-gray-700"
                    >
                      Annulla e torna al login
                    </button>
                  </form>
                )}
              </CardContent>
            </>
          ) : (
          <>
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
          </>
          )}
        </Card>
      </motion.div>
    </div>
  );
};

export default LoginPage;
