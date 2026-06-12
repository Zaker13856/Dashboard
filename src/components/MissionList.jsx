import React, { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useExpenses } from '@/context/ExpenseContext';
import { useMissions } from '@/context/MissionContext';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, MapPin, FileSpreadsheet, FileText, CreditCard, Wallet, Banknote, Pencil, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import * as XLSX from 'xlsx';

const fmt = n => new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

const fmtDate = (d) => {
  if (!d) return '—';
  try { return format(new Date(d), 'dd/MM/yyyy'); } catch { return d; }
};

const PAYMENT_LABELS = {
  carta_personale: 'Carta Personale',
  carta_aziendale: 'Carta Aziendale',
  cash: 'Cash',
};

const PAYMENT_ICONS = {
  carta_personale: CreditCard,
  carta_aziendale: Wallet,
  cash: Banknote,
};

const SUBTYPE_COLOR = {
  Transportation: 'bg-blue-100 text-blue-700 border-blue-200',
  Lodging:        'bg-indigo-100 text-indigo-700 border-indigo-200',
  Meals:          'bg-orange-100 text-orange-700 border-orange-200',
  Other:          'bg-gray-100 text-gray-700 border-gray-200',
};

const parseSubType = (description) => {
  if (!description) return { subType: 'Other', text: '' };
  const match = description.match(/^\[([^\]]+)\]\s*(.*)/);
  if (match) return { subType: match[1], text: match[2] };
  return { subType: 'Other', text: description };
};

