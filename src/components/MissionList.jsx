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
import { Trash2, MapPin, FileSpreadsheet, FileText, CreditCard, Wallet, Banknote, Pencil, Loader2, Paperclip, Send, CheckCircle2, X, Upload } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
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

// ── Allegati download ───────────────────────────────────────────────────────
const openAttachment = async (path) => {
  const { data, error } = await supabase.storage.from('scontrini').createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return;
  window.open(data.signedUrl, '_blank');
};

const fileLabel = (path) => path.split('/').pop();

// ── Export ISINNOVA template ────────────────────────────────────────────────
const DARK_BLUE = '1F3864';
const MID_BLUE  = '2E5FA3';
const LIGHT_BG  = 'DCE6F1';
const ALT_ROW   = 'F2F7FC';

const cs = (fill, fontColor = 'FFFFFF', bold = false, sz = 10, halign = 'center') => ({
  fill: fill ? { patternType: 'solid', fgColor: { rgb: fill } } : undefined,
  font: { bold, color: { rgb: fontColor }, sz },
  alignment: { horizontal: halign, vertical: 'center', wrapText: true },
  border: {
    top:    { style: 'thin', color: { rgb: 'BFBFBF' } },
    bottom: { style: 'thin', color: { rgb: 'BFBFBF' } },
    left:   { style: 'thin', color: { rgb: 'BFBFBF' } },
    right:  { style: 'thin', color: { rgb: 'BFBFBF' } },
  },
});

const setCell = (ws, ref, value, style) => {
  if (!ws[ref]) ws[ref] = {};
  ws[ref].v = value;
  ws[ref].t = typeof value === 'number' ? 'n' : 's';
  if (style) ws[ref].s = style;
};

