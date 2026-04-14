import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Shield, Lock, Key, CheckCircle2, AlertTriangle, RefreshCcw, UserPlus } from 'lucide-react';

const AdminPasswordReset = () => {
  const { consultants, resetAllConsultantPasswords, createAuthForConsultants } = useAuth();
  const { toast } = useToast();
  const [loadingReset, setLoadingReset] = useState(false);
  const [loadingCreate, setLoadingCreate] = useState(false);

  const withoutAuth = consultants.filter(c => !c.auth_user_id);

  const handleResetAll = async () => {
    setLoadingReset(true);
    const result = await resetAllConsultantPasswords();
    setLoadingReset(false);
    if (result.success) {
      toast({
        title: 'Password reset completato',
        description: `Password aggiornata per ${result.count} consulenti.`,
        className: 'bg-green-50 border-green-200 text-green-900',
      });
    } else {
      toast({
        title: 'Reset fallito',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  const handleCreateAuth = async () => {
    setLoadingCreate(true);
    const results = await createAuthForConsultants();
    setLoadingCreate(false);
    const failed = results.filter(r => r.error);
    const ok = results.filter(r => !r.error);
    if (failed.length === 0) {
      toast({
        title: 'Utenti creati',
        description: `${ok.length} consulenti ora possono fare login.`,
        className: 'bg-green-50 border-green-200 text-green-900',
      });
    } else {
      toast({
        title: `${ok.length} creati, ${failed.length} falliti`,
        description: failed.map(f => `${f.name}: ${f.error}`).join(' | '),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-t-4 border-t-red-500 shadow-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-red-600" />
            <CardTitle>Gestione Credenziali Consulenti</CardTitle>
          </div>
          <CardDescription>
            Crea account e gestisci password per tutti i consulenti.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* ── Sezione: Crea auth mancanti ── */}
          {withoutAuth.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex gap-3">
                <div className="p-2 bg-yellow-100 rounded-full h-fit">
                  <UserPlus className="w-5 h-5 text-yellow-700" />
                </div>
                <div>
                  <h3 className="font-bold text-yellow-900">Crea Account Mancanti</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    {withoutAuth.length} consulenti senza account Supabase Auth. Password: <code className="bg-white px-2 py-0.5 rounded border border-yellow-200 font-mono text-xs font-bold">Sistina42@</code>
                  </p>
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="border-yellow-400 text-yellow-800 hover:bg-yellow-100 whitespace-nowrap" disabled={loadingCreate}>
                    {loadingCreate ? <RefreshCcw className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                    Crea {withoutAuth.length} Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-yellow-600" /> Conferma creazione account
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Verranno creati account Supabase Auth per:
                      <ul className="mt-2 space-y-1">
                        {withoutAuth.map(c => (
                          <li key={c.id} className="font-mono text-xs">{c.name} — {c.email}</li>
                        ))}
                      </ul>
                      <br />
                      Password iniziale: <span className="font-mono font-bold">Sistina42@</span>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCreateAuth} className="bg-yellow-600 hover:bg-yellow-700">
                      Crea Account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          {/* ── Sezione: Reset bulk password ── */}
          <div className="bg-red-50 border border-red-100 rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex gap-3">
              <div className="p-2 bg-red-100 rounded-full h-fit">
                <Key className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-red-900">Reset Password Bulk</h3>
                <p className="text-sm text-red-700 mt-1">
                  Reimposta password di tutti i consulenti a: <code className="bg-white px-2 py-0.5 rounded border border-red-200 font-mono text-xs font-bold">Sistina42@</code>
                </p>
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="whitespace-nowrap shadow-sm" disabled={loadingReset}>
                  {loadingReset ? <RefreshCcw className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                  Reset Tutte le Password
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" /> Conferma Reset Bulk
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Sovrascrive le password di tutti i consulenti con <span className="font-mono font-bold">Sistina42@</span>.
                    <br /><br />
                    Agisce solo su consulenti con account già esistente ({consultants.filter(c => c.auth_user_id).length} su {consultants.length}).
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetAll} className="bg-red-600 hover:bg-red-700">
                    Sì, Reset Tutti
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* ── Tabella stato ── */}
          <div className="border rounded-md overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b">
              <h3 className="text-sm font-semibold text-gray-700">Stato Account Consulenti</h3>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-white text-gray-500 sticky top-0 shadow-sm z-10">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Nome</th>
                    <th className="px-4 py-2 text-left font-medium">Email</th>
                    <th className="px-4 py-2 text-right font-medium">Stato</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {consultants.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs font-mono">{c.email}</td>
                      <td className="px-4 py-3 text-right">
                        {c.auth_user_id ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Attivo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                            Senza Account
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPasswordReset;