// ── Export ISINNOVA template ────────────────────────────────────────────────
const exportISINNOVA = (mission, expenses, consultantName) => {
  const wb = XLSX.utils.book_new();

  // Build rows for the expense table
  const rows = expenses.map(e => {
    const { subType, text } = parseSubType(e.description);
    const amt = parseFloat(e.amount) || 0;
    const iva = parseFloat(e.iva) || 0;
    return {
      'Payment Method': PAYMENT_LABELS[e.payment_method] || e.payment_method || '',
      'Date of Transaction': fmtDate(e.payment_date || e.date),
      'Notes/Description': text || e.description || '',
      'Currency': 'EURO',
      'Transportation': subType === 'Transportation' ? amt : '',
      'Lodging':        subType === 'Lodging'        ? amt : '',
      'Meals':          subType === 'Meals'           ? amt : '',
      'Other':          subType === 'Other'           ? amt : '',
      'VAT':            iva || '',
      'Rec':            '',
      'TOTAL EURO':     amt,
      'VAT ': iva || 0,
    };
  });

  // Totals row
  const totalAmt = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const totalIva = expenses.reduce((s, e) => s + (parseFloat(e.iva) || 0), 0);
  const totalElig = expenses.reduce((s, e) => s + (parseFloat(e.eligible_amount) || 0), 0);
  // Rimborso al consulente: speso di tasca propria (carta personale + cash), lordo IVA
  const totalReimb = expenses.reduce((s, e) =>
    ['carta_personale', 'cash'].includes(e.payment_method) ? s + (parseFloat(e.amount) || 0) : s, 0);

  // Header info as top rows (before the table)
  const headerData = [
    ['ISINNOVA', '', '', '', '', '', '', '', '', '', '', 'Period'],
    ['', '', '', '', '', '', '', '', '', '', '', 'From:', fmtDate(mission.date_from)],
    ['Name:', consultantName || '', '', '', '', '', '', '', '', '', '', 'To:', fmtDate(mission.date_to)],
    ['Travelling with:', mission.travelling_with || '', '', '', '', '', '', '', '', '', '', '', ''],
    ['Project:', mission.project_name || '', '', '', '', '', '', '', '', '', '', '', ''],
    ['Destination:', mission.place || '', '', '', '', '', '', '', '', '', '', '', ''],
    [],
  ];

  const ws = XLSX.utils.aoa_to_sheet(headerData);

  // Append expense table rows starting at row 9 (after 7 header rows + 1 blank)
  XLSX.utils.sheet_add_json(ws, rows, { origin: 'A8', skipHeader: false });

  // Add summary below
  const summaryStart = 8 + rows.length + 2;
  const summary = [
    ['', '', '', '', '', '', '', '', '', '', 'Total Expense', fmt(totalAmt)],
    ['', '', '', '', '', '', '', '', '', '', 'Of which Total VAT', fmt(totalIva)],
    ['', '', '', '', '', '', '', '', '', '', 'Total Eligible Costs', fmt(totalElig)],
    ['', '', '', '', '', '', '', '', '', '', 'Reimbursement', fmt(totalReimb)],
  ];
  XLSX.utils.sheet_add_aoa(ws, summary, { origin: { r: summaryStart, c: 0 } });

  const safeName = (mission.place || 'Missione').replace(/[\\/\?\*\[\]:]/g, '').substring(0, 28);
  XLSX.utils.book_append_sheet(wb, ws, safeName || 'Missione');

  const dateStamp = fmtDate(mission.date_from).replace(/\//g, '');
  XLSX.writeFile(wb, `NotaSpese_${safeName}_${dateStamp}.xlsx`);
};

// ── Edit voce dialog ────────────────────────────────────────────────────────
const SUBTYPE_OPTIONS = ['Transportation', 'Lodging', 'Meals', 'Other'];
const PAYMENT_OPTIONS = [
  { value: 'carta_personale', label: 'Carta Personale' },
  { value: 'carta_aziendale', label: 'Carta Aziendale' },
  { value: 'cash', label: 'Cash' },
];

const EditVoceDialog = ({ expense, open, onClose, onSave }) => {
  const parsed = parseSubType(expense?.description);
  const [form, setForm] = useState({
    payment_method: expense?.payment_method || 'carta_personale',
    payment_date: expense?.payment_date || expense?.date || '',
    sub_type: parsed.subType,
    description: parsed.text,
    amount: expense?.amount ?? '',
    iva: expense?.iva ?? '',
    eligible_amount: expense?.eligible_amount ?? '',
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (field, value) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'amount' || field === 'iva') {
        const amt = parseFloat(field === 'amount' ? value : next.amount) || 0;
        const iva = parseFloat(field === 'iva' ? value : next.iva) || 0;
        next.eligible_amount = parseFloat(Math.max(0, amt - iva).toFixed(2));
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(expense.id, {
      payment_method: form.payment_method,
      payment_date: form.payment_date || null,
      amount: parseFloat(form.amount) || 0,
      iva: parseFloat(form.iva) || 0,
      eligible_amount: parseFloat(form.eligible_amount) || 0,
      description: form.description ? `[${form.sub_type}] ${form.description}` : `[${form.sub_type}]`,
    });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifica Voce</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="space-y-1">
            <Label>Metodo Pagamento</Label>
            <Select value={form.payment_method} onValueChange={v => handleChange('payment_method', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Data Transazione</Label>
            <Input type="date" value={form.payment_date} onChange={e => handleChange('payment_date', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Tipo</Label>
            <Select value={form.sub_type} onValueChange={v => handleChange('sub_type', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SUBTYPE_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Importo €</Label>
            <Input type="number" step="0.01" min="0" value={form.amount} onChange={e => handleChange('amount', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>IVA €</Label>
            <Input type="number" step="0.01" min="0" value={form.iva} onChange={e => handleChange('iva', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-purple-700 font-semibold">Eligible €</Label>
            <Input type="number" value={form.eligible_amount} readOnly className="bg-purple-50 text-purple-900 border-purple-200 font-medium" />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Descrizione</Label>
            <Textarea value={form.description} onChange={e => handleChange('description', e.target.value)} rows={2} className="resize-none" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Annulla</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvataggio...</> : 'Salva'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ── Component ───────────────────────────────────────────────────────────────
const MissionList = ({ projectId = null }) => {
  const { user } = useAuth();
  const { getMissionsByConsultant, deleteMission } = useMissions();
  const { getExpensesByConsultant, deleteExpense, updateExpense } = useExpenses();
  const [missionToDelete, setMissionToDelete] = useState(null);
  const [voceToEdit, setVoceToEdit] = useState(null);

  const myMissions = useMemo(() => {
    if (!user) return [];
    const all = getMissionsByConsultant(user.id);
    return projectId ? all.filter(m => m.project_id === projectId) : all;
  }, [user, getMissionsByConsultant, projectId]);

  const myExpenses = useMemo(() => {
    if (!user) return [];
    const all = getExpensesByConsultant(user.id);
    return projectId ? all.filter(e => e.project_id === projectId) : all;
  }, [user, getExpensesByConsultant, projectId]);

  const getExpensesForMission = (missionId) =>
    myExpenses.filter(e => e.mission_id === missionId)
      .sort((a, b) => new Date(a.payment_date || a.date) - new Date(b.payment_date || b.date));

  // Also show expenses without mission_id (legacy entries)
  const legacyExpenses = useMemo(() =>
    myExpenses.filter(e => !e.mission_id),
  [myExpenses]);

  const handleDeleteMission = async (id) => {
    // Expenses keep their data (mission_id becomes NULL via ON DELETE SET NULL)
    await deleteMission(id);
    setMissionToDelete(null);
  };

  if (myMissions.length === 0 && legacyExpenses.length === 0) {
    return (
      <Card className="bg-gray-50 border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center py-10 text-gray-500">
          <FileText className="w-12 h-12 mb-4 opacity-20" />
          <p className="font-medium">Nessuna nota spese registrata</p>
          <p className="text-sm">Usa il modulo per caricare la tua prima nota spese.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {voceToEdit && (
        <EditVoceDialog
          expense={voceToEdit}
          open={!!voceToEdit}
          onClose={() => setVoceToEdit(null)}
          onSave={updateExpense}
        />
      )}
      <Accordion type="multiple" className="space-y-3">
        {myMissions.map(mission => {
          const items = getExpensesForMission(mission.id);
          const totalAmt = items.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
          const totalIva = items.reduce((s, e) => s + (parseFloat(e.iva) || 0), 0);
          const totalElig = items.reduce((s, e) => s + (parseFloat(e.eligible_amount) || 0), 0);
          const dateRange = mission.date_from === mission.date_to
            ? fmtDate(mission.date_from)
            : `${fmtDate(mission.date_from)} – ${fmtDate(mission.date_to)}`;

          return (
            <AccordionItem key={mission.id} value={mission.id} className="border rounded-xl bg-white shadow-sm">
              <AccordionTrigger className="px-5 py-4 hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <MapPin className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-gray-900">{mission.place}</p>
                      <p className="text-xs text-gray-500">{mission.project_name} · {dateRange}</p>
                      {mission.travelling_with && (
                        <p className="text-xs text-gray-400">con {mission.travelling_with}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs flex-wrap justify-end">
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="font-semibold text-gray-900">Totale: € {fmt(totalAmt)}</span>
                      {totalIva > 0 && <span className="text-red-500">IVA: € {fmt(totalIva)}</span>}
                      <span className="font-bold text-green-700">Eligible: € {fmt(totalElig)}</span>
                    </div>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={ev => { ev.stopPropagation(); exportISINNOVA(mission, items, user?.email); }}
                      onKeyDown={ev => { if (ev.key === 'Enter') { ev.stopPropagation(); exportISINNOVA(mission, items, user?.email); } }}
                      className="inline-flex items-center gap-1 text-green-700 hover:text-green-800 hover:bg-green-50 border border-green-200 rounded px-2 py-1 text-[11px] font-medium cursor-pointer"
                      title="Esporta nota spese in Excel"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      XLS
                    </span>
                    <AlertDialog open={missionToDelete === mission.id} onOpenChange={open => !open && setMissionToDelete(null)}>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                          onClick={ev => { ev.stopPropagation(); setMissionToDelete(mission.id); }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Eliminare la nota spese?</AlertDialogTitle>
                          <AlertDialogDescription>
                            La missione verrà eliminata. Le voci di spesa rimarranno nel sistema senza missione associata.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annulla</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteMission(mission.id)} className="bg-red-600 hover:bg-red-700">
                            Elimina
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="px-2 pb-3">
                {items.length === 0 ? (
                  <p className="text-xs text-gray-400 px-4 py-2">Nessuna voce di spesa.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wide text-[10px]">
                          <th className="px-3 py-2 text-left font-medium">Metodo</th>
                          <th className="px-3 py-2 text-left font-medium">Data Trans.</th>
                          <th className="px-3 py-2 text-left font-medium">Tipo</th>
                          <th className="px-3 py-2 text-left font-medium">Descrizione</th>
                          <th className="px-3 py-2 text-right font-medium">Importo €</th>
                          <th className="px-3 py-2 text-right font-medium">IVA €</th>
                          <th className="px-3 py-2 text-right font-medium">Eligible €</th>
                          <th className="px-3 py-2 w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {items.map(e => {
                          const { subType, text } = parseSubType(e.description);
                          const PayIcon = PAYMENT_ICONS[e.payment_method] || CreditCard;
                          return (
                            <tr key={e.id} className="hover:bg-gray-50/50 group">
                              <td className="px-3 py-2">
                                <span className="flex items-center gap-1 text-gray-600">
                                  <PayIcon className="w-3 h-3" />
                                  {PAYMENT_LABELS[e.payment_method] || e.payment_method || '—'}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                                {fmtDate(e.payment_date || e.date)}
                              </td>
                              <td className="px-3 py-2">
                                <Badge variant="outline" className={`text-[10px] font-medium ${SUBTYPE_COLOR[subType] || SUBTYPE_COLOR.Other}`}>
                                  {subType}
                                </Badge>
                              </td>
                              <td className="px-3 py-2 text-gray-900 max-w-[200px] truncate" title={text}>
                                {text || '—'}
                              </td>
                              <td className="px-3 py-2 text-right font-semibold text-gray-900">{fmt(e.amount)}</td>
                              <td className="px-3 py-2 text-right text-red-600">{e.iva ? fmt(e.iva) : '—'}</td>
                              <td className="px-3 py-2 text-right font-semibold text-green-700">{e.eligible_amount ? fmt(e.eligible_amount) : '—'}</td>
                              <td className="px-3 py-1">
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-blue-400 hover:text-blue-600 hover:bg-blue-50"
                                    onClick={() => setVoceToEdit(e)}
                                    title="Modifica voce"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                                    onClick={() => deleteExpense(e.id)}
                                    title="Elimina voce"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-50 border-t-2 border-gray-300 font-bold text-xs">
                          <td colSpan={4} className="px-3 py-2 text-gray-600 uppercase text-[10px]">Totale missione</td>
                          <td className="px-3 py-2 text-right text-gray-900">{fmt(totalAmt)}</td>
                          <td className="px-3 py-2 text-right text-red-600">{fmt(totalIva)}</td>
                          <td className="px-3 py-2 text-right text-green-700">{fmt(totalElig)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Legacy expenses (no mission_id) */}
      {legacyExpenses.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-gray-400 mb-2 px-1">Spese precedenti (senza missione associata)</p>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wide text-[10px]">
                  <th className="px-3 py-2 text-left font-medium">Data</th>
                  <th className="px-3 py-2 text-left font-medium">Luogo</th>
                  <th className="px-3 py-2 text-left font-medium">Descrizione</th>
                  <th className="px-3 py-2 text-right font-medium">Importo €</th>
                  <th className="px-3 py-2 text-right font-medium">IVA €</th>
                  <th className="px-3 py-2 text-right font-medium">Eligible €</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {legacyExpenses.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50/50">
                    <td className="px-3 py-2 text-gray-600">{fmtDate(e.date)}</td>
                    <td className="px-3 py-2 text-gray-600">{e.place || '—'}</td>
                    <td className="px-3 py-2 text-gray-900 max-w-[200px] truncate">{e.description || '—'}</td>
                    <td className="px-3 py-2 text-right font-semibold">{fmt(e.amount)}</td>
                    <td className="px-3 py-2 text-right text-red-600">{e.iva ? fmt(e.iva) : '—'}</td>
                    <td className="px-3 py-2 text-right text-green-700">{e.eligible_amount ? fmt(e.eligible_amount) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MissionList;
