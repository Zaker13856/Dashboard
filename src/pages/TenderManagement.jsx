import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, ChevronRight, Gavel, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { fetchAllRows } from '@/lib/fetchAllRows';
import { fetchConsultantNames } from '@/lib/consultantNames';
import { TENDER_TYPES } from '@/lib/tenders';

const MONTHS_IT = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const STATUS_LABEL  = { active: 'Attivo', archived: 'Archiviato' };
const STATUS_COLORS = { active: 'bg-green-100 text-green-700', archived: 'bg-red-100 text-red-700' };

const EMPTY_FORM = {
  name: '', type: 'OTHER', status: 'active', client: '',
  start_date: '', end_date: '', total_value: '',
  sold_travel: '', sold_other_costs: '', sold_subcontracting: '',
};

const fmt  = n => new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
const fmtD = d => { if (!d) return '—'; const [y, m, g] = d.split('-'); return `${g}/${m}/${y}`; };
const num  = v => (v === '' || v == null ? null : parseFloat(v));
const monthKey = d => d.slice(0, 7); // 'YYYY-MM'

const computeDurationMonths = (start, end) => {
  if (!start || !end) return null;
  const s = new Date(start), e = new Date(end);
  return Math.round((e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()));
};

// Mesi da mostrare: da inizio a fine Tender (se ci sono le date) più tutti i mesi che hanno ore
const buildMonths = (tender, hourMonths) => {
  const set = new Set(hourMonths);
  if (tender.start_date && tender.end_date && tender.start_date <= tender.end_date) {
    let [y, m] = tender.start_date.slice(0, 7).split('-').map(Number);
    const [ey, em] = tender.end_date.slice(0, 7).split('-').map(Number);
    let guard = 0;
    while ((y < ey || (y === ey && m <= em)) && guard++ < 240) {
      set.add(`${y}-${String(m).padStart(2, '0')}`);
      m++; if (m > 12) { m = 1; y++; }
    }
  }
  return [...set].sort();
};

// ─── Form Tender ──────────────────────────────────────────────
const TenderFormDialog = ({ open, onOpenChange, initial, onSave, title, triggerEl }) => {
  const { toast } = useToast();
  const [form, setForm] = useState(initial || EMPTY_FORM);
  useEffect(() => { setForm(initial || EMPTY_FORM); }, [initial, open]);
  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Errore', description: 'Il nome è obbligatorio', variant: 'destructive' });
      return;
    }
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      toast({ title: 'Errore', description: 'La data di fine è prima della data di inizio', variant: 'destructive' });
      return;
    }
    await onSave({
      name:                form.name.trim(),
      type:                form.type || null,
      status:              form.status,
      client:              form.client.trim() || null,
      start_date:          form.start_date || null,
      end_date:            form.end_date || null,
      total_value:         num(form.total_value),
      sold_travel:         num(form.sold_travel),
      sold_other_costs:    num(form.sold_other_costs),
      sold_subcontracting: num(form.sold_subcontracting),
    });
  };

  const money = (k, label, ph) => (
    <div className="space-y-1.5">
      <Label className="text-gray-700 font-medium">{label}</Label>
      <Input type="number" step="0.01" value={form[k]} onChange={e => f(k, e.target.value)} className="text-gray-900 bg-white" placeholder={ph} />
    </div>
  );

  const content = (
    <DialogContent className="sm:max-w-[520px] max-h-[90vh] flex flex-col overflow-hidden">
      <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
      <div className="grid gap-3 py-3 overflow-y-auto flex-1 pr-1">
        <div className="space-y-1.5">
          <Label className="text-gray-700 font-medium">Nome *</Label>
          <Input value={form.name} onChange={e => f('name', e.target.value)} className="text-gray-900 bg-white" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-gray-700 font-medium">Tipo</Label>
            <Select value={form.type || 'OTHER'} onValueChange={v => f('type', v)}>
              <SelectTrigger className="bg-white text-gray-900"><SelectValue /></SelectTrigger>
              <SelectContent>{TENDER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-gray-700 font-medium">Stato</Label>
            <Select value={form.status} onValueChange={v => f('status', v)}>
              <SelectTrigger className="bg-white text-gray-900"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Attivo</SelectItem>
                <SelectItem value="archived">Archiviato</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-gray-700 font-medium">Cliente</Label>
          <Input value={form.client} onChange={e => f('client', e.target.value)} className="text-gray-900 bg-white" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-gray-700 font-medium">Data Inizio</Label>
            <Input type="date" value={form.start_date} onChange={e => f('start_date', e.target.value)} className="text-gray-900 bg-white" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-gray-700 font-medium">Data Fine</Label>
            <Input type="date" value={form.end_date} onChange={e => f('end_date', e.target.value)} className="text-gray-900 bg-white" />
          </div>
        </div>
        {money('total_value', 'Valore Venduto €', 'es. 50000')}
        <div className="grid grid-cols-3 gap-3">
          {money('sold_travel', 'Viaggi €', 'es. 3000')}
          {money('sold_other_costs', 'Altre spese €', 'es. 2000')}
          {money('sold_subcontracting', 'Subappalti €', 'es. 5000')}
        </div>
        {form.start_date && form.end_date && (
          <p className="text-xs text-gray-400">Durata calcolata: {computeDurationMonths(form.start_date, form.end_date)} mesi</p>
        )}
        {form.status === 'archived' && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded p-2">
            Archiviato: il Tender va nella pagina Repository e sparisce dall'elenco dei consulenti. Ore e spese restano.
          </p>
        )}
      </div>
      <div className="pt-3 border-t border-gray-100">
        <Button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-700 text-white">{title}</Button>
      </div>
    </DialogContent>
  );

  if (triggerEl) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>{triggerEl}</DialogTrigger>
        {content}
      </Dialog>
    );
  }
  return <Dialog open={open} onOpenChange={onOpenChange}>{content}</Dialog>;
};

