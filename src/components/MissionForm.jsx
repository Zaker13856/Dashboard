import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTimesheet } from '@/context/TimesheetContext';
import { useExpenses } from '@/context/ExpenseContext';
import { useMissions } from '@/context/MissionContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, Trash2, MapPin, Calendar, Users, FileText, Euro, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';

const PAYMENT_METHODS = [
  { value: 'carta_personale', label: 'Carta Personale' },
  { value: 'carta_aziendale', label: 'Carta Aziendale' },
  { value: 'cash', label: 'Cash' },
];

const EXPENSE_SUBTYPES = [
  { value: 'Transportation', label: 'Transportation' },
  { value: 'Lodging', label: 'Lodging' },
  { value: 'Meals', label: 'Meals' },
  { value: 'Other', label: 'Other' },
];

const emptyRow = (date = '') => ({
  _id: Math.random().toString(36).slice(2),
  payment_method: 'carta_personale',
  transaction_date: date,
  sub_type: 'Transportation',
  description: '',
  amount: '',
  iva: '',
  eligible: 0,
});

const fmt = n => new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

const MissionForm = () => {
  const { user } = useAuth();
  const { projects } = useTimesheet();
  const { addExpense } = useExpenses();
  const { createMission } = useMissions();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);

  const [header, setHeader] = useState({
    projectId: '',
    place: '',
    dateFrom: '',
    dateTo: '',
    travellingWith: '',
  });

  const [rows, setRows] = useState([emptyRow()]);

  const activeProjects = Array.isArray(projects)
    ? projects.filter(p => p.status !== 'completed' && p.status !== 'archived')
    : [];

  const handleHeader = (field, value) => {
    setHeader(prev => ({ ...prev, [field]: value }));
    // Sync transaction dates to date_from when set
    if (field === 'dateFrom') {
      setRows(prev => prev.map(r => r.transaction_date === '' ? { ...r, transaction_date: value } : r));
    }
  };

  const handleRow = (idx, field, value) => {
    setRows(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      const next = { ...r, [field]: value };
      if (field === 'amount' || field === 'iva') {
        const amt = parseFloat(field === 'amount' ? value : next.amount) || 0;
        const iva = parseFloat(field === 'iva' ? value : next.iva) || 0;
        next.eligible = parseFloat(Math.max(0, amt - iva).toFixed(2));
      }
      return next;
    }));
  };

  const addRow = () => {
    setRows(prev => [...prev, emptyRow(header.dateFrom || '')]);
  };

  const removeRow = (idx) => {
    setRows(prev => prev.filter((_, i) => i !== idx));
  };

  const totals = rows.reduce((acc, r) => ({
    amount: acc.amount + (parseFloat(r.amount) || 0),
    iva: acc.iva + (parseFloat(r.iva) || 0),
    eligible: acc.eligible + (r.eligible || 0),
  }), { amount: 0, iva: 0, eligible: 0 });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      toast({ title: 'Errore', description: 'Sessione scaduta', variant: 'destructive' });
      return;
    }

    if (!header.projectId || !header.place || !header.dateFrom || !header.dateTo) {
      toast({ title: 'Errore', description: 'Compila tutti i campi obbligatori della missione.', variant: 'destructive' });
      return;
    }

    const validRows = rows.filter(r => r.amount && parseFloat(r.amount) > 0);
    if (validRows.length === 0) {
      toast({ title: 'Errore', description: 'Aggiungi almeno una voce di spesa.', variant: 'destructive' });
      return;
    }

    for (const r of validRows) {
      if (!r.transaction_date) {
        toast({ title: 'Errore', description: 'Ogni voce deve avere una data di transazione.', variant: 'destructive' });
        return;
      }
    }

    setIsLoading(true);
    try {
      // 1. Create mission
      const { data: mission, error: mErr } = await createMission({
        consultantId: user.id,
        projectId: header.projectId,
        place: header.place,
        dateFrom: header.dateFrom,
        dateTo: header.dateTo,
        travellingWith: header.travellingWith || null,
      });

      if (mErr) {
        toast({ title: 'Errore', description: mErr.message || String(mErr), variant: 'destructive' });
        return;
      }

      // 2. Insert expense rows
      let hasError = false;
      for (const r of validRows) {
        const desc = r.description
          ? `[${r.sub_type}] ${r.description}`
          : `[${r.sub_type}]`;

        const result = await addExpense({
          consultantId: user.id,
          projectId: header.projectId,
          date: header.dateFrom,          // data missione = date_from
          paymentDate: r.transaction_date, // data transazione
          type: 'travel',
          amount: parseFloat(r.amount),
          iva: parseFloat(r.iva) || 0,
          eligibleAmount: r.eligible,
          description: desc,
          place: header.place,
          paymentMethod: r.payment_method,
          missionId: mission.id,
        });

        if (result?.error) {
          hasError = true;
          toast({ title: 'Errore voce', description: result.error.message || String(result.error), variant: 'destructive' });
        }
      }

      if (!hasError) {
        toast({ title: 'Nota Spese salvata', description: `${validRows.length} voci registrate per ${header.place}.` });
        setHeader({ projectId: '', place: '', dateFrom: '', dateTo: '', travellingWith: '' });
        setRows([emptyRow()]);
      }
    } catch (err) {
      console.error('Mission submit error', err);
      toast({ title: 'Errore', description: 'Errore durante il salvataggio.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* ── HEADER MISSIONE ─────────────────────────────── */}
      <Card className="border-t-4 border-t-purple-500 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="w-4 h-4 text-purple-600" />
            Dati Missione
          </CardTitle>
          <CardDescription>Progetto, destinazione e periodo della trasferta</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Progetto */}
            <div className="space-y-1.5">
              <Label>Progetto *</Label>
              <Select value={header.projectId} onValueChange={v => handleHeader('projectId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona progetto" />
                </SelectTrigger>
                <SelectContent>
                  {activeProjects.length > 0 ? (
                    activeProjects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>Nessun progetto attivo</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Destinazione */}
            <div className="space-y-1.5">
              <Label>Destinazione *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="es. Bologna (ENEA Headquarters)"
                  value={header.place}
                  onChange={e => handleHeader('place', e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            {/* Travelling with */}
            <div className="space-y-1.5">
              <Label>Travelling with</Label>
              <div className="relative">
                <Users className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Nome collega (opzionale)"
                  value={header.travellingWith}
                  onChange={e => handleHeader('travellingWith', e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Data from */}
            <div className="space-y-1.5">
              <Label>Data inizio missione *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  value={header.dateFrom}
                  onChange={e => handleHeader('dateFrom', e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            {/* Data to */}
            <div className="space-y-1.5">
              <Label>Data fine missione *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  value={header.dateTo}
                  min={header.dateFrom}
                  onChange={e => handleHeader('dateTo', e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── VOCI SPESA ──────────────────────────────────── */}
      <Card className="shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="w-4 h-4 text-gray-600" />
            Voci di Spesa
          </CardTitle>
          <CardDescription>Aggiungi tutte le spese sostenute durante la missione</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-y border-gray-200 text-gray-500 uppercase tracking-wide text-[10px]">
                  <th className="px-3 py-2.5 text-left font-medium w-36">Metodo Pagamento</th>
                  <th className="px-3 py-2.5 text-left font-medium w-32">Data Transazione</th>
                  <th className="px-3 py-2.5 text-left font-medium w-32">Tipo</th>
                  <th className="px-3 py-2.5 text-left font-medium">Descrizione / Note</th>
                  <th className="px-3 py-2.5 text-right font-medium w-24">Importo €</th>
                  <th className="px-3 py-2.5 text-right font-medium w-20">IVA €</th>
                  <th className="px-3 py-2.5 text-right font-medium w-24 text-purple-700">Eligible €</th>
                  <th className="px-3 py-2.5 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row, idx) => (
                  <tr key={row._id} className="hover:bg-gray-50/50">
                    {/* Payment method */}
                    <td className="px-2 py-1.5">
                      <Select value={row.payment_method} onValueChange={v => handleRow(idx, 'payment_method', v)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_METHODS.map(m => (
                            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    {/* Transaction date */}
                    <td className="px-2 py-1.5">
                      <Input
                        type="date"
                        value={row.transaction_date}
                        onChange={e => handleRow(idx, 'transaction_date', e.target.value)}
                        className="h-8 text-xs"
                        required
                      />
                    </td>
                    {/* Sub type */}
                    <td className="px-2 py-1.5">
                      <Select value={row.sub_type} onValueChange={v => handleRow(idx, 'sub_type', v)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EXPENSE_SUBTYPES.map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    {/* Description */}
                    <td className="px-2 py-1.5">
                      <Input
                        placeholder="es. Taxi aeroporto, Hotel 1 notte..."
                        value={row.description}
                        onChange={e => handleRow(idx, 'description', e.target.value)}
                        className="h-8 text-xs"
                      />
                    </td>
                    {/* Amount */}
                    <td className="px-2 py-1.5">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={row.amount}
                        onChange={e => handleRow(idx, 'amount', e.target.value)}
                        className="h-8 text-xs text-right"
                        required
                      />
                    </td>
                    {/* IVA */}
                    <td className="px-2 py-1.5">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={row.iva}
                        onChange={e => handleRow(idx, 'iva', e.target.value)}
                        className="h-8 text-xs text-right"
                      />
                    </td>
                    {/* Eligible (readonly) */}
                    <td className="px-2 py-1.5">
                      <Input
                        type="number"
                        value={row.eligible}
                        readOnly
                        className="h-8 text-xs text-right bg-purple-50 text-purple-900 border-purple-200 font-medium"
                      />
                    </td>
                    {/* Delete row */}
                    <td className="px-2 py-1.5">
                      {rows.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => removeRow(idx)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Totals footer */}
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-300 font-bold text-xs">
                  <td colSpan={4} className="px-3 py-2 text-gray-700 uppercase tracking-wide text-[10px]">Totale</td>
                  <td className="px-3 py-2 text-right text-gray-900">€ {fmt(totals.amount)}</td>
                  <td className="px-3 py-2 text-right text-red-600">€ {fmt(totals.iva)}</td>
                  <td className="px-3 py-2 text-right text-purple-700 font-bold">€ {fmt(totals.eligible)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Add row button */}
          <div className="p-3 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addRow}
              className="text-xs gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Aggiungi voce
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <Button
        type="submit"
        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Salvataggio...
          </>
        ) : (
          'Salva Nota Spese'
        )}
      </Button>
    </form>
  );
};

export default MissionForm;