const exportISINNOVA = (mission, expenses, consultantName) => {
  const wb = XLSX.utils.book_new();
  const ws = {};

  const totalAmt  = expenses.reduce((s, e) => s + (parseFloat(e.amount)          || 0), 0);
  const totalIva  = expenses.reduce((s, e) => s + (parseFloat(e.iva)              || 0), 0);
  const totalElig = expenses.reduce((s, e) => s + (parseFloat(e.eligible_amount)  || 0), 0);

  const safeName  = (mission.place || 'Missione').replace(/[\\/\?\*\[\]:]/g, '').substring(0, 28);
  const dateStamp = fmtDate(mission.date_from).replace(/\//g, '');

  // ── Riga 1: titolo ────────────────────────────────────────────────────────
  const titleStyle = { fill: undefined, font: { bold: true, color: { rgb: DARK_BLUE }, sz: 16 }, alignment: { horizontal: 'center', vertical: 'center' } };
  setCell(ws, 'A1', 'Travel Expense Report', titleStyle);

  // ── Righe 2-6: intestazione ───────────────────────────────────────────────
  const labelStyle = { font: { bold: true, color: { rgb: '333333' }, sz: 10 }, alignment: { horizontal: 'right', vertical: 'center' } };
  const valueStyle = { font: { bold: false, color: { rgb: '000000' }, sz: 10 }, alignment: { horizontal: 'left', vertical: 'center' }, border: { bottom: { style: 'thin', color: { rgb: '333333' } } } };
  const periodHeaderStyle = cs(DARK_BLUE, 'FFFFFF', true, 10, 'center');
  const periodLabelStyle  = { font: { bold: true, color: { rgb: '333333' }, sz: 10 }, alignment: { horizontal: 'right', vertical: 'center' }, fill: { patternType: 'solid', fgColor: { rgb: LIGHT_BG } } };
  const periodValueStyle  = { font: { bold: false, color: { rgb: '000000' }, sz: 10 }, alignment: { horizontal: 'left', vertical: 'center' }, fill: { patternType: 'solid', fgColor: { rgb: LIGHT_BG } } };

  setCell(ws, 'A3', 'Name:',           labelStyle);
  setCell(ws, 'B3', consultantName || '', valueStyle);
  setCell(ws, 'A4', 'Travelling with:', labelStyle);
  setCell(ws, 'B4', mission.travelling_with || '', valueStyle);
  setCell(ws, 'A5', 'Project:',        labelStyle);
  setCell(ws, 'B5', mission.project_name || '', valueStyle);
  setCell(ws, 'A6', 'Destination:',    labelStyle);
  setCell(ws, 'B6', mission.place || '', valueStyle);

  setCell(ws, 'J2', 'Period',  periodHeaderStyle);
  setCell(ws, 'J3', 'From:',   periodLabelStyle);
  setCell(ws, 'K3', fmtDate(mission.date_from), periodValueStyle);
  setCell(ws, 'J4', 'To:',     periodLabelStyle);
  setCell(ws, 'K4', fmtDate(mission.date_to),   periodValueStyle);

  // ── Riga 8: intestazioni tabella ──────────────────────────────────────────
  const headers = ['Payment Method','Date of Transaction','Notes/Description','Currency','Transportation','Lodging','Meals','Other','VAT','Rec','TOTAL EURO','VAT'];
  const cols = ['A','B','C','D','E','F','G','H','I','J','K','L'];
  headers.forEach((h, i) => setCell(ws, `${cols[i]}8`, h, cs(DARK_BLUE, 'FFFFFF', true, 9, 'center')));

  // ── Righe dati ────────────────────────────────────────────────────────────
  const dataStart = 9;
  const minRows = Math.max(expenses.length, 13);

  for (let r = 0; r < minRows; r++) {
    const e = expenses[r];
    const rowNum = dataStart + r;
    const rowBg = r % 2 === 0 ? 'FFFFFF' : ALT_ROW;
    const dataCellStyle = (halign = 'left') => cs(rowBg, '000000', false, 10, halign);
    const numCellStyle  = cs(rowBg, '000000', false, 10, 'right');

    if (e) {
      const { subType, text } = parseSubType(e.description);
      const amt = parseFloat(e.amount) || 0;
      const iva = parseFloat(e.iva) || 0;
      setCell(ws, `A${rowNum}`, PAYMENT_LABELS[e.payment_method] || e.payment_method || '', dataCellStyle());
      setCell(ws, `B${rowNum}`, fmtDate(e.payment_date || e.date), dataCellStyle('center'));
      setCell(ws, `C${rowNum}`, text || e.description || '', dataCellStyle());
      setCell(ws, `D${rowNum}`, 'EURO', dataCellStyle('center'));
      if (subType === 'Transportation') { const c = ws[`E${rowNum}`] = { v: amt, t: 'n', z: '€ #,##0.00', s: numCellStyle }; }
      else setCell(ws, `E${rowNum}`, '', dataCellStyle());
      if (subType === 'Lodging')        { ws[`F${rowNum}`] = { v: amt, t: 'n', z: '€ #,##0.00', s: numCellStyle }; }
      else setCell(ws, `F${rowNum}`, '', dataCellStyle());
      if (subType === 'Meals')          { ws[`G${rowNum}`] = { v: amt, t: 'n', z: '€ #,##0.00', s: numCellStyle }; }
      else setCell(ws, `G${rowNum}`, '', dataCellStyle());
      if (subType === 'Other')          { ws[`H${rowNum}`] = { v: amt, t: 'n', z: '€ #,##0.00', s: numCellStyle }; }
      else setCell(ws, `H${rowNum}`, '', dataCellStyle());
      ws[`I${rowNum}`] = { v: iva || 0, t: 'n', z: '0.00', s: numCellStyle };
      setCell(ws, `J${rowNum}`, '', dataCellStyle());
      ws[`K${rowNum}`] = { v: amt, t: 'n', z: '"€ "#,##0.00', s: numCellStyle };
      ws[`L${rowNum}`] = { v: iva || 0, t: 'n', z: '0.00', s: numCellStyle };
    } else {
      cols.forEach(c => {
        ws[`${c}${rowNum}`] = { v: c === 'D' ? 'EURO' : '', t: 's', s: dataCellStyle(c === 'D' ? 'center' : 'left') };
      });
    }
  }

  // ── Totali ────────────────────────────────────────────────────────────────
  const sumRow = dataStart + minRows + 1;
  const totLabelStyle = cs(LIGHT_BG, '000000', true, 10, 'right');
  const totValueStyle = { fill: { patternType: 'solid', fgColor: { rgb: LIGHT_BG } }, font: { bold: true, color: { rgb: '000000' }, sz: 10 }, alignment: { horizontal: 'right' }, border: { top: { style: 'thin', color: { rgb: DARK_BLUE } }, bottom: { style: 'thin', color: { rgb: DARK_BLUE } }, left: { style: 'thin', color: { rgb: DARK_BLUE } }, right: { style: 'thin', color: { rgb: DARK_BLUE } } } };
  const totEligStyle  = { fill: { patternType: 'solid', fgColor: { rgb: DARK_BLUE } }, font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 }, alignment: { horizontal: 'right' }, border: { top: { style: 'medium', color: { rgb: DARK_BLUE } }, bottom: { style: 'medium', color: { rgb: DARK_BLUE } }, left: { style: 'medium', color: { rgb: DARK_BLUE } }, right: { style: 'medium', color: { rgb: DARK_BLUE } } } };

  setCell(ws, `J${sumRow}`,   'Total Expense',       totLabelStyle);
  ws[`K${sumRow}`] = { v: totalAmt,  t: 'n', z: '"€ "#,##0.00', s: totValueStyle };
  setCell(ws, `J${sumRow+1}`, 'Of which Total VAT',  totLabelStyle);
  ws[`K${sumRow+1}`] = { v: totalIva,  t: 'n', z: '"€ "#,##0.00', s: totValueStyle };
  setCell(ws, `J${sumRow+2}`, 'Total Eligible Costs', totLabelStyle);
  ws[`K${sumRow+2}`] = { v: totalElig, t: 'n', z: '"€ "#,##0.00', s: totEligStyle };

  // ── Merge cells ───────────────────────────────────────────────────────────
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },   // titolo A1:L1
    { s: { r: 1, c: 9 }, e: { r: 1, c: 11 } },   // Period J2:L2
    { s: { r: 2, c: 1 }, e: { r: 2, c: 8 } },    // nome valore
    { s: { r: 3, c: 1 }, e: { r: 3, c: 8 } },
    { s: { r: 4, c: 1 }, e: { r: 4, c: 8 } },
    { s: { r: 5, c: 1 }, e: { r: 5, c: 8 } },
  ];

  // ── Larghezze colonne ─────────────────────────────────────────────────────
  ws['!cols'] = [
    { wch: 16 }, { wch: 13 }, { wch: 28 }, { wch: 8 },
    { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    { wch: 8  }, { wch: 18 }, { wch: 13 }, { wch: 8 },
  ];

  // ── Altezze righe ─────────────────────────────────────────────────────────
  ws['!rows'] = [{ hpt: 28 }]; // titolo più alto

  // ── Ref range ────────────────────────────────────────────────────────────
  ws['!ref'] = `A1:L${sumRow + 2}`;

  XLSX.utils.book_append_sheet(wb, ws, safeName || 'Missione');
  XLSX.writeFile(wb, `NotaSpese_${safeName}_${dateStamp}.xlsx`);
};