// ─── Dettaglio Tender ─────────────────────────────────────────
export const TenderDetail = ({ tender, onUpdated, onDeleted, readOnly = false }) => {
  const { toast } = useToast();
  const [loading, setLoading]   = useState(true);
  const [hours, setHours]       = useState([]);   // righe timesheet
  const [names, setNames]       = useState({});
  const [actuals, setActuals]   = useState({ travel: 0, other_cost: 0, subcontract: 0, third_parties: 0, count: 0 });
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: ts }, { data: ex }, nm] = await Promise.all([
      fetchAllRows(() => supabase.from('timesheets').select('id, consultant_id, date, hours').eq('tender_id', tender.id).order('id')),
      fetchAllRows(() => supabase.from('expenses').select('id, type, amount, eligible_amount, iva').eq('tender_id', tender.id).order('id')),
      fetchConsultantNames(),
    ]);
    setHours(ts || []);
    setNames(nm);
    const a = { travel: 0, other_cost: 0, subcontract: 0, third_parties: 0, count: (ex || []).length };
    (ex || []).forEach(e => {
      const val  = parseFloat(e.eligible_amount);
      const elig = !isNaN(val) ? val : (parseFloat(e.amount) || 0) - (parseFloat(e.iva) || 0);
      if (a[e.type] !== undefined) a[e.type] += elig;
    });
    setActuals(a);
    setLoading(false);
  }, [tender.id]);

  useEffect(() => { load(); }, [load]);

  // Ricarica quando cambiano le spese (pagina spese) o i timesheet
  useEffect(() => {
    const handler = () => load();
    window.addEventListener('expenses:updated', handler);
    const channel = supabase.channel(`tender-hours-${tender.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'timesheets', filter: `tender_id=eq.${tender.id}` }, handler)
      .subscribe();
    return () => { window.removeEventListener('expenses:updated', handler); supabase.removeChannel(channel); };
  }, [tender.id, load]);

  // Tabella mesi × consulenti
  const byMonth = {};
  const cTot = {};
  hours.forEach(r => {
    const k = monthKey(r.date);
    const h = parseFloat(r.hours) || 0;
    byMonth[k] = byMonth[k] || {};
    byMonth[k][r.consultant_id] = (byMonth[k][r.consultant_id] || 0) + h;
    cTot[r.consultant_id] = (cTot[r.consultant_id] || 0) + h;
  });
  const consultantIds = Object.keys(cTot).sort((a, b) => (names[a] || '').localeCompare(names[b] || ''));
  const months = buildMonths(tender, Object.keys(byMonth));
  const totalHours = Object.values(cTot).reduce((s, v) => s + v, 0);

  const handleEditSave = async (payload) => {
    const { error } = await supabase.from('tenders').update(payload).eq('id', tender.id);
    if (error) { toast({ title: 'Errore', description: error.message, variant: 'destructive' }); return; }
    // Nome cambiato: anche le ore lo prendono (l'Excel del timesheet raggruppa per nome)
    if (payload.name !== tender.name) {
      await supabase.from('timesheets').update({ activity_note: payload.name }).eq('tender_id', tender.id);
    }
    toast({ title: payload.status === 'archived' ? 'Tender archiviato (ora è nel Repository)' : 'Tender aggiornato' });
    setEditOpen(false);
    onUpdated?.();
  };

  const canDelete = hours.length === 0 && actuals.count === 0;
  const handleDelete = async () => {
    const { count: actCount } = await supabase.from('consultant_activities').select('id', { count: 'exact', head: true }).eq('tender_id', tender.id);
    const { count: misCount } = await supabase.from('missions').select('id', { count: 'exact', head: true }).eq('tender_id', tender.id);
    if (!canDelete || actCount || misCount) {
      toast({ title: 'Non si può eliminare', description: 'Il Tender ha ore, note spese o righe nei timesheet: mettilo in Archiviato.', variant: 'destructive' });
      setDeleteOpen(false);
      return;
    }
    const { error } = await supabase.from('tenders').delete().eq('id', tender.id);
    if (error) { toast({ title: 'Errore', description: error.message, variant: 'destructive' }); return; }
    toast({ title: `Tender "${tender.name}" eliminato` });
    setDeleteOpen(false);
    onDeleted?.();
  };

  const initialForm = {
    name: tender.name || '', type: tender.type || 'OTHER', status: tender.status || 'active', client: tender.client || '',
    start_date: tender.start_date || '', end_date: tender.end_date || '',
    total_value:         tender.total_value         != null ? String(tender.total_value)         : '',
    sold_travel:         tender.sold_travel         != null ? String(tender.sold_travel)         : '',
    sold_other_costs:    tender.sold_other_costs    != null ? String(tender.sold_other_costs)    : '',
    sold_subcontracting: tender.sold_subcontracting != null ? String(tender.sold_subcontracting) : '',
  };

  const dur = computeDurationMonths(tender.start_date, tender.end_date);
  const costRows = [
    { label: 'Viaggi €',       sold: tender.sold_travel,         actual: actuals.travel },
    { label: 'Altre spese €',  sold: tender.sold_other_costs,    actual: actuals.other_cost },
    { label: 'Subappalti €',   sold: tender.sold_subcontracting, actual: actuals.subcontract },
  ];

  if (loading) return <div className="text-center py-20 text-gray-400 text-sm">Caricamento dati Tender...</div>;

  return (
    <div className="space-y-6">
      {/* Testata */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
            <h2 className="text-2xl font-bold text-gray-900">{tender.name}</h2>
            <div className="flex items-center gap-2">
              <span className={cn('text-xs px-2 py-1 rounded-full font-medium', STATUS_COLORS[tender.status] || STATUS_COLORS.active)}>
                {STATUS_LABEL[tender.status] || tender.status}
              </span>
              {!readOnly && (
                <>
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-gray-600 border-gray-200 hover:bg-gray-50" onClick={() => setEditOpen(true)}>
                    <Pencil className="w-3 h-3 mr-1" />Modifica
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={() => setDeleteOpen(true)}>
                    <Trash2 className="w-3 h-3 mr-1" />Elimina
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 text-sm">
            {[
              ['Tipo',           tender.type || '—'],
              ['Cliente',        tender.client || '—'],
              ['Inizio',         fmtD(tender.start_date)],
              ['Fine',           fmtD(tender.end_date)],
              ['Durata',         dur != null ? `${dur} mesi` : '—'],
              ['Valore Venduto', tender.total_value != null ? `€ ${fmt(tender.total_value)}` : '—'],
              ['Ore vere',       fmt(totalHours)],
              ['Giorni (ore/8)', fmt(totalHours / 8)],
            ].map(([label, val]) => (
              <div key={label}>
                <p className="text-gray-400 text-xs mb-0.5">{label}</p>
                <p className="font-semibold text-gray-900">{val}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {!readOnly && (
        <TenderFormDialog open={editOpen} onOpenChange={setEditOpen} initial={initialForm} onSave={handleEditSave} title="Modifica Tender" />
      )}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader><DialogTitle>Eliminare il Tender?</DialogTitle></DialogHeader>
          {canDelete ? (
            <p className="text-sm text-gray-600 py-2">Stai per eliminare <strong>{tender.name}</strong>. Non ha ore né spese collegate.</p>
          ) : (
            <p className="text-sm text-gray-600 py-2">
              <strong>{tender.name}</strong> ha ore o spese collegate e non si può eliminare.
              Per toglierlo dalle liste usa <strong>Modifica → Stato: Archiviato</strong>.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>{canDelete ? 'Annulla' : 'Chiudi'}</Button>
            {canDelete && <Button variant="destructive" onClick={handleDelete}>Elimina</Button>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Venduto vs Speso */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">Venduto vs Speso</p>
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2 text-left text-gray-500 font-medium">Voce</th>
                  <th className="px-3 py-2 text-right text-gray-500 font-medium">Venduto €</th>
                  <th className="px-3 py-2 text-right text-gray-500 font-medium">Speso €</th>
                  <th className="px-3 py-2 text-right text-gray-500 font-medium">Residuo €</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {costRows.map(({ label, sold, actual }) => {
                  const s = parseFloat(sold) || 0;
                  const a = actual || 0;
                  const over = s > 0 && a > s;
                  return (
                    <tr key={label}>
                      <td className="px-3 py-2 text-gray-600">{label}</td>
                      <td className="px-3 py-2 text-right text-gray-700">{s > 0 ? fmt(s) : '—'}</td>
                      <td className={cn('px-3 py-2 text-right font-semibold', a > 0 ? (over ? 'text-red-600' : 'text-blue-600') : 'text-gray-400')}>
                        {a > 0 ? fmt(a) : '—'}
                      </td>
                      <td className={cn('px-3 py-2 text-right font-semibold', s > 0 ? (over ? 'text-red-600' : 'text-green-600') : 'text-gray-400')}>
                        {s > 0 ? `${s - a > 0 ? '+' : ''}${fmt(s - a)}` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">Speso = importi senza IVA delle spese e note spese collegate a questo Tender.</p>
        </CardContent>
      </Card>

      {/* Ore vere dai timesheet */}
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Ore vere dai timesheet dei consulenti</p>
        {months.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
            Nessuna ora registrata. Le ore compaiono qui quando i consulenti le scrivono nel loro timesheet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="text-xs min-w-max w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-300">
                  <th className="sticky left-0 bg-gray-50 text-left px-3 py-2 font-semibold text-gray-700 border-r border-gray-200 min-w-[130px]">Mese</th>
                  {consultantIds.map(id => (
                    <th key={id} title={names[id] || ''} className="text-center px-2 py-2 font-semibold text-blue-700 bg-blue-50 border-r border-blue-200 min-w-[80px]">
                      {(names[id] || '—').split(' ')[0]}
                    </th>
                  ))}
                  <th className="text-center px-2 py-2 font-semibold text-gray-700 border-r border-gray-200 min-w-[80px]">Tot ore</th>
                  <th className="text-center px-2 py-2 font-semibold text-gray-600 min-w-[80px]">Giorni</th>
                </tr>
              </thead>
              <tbody>
                {months.map((k, idx) => {
                  const row = byMonth[k] || {};
                  const tot = Object.values(row).reduce((s, v) => s + v, 0);
                  const [y, m] = k.split('-');
                  return (
                    <tr key={k} className={cn('border-b border-gray-100', idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40')}>
                      <td className="sticky left-0 bg-inherit px-3 py-1.5 font-medium text-gray-700 border-r border-gray-200">{MONTHS_IT[parseInt(m, 10) - 1]} {y}</td>
                      {consultantIds.map(id => (
                        <td key={id} className="text-center px-2 py-1.5 border-r border-blue-100 text-gray-700">
                          {row[id] ? fmt(row[id]) : <span className="text-gray-300">—</span>}
                        </td>
                      ))}
                      <td className="text-center px-2 py-1.5 font-medium text-gray-800 border-r border-gray-200">{tot ? fmt(tot) : <span className="text-gray-300">—</span>}</td>
                      <td className="text-center px-2 py-1.5 text-gray-600">{tot ? fmt(tot / 8) : <span className="text-gray-300">—</span>}</td>
                    </tr>
                  );
                })}
                <tr className="bg-gray-100 border-t-2 border-gray-400 font-bold text-[11px]">
                  <td className="sticky left-0 bg-gray-100 px-3 py-2 text-gray-900 border-r border-gray-300 uppercase tracking-wide">Totale</td>
                  {consultantIds.map(id => (
                    <td key={id} className="text-center px-2 py-2 text-blue-800 border-r border-blue-200">{fmt(cTot[id])}</td>
                  ))}
                  <td className="text-center px-2 py-2 text-gray-900 border-r border-gray-300">{fmt(totalHours)}</td>
                  <td className="text-center px-2 py-2 text-gray-800">{fmt(totalHours / 8)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[11px] text-gray-400">Le ore le scrivono i consulenti nel loro timesheet (sezione Attività): qui si possono solo leggere.</p>
      </div>
    </div>
  );
};

// ─── Pagina ───────────────────────────────────────────────────
const TenderManagement = () => {
  const { toast } = useToast();
  const [tenders, setTenders]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [search, setSearch]     = useState('');
  const [isOpen, setOpen]       = useState(false);

  const fetchTenders = async () => {
    setLoading(true);
    const { data } = await supabase.from('tenders').select('*').order('name');
    // Gli archiviati vivono nella pagina Repository
    const list = (data || []).filter(t => t.status !== 'archived');
    setTenders(list);
    setSelected(prev => prev ? (list.find(t => t.id === prev.id) || list[0] || null) : (list[0] || null));
    setLoading(false);
  };

  useEffect(() => { fetchTenders(); }, []);

  const handleCreate = async (payload) => {
    const { error } = await supabase.from('tenders').insert(payload);
    if (error) { toast({ title: 'Errore', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Tender creato' });
    setOpen(false);
    fetchTenders();
  };

  const filtered = tenders.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <AdminLayout>
      <div className="space-y-6 pb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Tender</h1>
            <p className="text-gray-500 mt-1">Valori di riferimento e ore vere dei consulenti</p>
          </div>
          <TenderFormDialog
            open={isOpen}
            onOpenChange={setOpen}
            initial={EMPTY_FORM}
            onSave={handleCreate}
            title="Crea Nuovo Tender"
            triggerEl={
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2" />Nuovo Tender
              </Button>
            }
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-1 space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input placeholder="Cerca..." className="pl-8 text-gray-900" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {loading ? (
              <div className="text-center py-10 text-gray-400 text-sm">Caricamento...</div>
            ) : (
              <div className="space-y-2 max-h-[75vh] overflow-y-auto pr-1">
                {filtered.map(t => (
                  <motion.div key={t.id} whileHover={{ x: 2 }} onClick={() => setSelected(t)}>
                    <Card className={cn('cursor-pointer border-l-4 transition-all',
                      selected?.id === t.id ? 'border-orange-500 bg-orange-50 shadow-sm' : 'border-gray-200 hover:border-gray-300')}>
                      <CardContent className="p-3">
                        <p className="font-semibold text-sm text-gray-900 truncate">{t.name}</p>
                        <div className="flex items-center justify-between mt-1.5 gap-1">
                          <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', STATUS_COLORS[t.status] || STATUS_COLORS.active)}>
                            {STATUS_LABEL[t.status] || t.status}
                          </span>
                          {selected?.id === t.id && <ChevronRight className="w-3 h-3 text-orange-500" />}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-4">
            {selected ? (
              <TenderDetail
                key={selected.id}
                tender={selected}
                onUpdated={fetchTenders}
                onDeleted={() => { setSelected(null); fetchTenders(); }}
              />
            ) : (
              <div className="flex items-center justify-center h-64 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
                <div className="text-center space-y-2">
                  <Gavel className="w-10 h-10 mx-auto opacity-30" />
                  <p className="text-sm">{loading ? '' : 'Nessun Tender: creane uno con "Nuovo Tender"'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default TenderManagement;
