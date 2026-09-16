import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { AlertCircle, CheckCircle2, ShieldCheck, Trash2 } from 'lucide-react';

// Pannello "Sicurezza": mostra lo stato del 2FA per l'admin loggato e
// permette di sostituire il fattore (es. cambio telefono).
const MfaSecurityPanel = ({ open, onOpenChange }) => {
  const { listMfaFactors, unenrollMfa, enrollMfa, verifyMfaEnrollment } = useAuth();

  const [factors, setFactors] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [replacing, setReplacing] = useState(false);
  const [newFactor, setNewFactor] = useState(null); // { factorId, qrCode, secret }
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const refresh = async () => {
    setLoading(true);
    setError('');
    const result = await listMfaFactors();
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setFactors(result.factors.filter((f) => f.status === 'verified'));
  };

  useEffect(() => {
    if (open) {
      refresh();
      setReplacing(false);
      setNewFactor(null);
      setCode('');
      setError('');
    }
  }, [open]);

  const startReplace = async () => {
    setError('');
    setReplacing(true);
    const result = await enrollMfa();
    if (result.error) {
      setError(result.error);
      setReplacing(false);
      return;
    }
    setNewFactor(result);
  };

  const confirmReplace = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const result = await verifyMfaEnrollment(newFactor.factorId, code);
    if (!result.success) {
      setSubmitting(false);
      setError(result.error || 'Codice non valido.');
      return;
    }
    // Rimuove i vecchi fattori ormai sostituiti
    if (factors) {
      for (const f of factors) {
        await unenrollMfa(f.id);
      }
    }
    setSubmitting(false);
    setReplacing(false);
    setNewFactor(null);
    setCode('');
    await refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            Sicurezza account
          </DialogTitle>
          <DialogDescription>
            Autenticazione a due fattori (2FA) — obbligatoria per gli account amministratore.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading && <p className="text-sm text-gray-500">Caricamento...</p>}

        {!loading && !replacing && (
          <div className="space-y-4">
            {factors && factors.length > 0 ? (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                2FA attiva su questo account.
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                Nessun fattore 2FA attivo.
              </div>
            )}

            <Button variant="outline" className="w-full" onClick={startReplace}>
              <Trash2 className="h-4 w-4 mr-2" />
              {factors && factors.length > 0 ? 'Sostituisci dispositivo (nuovo telefono)' : 'Attiva 2FA'}
            </Button>
          </div>
        )}

        {replacing && !newFactor && (
          <p className="text-sm text-gray-500 py-4 text-center">Generazione QR code...</p>
        )}

        {replacing && newFactor && (
          <form onSubmit={confirmReplace} className="space-y-4">
            <div className="flex justify-center">
              <img src={newFactor.qrCode} alt="QR code 2FA" className="h-44 w-44 border rounded-lg p-2 bg-white" />
            </div>
            <p className="text-xs text-gray-500 text-center break-all">
              Oppure inserisci manualmente: <span className="font-mono">{newFactor.secret}</span>
            </p>
            <div className="space-y-2">
              <Label htmlFor="replaceCode">Codice generato dalla nuova app</Label>
              <Input
                id="replaceCode"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="h-10 text-center text-lg tracking-[0.3em]"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting || code.length !== 6}>
              {submitting ? 'Conferma in corso...' : 'Conferma e sostituisci'}
            </Button>
            <button
              type="button"
              className="w-full text-sm text-gray-500 hover:text-gray-700"
              onClick={() => { setReplacing(false); setNewFactor(null); setCode(''); }}
            >
              Annulla
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MfaSecurityPanel;