// ── Edit voce dialog ────────────────────────────────────────────────────────
const SUBTYPE_OPTIONS = ['Transportation', 'Lodging', 'Meals', 'Other'];
const PAYMENT_OPTIONS = [
  { value: 'carta_aziendale', label: 'Carta Aziendale' },
  { value: 'carta_personale', label: 'Carta Personale' },
  { value: 'cash', label: 'Cash' },
];

const EditVoceDialog = ({ expense, open, onClose, onSave }) => {
  const parsed = parseSubType(expense?.description);
  const [form, setForm] = useState({
    payment_method: expense?.payment_method || 'carta_aziendale',
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
  const { getMissionsByConsultant, deleteMission, updateMission } = useMissions();
  const { getExpensesByConsultant, deleteExpense, updateExpense } = useExpenses();
  const { toast } = useToast();
  const [missionToDelete, setMissionToDelete] = useState(null);
  const [voceToEdit, setVoceToEdit] = useState(null);
  const [uploadingMission, setUploadingMission] = useState(null);
  const [sendingMission, setSendingMission] = useState(null);
  // stagedFiles: { [missionId]: File[] } — file in attesa di upload
  const [stagedFiles, setStagedFiles] = useState({});

  const addStagedFiles = (missionId, fileList) => {
    if (!fileList?.length) return;
    setStagedFiles(prev => {
      const existing = prev[missionId] || [];
      const existingNames = new Set(existing.map(f => f.name));
      const newFiles = Array.from(fileList).filter(f => !existingNames.has(f.name));
      return { ...prev, [missionId]: [...existing, ...newFiles] };
    });
  };

  const removeStagedFile = (missionId, fileName) => {
    setStagedFiles(prev => ({
      ...prev,
      [missionId]: (prev[missionId] || []).filter(f => f.name !== fileName),
    }));
  };

  const handleSendToSecretary = async (mission) => {
    setSendingMission(mission.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/notify-expense`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ mission_id: mission.id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(`Errore invio (${res.status}): ${body?.error || JSON.stringify(body)}`);
      } else {
        await updateMission(mission.id, { submitted: true, submitted_at: new Date().toISOString() });
      }
    } catch (e) {
      alert(`Errore: ${e.message}`);
    }
    setSendingMission(null);
  };

  const handleUploadStaged = async (mission) => {
    const files = stagedFiles[mission.id];
    if (!files?.length) return;
    setUploadingMission(mission.id);

    const { data: { session } } = await supabase.auth.getSession();
    const authUid = session?.user?.id;
    if (!authUid) {
      toast({ title: 'Sessione scaduta', description: 'Rieffettua il login.', variant: 'destructive' });
      setUploadingMission(null);
      return;
    }

    const newPaths = [];
    for (const file of files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${authUid}/${mission.id}/${safeName}`;
      const { error } = await supabase.storage.from('scontrini').upload(path, file, { upsert: true });
      if (error) {
        toast({ title: `Upload fallito: ${file.name}`, description: error.message, variant: 'destructive' });
      } else {
        newPaths.push(path);
      }
    }
    if (newPaths.length > 0) {
      const existing = mission.receipt_paths || [];
      const merged = [...new Set([...existing, ...newPaths])];
      await updateMission(mission.id, { receipt_paths: merged });
      setStagedFiles(prev => { const n = { ...prev }; delete n[mission.id]; return n; });
      toast({ title: `${newPaths.length} allegato/i caricati`, description: 'Ora puoi premere Invia.' });
    }
    setUploadingMission(null);
  };

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
                    {mission.submitted ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-green-700 border border-green-200 bg-green-50 rounded px-2 py-1 text-[11px] font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Inviata
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 text-[11px] text-gray-500 hover:text-indigo-700 hover:bg-indigo-50 border border-gray-200 px-2"
                          disabled={sendingMission === mission.id}
                          onClick={ev => { ev.stopPropagation(); handleSendToSecretary(mission); }}
                          title="Rinvia nota spese a segreteria"
                        >
                          {sendingMission === mission.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Send className="w-3.5 h-3.5" />}
                          Rinvia
                        </Button>
                      </span>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 text-[11px] text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50 border border-indigo-200 px-2"
                        disabled={sendingMission === mission.id}
                        onClick={ev => { ev.stopPropagation(); handleSendToSecretary(mission); }}
                        title="Invia nota spese a segreteria"
                      >
                        {sendingMission === mission.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Send className="w-3.5 h-3.5" />}
                        Invia
                      </Button>
                    )}
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
                <div className="mt-3 px-2 space-y-2">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400 flex items-center gap-1">
                    <Paperclip className="w-3 h-3" /> Allegati
                  </p>

                  {/* File già caricati */}
                  {(mission.receipt_paths || []).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {(mission.receipt_paths || []).map((path, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => openAttachment(path)}
                          className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-1 hover:bg-blue-100 transition-colors"
                        >
                          <FileText className="w-3 h-3" />
                          {fileLabel(path)}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* File in staging (non ancora caricati) */}
                  {(stagedFiles[mission.id] || []).length > 0 && (
                    <div className="border border-dashed border-purple-300 rounded-lg p-2 bg-purple-50/40 space-y-1">
                      <p className="text-[10px] text-purple-500 font-medium">Pronti per il caricamento:</p>
                      {(stagedFiles[mission.id] || []).map((file, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-gray-700">
                          <FileText className="w-3 h-3 text-gray-400 shrink-0" />
                          <span className="truncate flex-1">{file.name}</span>
                          <span className="text-gray-400 shrink-0">{(file.size / 1024).toFixed(0)} KB</span>
                          <button
                            type="button"
                            onClick={() => removeStagedFile(mission.id, file.name)}
                            className="text-red-400 hover:text-red-600 shrink-0"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Azioni */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="flex items-center gap-1 text-xs text-gray-500 border border-dashed border-gray-300 rounded px-2 py-1 hover:border-purple-400 hover:text-purple-600 cursor-pointer transition-colors">
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        className="hidden"
                        onChange={e => addStagedFiles(mission.id, e.target.files)}
                      />
                      <Paperclip className="w-3 h-3" />
                      {(stagedFiles[mission.id] || []).length > 0 ? 'Aggiungi altri' : 'Seleziona file'}
                    </label>
                    {(stagedFiles[mission.id] || []).length > 0 && (
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 gap-1 text-[11px] bg-purple-600 hover:bg-purple-700 text-white px-3"
                        disabled={uploadingMission === mission.id}
                        onClick={() => handleUploadStaged(mission)}
                      >
                        {uploadingMission === mission.id
                          ? <><Loader2 className="w-3 h-3 animate-spin" /> Caricamento...</>
                          : <><Upload className="w-3 h-3" /> Carica {stagedFiles[mission.id]?.length} file</>
                        }
                      </Button>
                    )}
                  </div>
                </div>
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
