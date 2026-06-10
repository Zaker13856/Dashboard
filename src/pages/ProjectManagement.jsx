import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, ChevronRight, Briefcase, Pencil, FileSpreadsheet, CalendarPlus, Trash2, UserPlus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { exportProjectPlan } from '@/lib/excelExporter';

const MU_HOURS = 143.33;
const STATUS_COLORS = {
  active:    'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
  archived:  'bg-red-100 text-red-700',
};
const EMPTY_FORM = {
  name: '', client: '', type: 'HORIZON', status: 'active',
  start_date: '', end_date: '', sold_person_months: '',
  total_value: '', overhead_rate: '0.25', description: '',
  sold_travel: '', sold_other_costs: '', sold_subcontracting: '', sold_third_parties: '',
  is_lump_sum: false,
};

const fmt  = n => new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
const fmtH = n => new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

const computeDurationMonths = (start, end) => {
  if (!start || !end) return null;
  const s = new Date(start), e = new Date(end);
  return Math.round((e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()));
};

// ─── Planning Gauge ────────────────────────────────────────────
const GaugeBox = ({
  title, sold, planned, delta, pct, isOver,
  soldLabel, plannedLabel, deltaLabel,
  plannedRowLabel = 'Pianificati:',
  colorInverted   = false,
  overLabel       = 'in eccesso',
  underLabel      = 'disponibile',
}) => {
  const barClass  = colorInverted
    ? (isOver ? 'bg-green-500' : 'bg-red-500')
    : (isOver ? 'bg-red-500'   : 'bg-blue-500');
  const textClass = colorInverted
    ? (isOver ? 'text-green-600' : 'text-red-600')
    : (isOver ? 'text-red-600'   : 'text-green-600');
  return (
    <div className="flex-1 rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-3">{title}</p>
      <div className="space-y-1 text-xs mb-3">
        <div className="flex justify-between">
          <span className="text-gray-500">Venduti:</span>
          <span className="font-semibold text-gray-700">{sold != null ? soldLabel : '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">{plannedRowLabel}</span>
          <span className="font-semibold text-gray-700">{plannedLabel}</span>
        </div>
      </div>
      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden mb-2">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {sold != null && sold > 0 ? (
        <div className={cn('text-sm font-bold', textClass)}>
          {delta > 0 ? '+' : ''}{deltaLabel}
          <span className="ml-1.5 text-[10px] font-normal text-gray-500">
            {isOver ? overLabel : underLabel}
          </span>
        </div>
      ) : (
        <div className="text-xs text-gray-400">Valore venduto non impostato</div>
      )}
    </div>
  );
};

const PlanningGauge = ({
  soldMU, plannedMU, soldValue, plannedValue,
  soldTravel, plannedTravel, actualTravel,
  soldOther, plannedOther, actualOther,
  soldSubcontr, plannedSubcontr, actualSubcontr,
  soldThirdParties, plannedThirdParties, actualThirdParties,
  overheadRate = 0.25,
}) => {
  const muDelta    = plannedMU - (soldMU || 0);
  const valueDelta = plannedValue - (soldValue || 0);
  const muPct      = soldMU    > 0 ? Math.min((plannedMU    / soldMU)    * 100, 100) : 0;
  const valuePct   = soldValue > 0 ? Math.min((plannedValue / soldValue) * 100, 100) : 0;
  const muOver     = (soldMU    != null && soldMU    > 0) && plannedMU    > soldMU;
  const valueOver  = (soldValue != null && soldValue > 0) && plannedValue > soldValue;

  // Costi Indiretti = overheadRate × (valore mesi + travel + other)
  // soldValue è già il valore-mesi venduto (MU × tariffa, NON include travel/other/sub/3rd).
  // plannedValue è già costiPersonale (NON include travel/other/sub/3rd).
  // Sub e 3rd Parties NON entrano nella base di calcolo.
  const indirectSold   = overheadRate * ((soldValue   || 0) + (soldTravel   || 0) + (soldOther   || 0));
  const indirectActual = overheadRate * ((plannedValue|| 0) + (actualTravel || 0) + (actualOther || 0));
  const indirectDelta  = indirectActual - indirectSold;
  const indirectPct    = indirectSold > 0 ? Math.min((indirectActual / indirectSold) * 100, 100) : 0;
  const indirectOver   = indirectSold > 0 && indirectActual > indirectSold;

  const costRows = [
    { label: 'Travel €',      sold: soldTravel,       planned: plannedTravel,        actual: actualTravel },
    { label: 'Other €',       sold: soldOther,        planned: plannedOther,         actual: actualOther },
    { label: 'Subcontr. €',   sold: soldSubcontr,     planned: plannedSubcontr,      actual: actualSubcontr },
    { label: '3rd Parties €', sold: soldThirdParties, planned: plannedThirdParties,  actual: actualThirdParties },
  ];

  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">
          Venduto vs Pianificato
        </p>
        <div className="flex gap-3 mb-4">
          <GaugeBox
            title="Mesi (MU)"
            sold={soldMU}
            planned={plannedMU}
            delta={muDelta}
            pct={muPct}
            isOver={muOver}
            soldLabel={fmtH(soldMU)}
            plannedLabel={fmtH(plannedMU)}
            deltaLabel={`${fmtH(Math.abs(muDelta))} MU`}
          />
          <GaugeBox
            title="Valore €"
            sold={soldValue}
            planned={plannedValue}
            delta={valueDelta}
            pct={valuePct}
            isOver={valueOver}
            soldLabel={`€ ${fmt(soldValue)}`}
            plannedLabel={`€ ${fmt(plannedValue)}`}
            deltaLabel={`€ ${fmt(Math.abs(valueDelta))}`}
          />
        </div>
        <div className="flex mb-4">
          <GaugeBox
            title="Costi Indiretti €"
            sold={indirectSold}
            planned={indirectActual}
            delta={indirectDelta}
            pct={indirectPct}
            isOver={indirectOver}
            soldLabel={`€ ${fmt(indirectSold)}`}
            plannedLabel={`€ ${fmt(indirectActual)}`}
            deltaLabel={`€ ${fmt(Math.abs(indirectDelta))}`}
            plannedRowLabel="Fatti:"
            colorInverted
            overLabel="in eccesso"
            underLabel="in difetto"
          />
        </div>
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2 text-left text-gray-500 font-medium">Voce</th>
                <th className="px-3 py-2 text-right text-gray-500 font-medium">Venduto €</th>
                <th className="px-3 py-2 text-right text-gray-500 font-medium">Pianificato €</th>
                <th className="px-3 py-2 text-right text-gray-500 font-medium">Fatti €</th>
                <th className="px-3 py-2 text-right text-gray-500 font-medium">Delta €</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {costRows.map(({ label, sold, planned, actual }) => {
                const s     = parseFloat(sold)    || 0;
                const p     = parseFloat(planned) || 0;
                const a     = parseFloat(actual)  || 0;
                // Delta = Venduti - Fatti (quanto resta disponibile; negativo = in eccesso)
                const delta = s - a;
                const actualOver = s > 0 && a > s;
                return (
                  <tr key={label}>
                    <td className="px-3 py-2 text-gray-600">{label}</td>
                    <td className="px-3 py-2 text-right text-gray-700">{s > 0 ? fmt(s) : '—'}</td>
                    <td className="px-3 py-2 text-right text-gray-700">{fmt(p)}</td>
                    <td className={cn('px-3 py-2 text-right font-semibold',
                      a > 0 ? (actualOver ? 'text-red-600' : 'text-blue-600') : 'text-gray-400'
                    )}>
                      {a > 0 ? fmt(a) : '—'}
                    </td>
                    <td className={cn('px-3 py-2 text-right font-semibold',
                      s > 0 ? (actualOver ? 'text-red-600' : 'text-green-600') : 'text-gray-400'
                    )}>
                      {s > 0 ? `${delta > 0 ? '+' : ''}${fmt(delta)}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

const MONTHS_IT = [
  'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre',
];

// ─── Add Period Dialog ─────────────────────────────────────────
const AddPeriodDialog = ({ open, onOpenChange, onSave }) => {
  const curYear = new Date().getFullYear();
  const [form, setForm] = useState({ startMonth: 1, startYear: curYear, endMonth: 12, endYear: curYear });
  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  useEffect(() => {
    if (open) setForm({ startMonth: 1, startYear: curYear, endMonth: 12, endYear: curYear });
  }, [open]);

  // Preview: split by year
  const preview = (() => {
    const { startMonth, startYear, endMonth, endYear } = form;
    if (endYear < startYear || (endYear === startYear && endMonth < startMonth)) return [];
    const rows = [];
    for (let y = startYear; y <= endYear; y++) {
      const mStart = y === startYear ? startMonth : 1;
      const mEnd   = y === endYear   ? endMonth   : 12;
      rows.push({ year: y, duration: mEnd - mStart + 1 });
    }
    return rows;
  })();

  const isValid = preview.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader><DialogTitle>Aggiungi Periodi</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 space-y-1">
              <Label className="text-xs text-gray-500">Inizio</Label>
              <div className="flex gap-1">
                <Select value={String(form.startMonth)} onValueChange={v => f('startMonth', parseInt(v))}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS_IT.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="number" min="2020" max="2035" value={form.startYear} className="w-20"
                  onChange={e => f('startYear', parseInt(e.target.value) || curYear)} />
              </div>
            </div>
            <span className="text-gray-400 mt-5">→</span>
            <div className="flex-1 space-y-1">
              <Label className="text-xs text-gray-500">Fine</Label>
              <div className="flex gap-1">
                <Select value={String(form.endMonth)} onValueChange={v => f('endMonth', parseInt(v))}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS_IT.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="number" min="2020" max="2035" value={form.endYear} className="w-20"
                  onChange={e => f('endYear', parseInt(e.target.value) || curYear)} />
              </div>
            </div>
          </div>
          {isValid && (
            <div className="bg-gray-50 rounded p-2 space-y-1">
              {preview.map(r => (
                <div key={r.year} className="flex justify-between text-xs text-gray-600">
                  <span>{r.year}</span>
                  <span>{r.duration} {r.duration === 1 ? 'mese' : 'mesi'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={() => onSave(form)} disabled={!isValid}>Aggiungi</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Project Form Dialog ──────────────────────────────────────
const ProjectFormDialog = ({ open, onOpenChange, initial, onSave, title, triggerEl }) => {
  const { toast } = useToast();
  const [form, setForm] = useState(initial || EMPTY_FORM);

  useEffect(() => { setForm(initial || EMPTY_FORM); }, [initial, open]);

  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Errore', description: 'Il nome è obbligatorio', variant: 'destructive' });
      return;
    }
    const dur = computeDurationMonths(form.start_date, form.end_date);
    const payload = {
      name:               form.name.trim(),
      client:             form.client             || null,
      type:               form.type               || null,
      status:             form.status,
      start_date:         form.start_date         || null,
      end_date:           form.end_date           || null,
      duration_months:    dur,
      sold_person_months:  form.sold_person_months  ? parseFloat(form.sold_person_months)  : null,
      total_value:         form.total_value         ? parseFloat(form.total_value)         : null,
      overhead_rate:       parseFloat(form.overhead_rate) || 0.25,
      description:         form.description         || null,
      sold_travel:         form.sold_travel         ? parseFloat(form.sold_travel)         : null,
      sold_other_costs:    form.sold_other_costs    ? parseFloat(form.sold_other_costs)    : null,
      sold_subcontracting: form.sold_subcontracting ? parseFloat(form.sold_subcontracting) : null,
      sold_third_parties:  form.sold_third_parties  ? parseFloat(form.sold_third_parties)  : null,
      is_lump_sum:         !!form.is_lump_sum,
    };
    await onSave(payload);
  };

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
            <Select value={form.type} onValueChange={v => f('type', v)}>
              <SelectTrigger className="bg-white text-gray-900"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['HORIZON','NATIONAL','PRIVATE','OTHER'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-gray-700 font-medium">Status</Label>
            <Select value={form.status} onValueChange={v => f('status', v)}>
              <SelectTrigger className="bg-white text-gray-900"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Attivo</SelectItem>
                <SelectItem value="completed">Completato</SelectItem>
                <SelectItem value="archived">Archiviato</SelectItem>
              </SelectContent>
            </Select>
          </div>
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

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-gray-700 font-medium">MU Venduti</Label>
            <Input type="number" step="0.1" value={form.sold_person_months} onChange={e => f('sold_person_months', e.target.value)} className="text-gray-900 bg-white" placeholder="es. 23" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-gray-700 font-medium">Valore Venduto €</Label>
            <Input type="number" step="1" value={form.total_value} onChange={e => f('total_value', e.target.value)} className="text-gray-900 bg-white" placeholder="es. 148787" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-gray-700 font-medium">Overhead Rate</Label>
            <Input type="number" step="0.01" value={form.overhead_rate} onChange={e => f('overhead_rate', e.target.value)} className="text-gray-900 bg-white" placeholder="es. 0.25" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-gray-700 font-medium">Cliente</Label>
            <Input value={form.client} onChange={e => f('client', e.target.value)} className="text-gray-900 bg-white" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-gray-700 font-medium">Travel Venduto €</Label>
            <Input type="number" step="1" value={form.sold_travel} onChange={e => f('sold_travel', e.target.value)} className="text-gray-900 bg-white" placeholder="es. 5000" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-gray-700 font-medium">Other Venduto €</Label>
            <Input type="number" step="1" value={form.sold_other_costs} onChange={e => f('sold_other_costs', e.target.value)} className="text-gray-900 bg-white" placeholder="es. 3000" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-gray-700 font-medium">Subcontracting Venduto €</Label>
            <Input type="number" step="1" value={form.sold_subcontracting} onChange={e => f('sold_subcontracting', e.target.value)} className="text-gray-900 bg-white" placeholder="es. 10000" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-gray-700 font-medium">3rd Parties Venduto €</Label>
            <Input type="number" step="1" value={form.sold_third_parties} onChange={e => f('sold_third_parties', e.target.value)} className="text-gray-900 bg-white" placeholder="es. 2000" />
          </div>
        </div>

        {form.start_date && form.end_date && (
          <p className="text-xs text-gray-400">
            Durata calcolata: {computeDurationMonths(form.start_date, form.end_date)} mesi
          </p>
        )}

        <div className="flex items-center gap-3 pt-1">
          <input
            type="checkbox"
            id="is_lump_sum"
            checked={!!form.is_lump_sum}
            onChange={e => f('is_lump_sum', e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
          />
          <label htmlFor="is_lump_sum" className="text-sm text-gray-700 cursor-pointer select-none">
            Progetto <span className="font-semibold text-purple-700">Lump Sum</span>
            <span className="ml-2 text-xs text-gray-400">(forfait fisso — escluso dai totali MU/ore pianificate)</span>
          </label>
        </div>

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

// ─── Editable Cell ────────────────────────────────────────────
const EditableCell = ({ value, onSave, bgClass = '' }) => {
  const [editing, setEditing] = useState(false);
  const [local, setLocal]     = useState('');

  const open = () => { setLocal(value === 0 ? '' : String(value)); setEditing(true); };

  const commit = () => {
    setEditing(false);
    const v = parseFloat(local) || 0;
    if (v !== value) onSave(v);
  };

  if (editing) {
    return (
      <input
        autoFocus type="number" step="0.01"
        value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditing(false); }}
        className="w-full text-center text-xs border border-blue-400 rounded px-1 py-0.5 bg-white outline-none focus:ring-1 focus:ring-blue-400"
      />
    );
  }

  return (
    <div
      onClick={open}
      title="Clicca per modificare"
      className={cn("text-center cursor-pointer hover:bg-white hover:shadow-sm rounded px-1 py-0.5 min-w-[65px] transition-all", bgClass)}
    >
      {value === 0 ? <span className="text-gray-300">—</span> : fmtH(value)}
    </div>
  );
};

// Variante intera (es. durata mesi)
const EditableInt = ({ value, onSave, min = 1, max = 60, bgClass = '', textClass = '' }) => {
  const [editing, setEditing] = useState(false);
  const [local, setLocal]     = useState('');

  const open = () => { setLocal(value != null ? String(value) : ''); setEditing(true); };

  const commit = () => {
    setEditing(false);
    let v = parseInt(local, 10);
    if (isNaN(v)) return;
    if (v < min) v = min;
    if (v > max) v = max;
    if (v !== value) onSave(v);
  };

  if (editing) {
    return (
      <input
        autoFocus type="number" step="1" min={min} max={max}
        value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditing(false); }}
        className="w-16 text-center text-xs border border-blue-400 rounded px-1 py-0.5 bg-white outline-none focus:ring-1 focus:ring-blue-400"
      />
    );
  }

  return (
    <div
      onClick={open}
      title="Clicca per modificare"
      className={cn("text-center cursor-pointer hover:bg-white hover:shadow-sm rounded px-1 py-0.5 transition-all", bgClass, textClass)}
    >
      {value != null ? value : <span className="text-gray-300">—</span>}
    </div>
  );
};

// Variante testo (es. label periodo)
const EditableText = ({ value, onSave, bgClass = '', textClass = '' }) => {
  const [editing, setEditing] = useState(false);
  const [local, setLocal]     = useState('');

  const open = () => { setLocal(value || ''); setEditing(true); };

  const commit = () => {
    setEditing(false);
    const v = (local || '').trim();
    if (!v) return;
    if (v !== value) onSave(v);
  };

  if (editing) {
    return (
      <input
        autoFocus type="text"
        value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditing(false); }}
        className="w-20 text-center text-xs border border-blue-400 rounded px-1 py-0.5 bg-white outline-none focus:ring-1 focus:ring-blue-400"
      />
    );
  }

  return (
    <div
      onClick={open}
      title="Clicca per rinominare"
      className={cn("cursor-pointer hover:bg-white hover:shadow-sm rounded px-1 py-0.5 transition-all", bgClass, textClass)}
    >
      {value || <span className="text-gray-300">—</span>}
    </div>
  );
};

// ─── Project Detail ───────────────────────────────────────────
const ProjectDetail = ({ project, onProjectUpdated, onProjectDeleted }) => {
  const { toast } = useToast();
  const [periods,     setPeriods]     = useState([]);
  const [consultants, setConsultants] = useState([]);
  const [allocMap,    setAllocMap]    = useState({});
  const [ratesMap,    setRatesMap]    = useState({});
  const [costsMap,    setCostsMap]    = useState({});
  const [loading,     setLoading]     = useState(true);
  const [editOpen,    setEditOpen]    = useState(false);
  const [addPeriodOpen,  setAddPeriodOpen]  = useState(false);
  const [deletingPeriod, setDeletingPeriod] = useState(null); // { id, label }
  const [deleteProjectOpen, setDeleteProjectOpen] = useState(false);
  const [allConsultants, setAllConsultants] = useState([]); // full roster for selector
  const [actualsByType, setActualsByType] = useState({ travel: 0, other_cost: 0, subcontract: 0, third_parties: 0 });

  useEffect(() => { load(); }, [project.id]);

  // Ricarica i "Fatti" quando una spesa viene modificata in ExpensesPage
  useEffect(() => {
    const handler = () => load();
    window.addEventListener('expenses:updated', handler);
    return () => window.removeEventListener('expenses:updated', handler);
  }, [project.id]);

  const load = async () => {
    setLoading(true);

    const { data: pData } = await supabase
      .from('project_periods')
      .select('*')
      .eq('project_id', project.id)
      .order('year').order('period_number');

    const pList = pData || [];
    setPeriods(pList);

    if (!pList.length) { setLoading(false); return; }

    const pIds = pList.map(p => p.id);

    const [{ data: aData }, { data: consData }] = await Promise.all([
      supabase.from('allocations')
        .select('id, consultant_id, project_period_id, allocated_hours, consultants(id, name)')
        .in('project_period_id', pIds),
      supabase.from('consultants').select('id, name').eq('status', 'active').order('name'),
    ]);

    const allocs = aData || [];

    const aMap = {};
    allocs.forEach(a => {
      if (!aMap[a.project_period_id]) aMap[a.project_period_id] = {};
      aMap[a.project_period_id][a.consultant_id] = { id: a.id, hours: parseFloat(a.allocated_hours) || 0 };
    });
    setAllocMap(aMap);

    // Consultants with allocations on this project
    const cMap = {};
    allocs.forEach(a => { if (a.consultants) cMap[a.consultant_id] = a.consultants; });
    setConsultants(Object.values(cMap).sort((a, b) => a.name.localeCompare(b.name)));
    setAllConsultants(consData || []);

    const coMap = {};
    pList.forEach(p => {
      coMap[p.id] = {
        travel:         parseFloat(p.travel_budget)         || 0,
        other_costs:    parseFloat(p.other_costs_budget)    || 0,
        subcontracting: parseFloat(p.subcontracting_budget) || 0,
        third_parties:  parseFloat(p.third_parties_budget)  || 0,
        external_cost:  parseFloat(p.external_cost)         || 0,
      };
    });
    setCostsMap(coMap);

    // ─── Spese "Fatti": somma da expenses (admin + consulenti) + travel_reports ──
    const actuals = { travel: 0, other_cost: 0, subcontract: 0, third_parties: 0 };

    const { data: expData } = await supabase
      .from('expenses')
      .select('type, amount, eligible_amount, iva')
      .eq('project_id', project.id);
    (expData || []).forEach(e => {
      const val = parseFloat(e.eligible_amount);
      const amt = parseFloat(e.amount) || 0;
      const iva = parseFloat(e.iva) || 0;
      const elig = !isNaN(val) ? val : (amt - iva);
      if (actuals[e.type] !== undefined) actuals[e.type] += elig;
    });

    // Travel: aggiungi anche note spese viaggio dei consulenti (submitted)
    const { data: trData } = await supabase
      .from('travel_reports')
      .select('travel_report_items(amount, iva)')
      .eq('project_id', project.id)
      .eq('status', 'submitted');
    (trData || []).forEach(r => {
      (r.travel_report_items || []).forEach(i => {
        actuals.travel += (parseFloat(i.amount) || 0) - (parseFloat(i.iva) || 0);
      });
    });

    setActualsByType(actuals);

    const years = [...new Set(pList.map(p => p.year))];
    const cIds  = Object.keys(cMap);
    if (cIds.length && years.length) {
      const { data: rData } = await supabase
        .from('consultant_rates')
        .select('consultant_id, year, hourly_rate')
        .in('consultant_id', cIds).in('year', years);
      const rMap = {};
      (rData || []).forEach(r => {
        if (!rMap[r.consultant_id]) rMap[r.consultant_id] = {};
        rMap[r.consultant_id][r.year] = parseFloat(r.hourly_rate) || 0;
      });
      setRatesMap(rMap);
    }

    setLoading(false);
  };

  // ─── Save helpers ──────────────────────────────────────────
  const saveHours = async (periodId, consultantId, hours) => {
    const existing = allocMap[periodId]?.[consultantId];
    const h = parseFloat(hours) || 0;

    if (existing?.id) {
      if (h === 0) await supabase.from('allocations').delete().eq('id', existing.id);
      else         await supabase.from('allocations').update({ allocated_hours: h }).eq('id', existing.id);
    } else if (h > 0) {
      await supabase.from('allocations').insert({
        consultant_id: consultantId,
        project_id: project.id,
        project_period_id: periodId,
        allocated_hours: h,
      });
    }

    setAllocMap(prev => {
      const next = { ...prev, [periodId]: { ...(prev[periodId] || {}) } };
      if (h === 0) delete next[periodId][consultantId];
      else next[periodId][consultantId] = { ...next[periodId][consultantId], hours: h };
      return next;
    });
  };

  const DB_FIELD = {
    travel:         'travel_budget',
    other_costs:    'other_costs_budget',
    subcontracting: 'subcontracting_budget',
    third_parties:  'third_parties_budget',
    external_cost:  'external_cost',
  };

  const saveCost = async (periodId, field, value) => {
    const v = parseFloat(value) || 0;
    await supabase.from('project_periods').update({ [DB_FIELD[field]]: v }).eq('id', periodId);
    setCostsMap(prev => ({ ...prev, [periodId]: { ...prev[periodId], [field]: v } }));
  };

  const savePeriodLabel = async (periodId, label) => {
    const { error } = await supabase.from('project_periods').update({ label }).eq('id', periodId);
    if (error) { toast({ title: 'Errore', description: error.message, variant: 'destructive' }); return; }
    setPeriods(prev => prev.map(p => p.id === periodId ? { ...p, label } : p));
    toast({ title: `Periodo rinominato in ${label}` });
  };

  const savePeriodDuration = async (periodId, duration_months) => {
    const { error } = await supabase.from('project_periods').update({ duration_months }).eq('id', periodId);
    if (error) { toast({ title: 'Errore', description: error.message, variant: 'destructive' }); return; }
    setPeriods(prev => prev.map(p => p.id === periodId ? { ...p, duration_months } : p));
    toast({ title: `Durata aggiornata a ${duration_months} mesi` });
  };

  const handleEditSave = async (payload) => {
    const { error } = await supabase.from('projects').update(payload).eq('id', project.id);
    if (error) {
      toast({ title: 'Errore', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Progetto aggiornato' });
    setEditOpen(false);
    onProjectUpdated();
  };

  const handleDeleteProject = async () => {
    const { data: periodRows } = await supabase.from('project_periods').select('id').eq('project_id', project.id);
    const periodIds = (periodRows || []).map(p => p.id);
    if (periodIds.length > 0) await supabase.from('allocations').delete().in('project_period_id', periodIds);
    await supabase.from('allocations').delete().eq('project_id', project.id);
    await supabase.from('project_periods').delete().eq('project_id', project.id);
    const { error } = await supabase.from('projects').delete().eq('id', project.id);
    if (error) {
      toast({ title: 'Errore', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: `Progetto "${project.name}" eliminato` });
    onProjectDeleted();
  };

  // ─── Period management ────────────────────────────────────────
  const addPeriod = async ({ startMonth, startYear, endMonth, endYear }) => {
    const insertedIds = [];

    for (let y = startYear; y <= endYear; y++) {
      const mStart = y === startYear ? startMonth : 1;
      const mEnd   = y === endYear   ? endMonth   : 12;
      const duration_months = mEnd - mStart + 1;

      const existing = periods.filter(p => p.year === y);
      const maxN = existing.reduce((m, p) => Math.max(m, p.period_number || 0), 0);
      const period_number = maxN + 1;
      const label = `${y}_${period_number}`;

      const { data, error } = await supabase.from('project_periods').insert({
        project_id:            project.id,
        year:                  y,
        period_number,
        label,
        duration_months,
        travel_budget:         0,
        other_costs_budget:    0,
        subcontracting_budget: 0,
        third_parties_budget:  0,
        external_cost:         0,
      }).select('id').single();

      if (error) {
        if (insertedIds.length > 0) {
          await supabase.from('project_periods').delete().in('id', insertedIds);
        }
        toast({ title: 'Errore creazione periodo', description: error.message, variant: 'destructive' });
        return;
      }
      if (data?.id) insertedIds.push(data.id);
    }
    setAddPeriodOpen(false);
    await load();
  };

  const deletePeriod = async (periodId, periodLabel) => {
    const { error: allocErr } = await supabase.from('allocations').delete().eq('project_period_id', periodId);
    if (allocErr) {
      toast({ title: 'Errore eliminazione allocazioni', description: allocErr.message, variant: 'destructive' });
      setDeletingPeriod(null);
      return;
    }

    const { error } = await supabase.from('project_periods').delete().eq('id', periodId);
    if (error) {
      toast({ title: 'Errore eliminazione periodo', description: error.message, variant: 'destructive' });
      setDeletingPeriod(null);
      return;
    }
    toast({ title: `Periodo ${periodLabel} eliminato` });
    setDeletingPeriod(null);
    await load();
  };

  // ─── Row calculation ──────────────────────────────────────
  const calcRow = (periodId, year) => {
    const pa    = allocMap[periodId] || {};
    const costs = costsMap[periodId] || {};

    let totalHours = 0, costoInterno = 0;
    consultants.forEach(c => {
      const h = pa[c.id]?.hours || 0;
      totalHours  += h;
      costoInterno += h * (ratesMap[c.id]?.[year] || 0);
    });

    const totMU          = totalHours / MU_HOURS;
    const costoEsterno   = costs.external_cost  || 0;
    const costiPersonale = costoInterno + costoEsterno;
    const travel         = costs.travel          || 0;
    const otherCosts     = costs.other_costs     || 0;
    const subcontr       = costs.subcontracting  || 0;
    const thirdParties   = costs.third_parties   || 0;
    const totDiretti     = costiPersonale + travel + otherCosts + subcontr + thirdParties;
    const ovhRate        = parseFloat(project.overhead_rate) || 0.25;
    const overhead       = ovhRate * (costiPersonale + travel + otherCosts + thirdParties);
    const granTotale     = totDiretti + overhead;

    return { totalHours, totMU, costoInterno, costoEsterno, costiPersonale, travel, otherCosts, subcontr, thirdParties, totDiretti, overhead, granTotale };
  };

  const totals = (() => {
    const T = { totalHours:0, totMU:0, costoInterno:0, costoEsterno:0, costiPersonale:0,
                travel:0, otherCosts:0, subcontr:0, thirdParties:0, totDiretti:0, overhead:0, granTotale:0 };
    const cTot = {};
    consultants.forEach(c => { cTot[c.id] = 0; });
    periods.forEach(p => {
      const r = calcRow(p.id, p.year);
      Object.keys(T).forEach(k => { T[k] += r[k]; });
      consultants.forEach(c => { cTot[c.id] += allocMap[p.id]?.[c.id]?.hours || 0; });
    });
    return { ...T, cTot };
  })();

  const ovhPct = ((parseFloat(project.overhead_rate) || 0.25) * 100).toFixed(0);

  const handleExportPlan = () => {
    const ovhRate = parseFloat(project.overhead_rate) || 0.25;
    const periodRows = periods.map(p => {
      const r = calcRow(p.id, p.year);
      return {
        period: p,
        consultantHours: consultants.map(c => allocMap[p.id]?.[c.id]?.hours || 0),
        ...r,
      };
    });
    exportProjectPlan({
      project,
      consultants,
      periodRows,
      totals,
      ovhRate,
    });
  };

  const initialFormData = {
    name:               project.name               || '',
    client:             project.client             || '',
    type:               project.type               || 'HORIZON',
    status:             project.status             || 'active',
    start_date:         project.start_date         || '',
    end_date:           project.end_date           || '',
    sold_person_months:  project.sold_person_months  != null ? String(project.sold_person_months)  : '',
    total_value:         project.total_value         != null ? String(project.total_value)         : '',
    overhead_rate:       project.overhead_rate       != null ? String(project.overhead_rate)       : '0.25',
    description:         project.description         || '',
    sold_travel:         project.sold_travel         != null ? String(project.sold_travel)         : '',
    sold_other_costs:    project.sold_other_costs    != null ? String(project.sold_other_costs)    : '',
    sold_subcontracting: project.sold_subcontracting != null ? String(project.sold_subcontracting) : '',
    sold_third_parties:  project.sold_third_parties  != null ? String(project.sold_third_parties)  : '',
    is_lump_sum:         !!project.is_lump_sum,
  };

  if (loading) return <div className="text-center py-20 text-gray-400 text-sm">Caricamento dati progetto...</div>;

  return (
    <div className="space-y-6">

      {/* Header */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">{project.name}</h2>
            <div className="flex items-center gap-2">
              <span className={cn("text-xs px-2 py-1 rounded-full font-medium", STATUS_COLORS[project.status] || STATUS_COLORS.active)}>
                {project.status}
              </span>
              {project.is_lump_sum && (
                <span className="text-xs px-2 py-1 rounded-full font-bold bg-purple-100 text-purple-700 border border-purple-200">
                  LUMP SUM
                </span>
              )}
              <Button
                size="sm" variant="outline"
                className="h-7 px-2 text-xs text-gray-600 border-gray-200 hover:bg-gray-50"
                onClick={() => setAddPeriodOpen(true)}
                title="Aggiungi periodo"
              >
                <CalendarPlus className="w-3 h-3 mr-1" />+ Periodo
              </Button>
              {/* Add consultant selector */}
              {allConsultants.filter(c => !consultants.find(x => x.id === c.id)).length > 0 && (
                <Select onValueChange={id => {
                  const c = allConsultants.find(x => x.id === id);
                  if (c) setConsultants(prev => [...prev, c].sort((a, b) => a.name.localeCompare(b.name)));
                }}>
                  <SelectTrigger className="h-7 px-2 text-xs text-gray-600 border-gray-200 w-auto gap-1">
                    <UserPlus className="w-3 h-3" /><span>+ Consulente</span>
                  </SelectTrigger>
                  <SelectContent>
                    {allConsultants
                      .filter(c => !consultants.find(x => x.id === c.id))
                      .map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <Button
                size="sm" variant="outline"
                className="h-7 px-2 text-xs text-gray-600 border-gray-200 hover:bg-gray-50"
                onClick={handleExportPlan}
                title="Esporta piano in Excel"
              >
                <FileSpreadsheet className="w-3 h-3 mr-1" />Excel
              </Button>
              <Button
                size="sm" variant="outline"
                className="h-7 px-2 text-xs text-gray-600 border-gray-200 hover:bg-gray-50"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="w-3 h-3 mr-1" />Modifica
              </Button>
              <Button
                size="sm" variant="outline"
                className="h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => setDeleteProjectOpen(true)}
              >
                <Trash2 className="w-3 h-3 mr-1" />Elimina
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-7 gap-3 text-sm">
            {[
              ['Tipo',           project.type                                                     || '—'],
              ['Inizio',         project.start_date                                               || '—'],
              ['Fine',           project.end_date                                                 || '—'],
              ['Durata',         project.duration_months ? `${project.duration_months} mesi`      : '—'],
              ['MU Venduti',     project.sold_person_months != null ? project.sold_person_months  : '—'],
              ['Valore Venduto', project.total_value        != null ? `€ ${fmt(project.total_value)}` : '—'],
              ['Monthly Rate',   (project.total_value != null && project.sold_person_months)
                                   ? `€ ${fmt(Math.round(project.total_value / project.sold_person_months))}`
                                   : '—'],
            ].map(([label, val]) => (
              <div key={label}>
                <p className="text-gray-400 text-xs mb-0.5">{label}</p>
                <p className="font-semibold text-gray-900">{val}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <ProjectFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        initial={initialFormData}
        onSave={handleEditSave}
        title="Modifica Progetto"
      />

      {/* Add Period Dialog */}
      <AddPeriodDialog
        open={addPeriodOpen}
        onOpenChange={setAddPeriodOpen}
        onSave={addPeriod}
      />

      {/* Delete Period Confirm Dialog */}
      {deletingPeriod && (
        <Dialog open={!!deletingPeriod} onOpenChange={() => setDeletingPeriod(null)}>
          <DialogContent className="sm:max-w-[360px]">
            <DialogHeader>
              <DialogTitle>Eliminare il periodo {deletingPeriod.label}?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-600 py-2">
              Verranno cancellate anche tutte le ore allocate per questo periodo.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeletingPeriod(null)}>Annulla</Button>
              <Button
                variant="destructive"
                onClick={() => deletePeriod(deletingPeriod.id, deletingPeriod.label)}
              >
                Elimina
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Project Confirm Dialog */}
      <Dialog open={deleteProjectOpen} onOpenChange={setDeleteProjectOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Eliminare il progetto?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-2">
            Stai per eliminare <strong>{project.name}</strong>.<br />
            Verranno cancellati tutti i periodi e le allocazioni associate.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteProjectOpen(false)}>Annulla</Button>
            <Button variant="destructive" onClick={handleDeleteProject}>Elimina</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Planning Gauge — nascosto per Lump Sum */}
      {project.is_lump_sum ? (
        <Card>
          <CardContent className="p-4 flex items-center gap-3 text-sm text-purple-700 bg-purple-50 rounded-lg">
            <span className="text-lg">🔒</span>
            <div>
              <p className="font-semibold">Progetto Lump Sum — forfait fisso</p>
              <p className="text-xs text-purple-500 mt-0.5">
                Le ore pianificate e i MU venduti non vengono conteggiati nei totali di portafoglio.
                Le ore reali dei consulenti vengono comunque registrate.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <PlanningGauge
          soldMU={project.sold_person_months}
          plannedMU={totals.totMU}
          soldValue={project.total_value}
          plannedValue={totals.costiPersonale}
          soldTravel={project.sold_travel}
          plannedTravel={totals.travel}
          actualTravel={actualsByType.travel}
          soldOther={project.sold_other_costs}
          plannedOther={totals.otherCosts}
          actualOther={actualsByType.other_cost}
          soldSubcontr={project.sold_subcontracting}
          plannedSubcontr={totals.subcontr}
          actualSubcontr={actualsByType.subcontract}
          soldThirdParties={project.sold_third_parties}
          plannedThirdParties={totals.thirdParties}
          actualThirdParties={actualsByType.third_parties}
          overheadRate={parseFloat(project.overhead_rate) || 0.25}
        />
      )}

      {/* Table */}
      {periods.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
          Nessun periodo configurato per questo progetto.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="text-xs min-w-max w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300 text-gray-500 uppercase tracking-wide text-[10px]">
                <th className="sticky left-0 bg-gray-100 px-3 py-1.5 border-r border-gray-300" colSpan={2}></th>
                {consultants.length > 0 && (
                  <th className="px-2 py-1.5 border-r border-gray-300 text-blue-600" colSpan={consultants.length}>
                    Ore Allocate
                  </th>
                )}
                <th className="px-2 py-1.5 border-r border-gray-300" colSpan={4}>Personale</th>
                <th className="px-2 py-1.5 border-r border-gray-300 text-orange-600" colSpan={4}>Costi Diretti</th>
                <th className="px-2 py-1.5 border-r border-gray-300" colSpan={2}>Totali</th>
                <th className="px-2 py-1.5 text-green-600"></th>
              </tr>
              <tr className="bg-gray-50 border-b-2 border-gray-300">
                <th className="sticky left-0 bg-gray-50 text-left px-3 py-2 font-semibold text-gray-700 border-r border-gray-200 min-w-[90px]">Periodo</th>
                <th className="text-center px-2 py-2 font-semibold text-gray-600 border-r border-gray-200 min-w-[55px]">Durata</th>
                {consultants.map(c => (
                  <th key={c.id} title={c.name}
                    className="text-center px-2 py-2 font-semibold text-blue-700 bg-blue-50 border-r border-blue-200 min-w-[75px]">
                    {c.name.split(' ')[0]}
                  </th>
                ))}
                <th className="text-center px-2 py-2 font-semibold text-gray-600 border-r border-gray-200 min-w-[65px]">Tot MU</th>
                <th className="text-center px-2 py-2 font-semibold text-gray-600 border-r border-gray-200 min-w-[100px]">Costo Int. €</th>
                <th className="text-center px-2 py-2 font-semibold text-orange-600 bg-orange-50 border-r border-orange-200 min-w-[95px]">Costo Ext. €</th>
                <th className="text-center px-2 py-2 font-semibold text-gray-700 border-r border-gray-200 min-w-[100px]">Costi Pers. €</th>
                <th className="text-center px-2 py-2 font-semibold text-orange-600 bg-orange-50 border-r border-orange-200 min-w-[80px]">Travel €</th>
                <th className="text-center px-2 py-2 font-semibold text-orange-600 bg-orange-50 border-r border-orange-200 min-w-[80px]">Other €</th>
                <th className="text-center px-2 py-2 font-semibold text-orange-600 bg-orange-50 border-r border-orange-200 min-w-[90px]">Subcontr. €</th>
                <th className="text-center px-2 py-2 font-semibold text-orange-600 bg-orange-50 border-r border-orange-200 min-w-[90px]">3rd Part. €</th>
                <th className="text-center px-2 py-2 font-semibold text-gray-700 border-r border-gray-200 min-w-[105px]">Tot Diretti €</th>
                <th className="text-center px-2 py-2 font-semibold text-gray-600 border-r border-gray-200 min-w-[95px]">Overhead {ovhPct}% €</th>
                <th className="text-center px-2 py-2 font-bold text-green-700 bg-green-50 min-w-[105px]">Gran Totale €</th>
              </tr>
            </thead>

            <tbody>
              {periods.map((period, idx) => {
                const r = calcRow(period.id, period.year);
                return (
                  <tr key={period.id} className={cn("group border-b border-gray-100 hover:bg-yellow-50/30 transition-colors", idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40')}>
                    <td className="sticky left-0 bg-inherit px-2 py-1.5 font-bold text-blue-600 border-r border-gray-200">
                      <div className="flex items-center justify-between gap-1">
                        <EditableText
                          value={period.label}
                          onSave={v => savePeriodLabel(period.id, v)}
                          textClass="font-bold text-blue-600"
                        />
                        <button
                          onClick={() => setDeletingPeriod({ id: period.id, label: period.label })}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity p-0.5 rounded"
                          title="Elimina periodo"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-1 py-1 border-r border-gray-200">
                      <EditableInt
                        value={period.duration_months}
                        onSave={v => savePeriodDuration(period.id, v)}
                        textClass="text-gray-500"
                      />
                    </td>

                    {consultants.map(c => (
                      <td key={c.id} className="px-1 py-1 border-r border-blue-100">
                        <EditableCell
                          value={allocMap[period.id]?.[c.id]?.hours || 0}
                          onSave={v => saveHours(period.id, c.id, v)}
                          bgClass="bg-blue-50/40"
                        />
                      </td>
                    ))}

                    <td className="text-center px-2 py-1.5 text-gray-700 border-r border-gray-200">{fmtH(r.totMU)}</td>
                    <td className="text-center px-2 py-1.5 text-gray-700 border-r border-gray-200">{fmt(r.costoInterno)}</td>

                    <td className="px-1 py-1 border-r border-orange-100">
                      <EditableCell value={costsMap[period.id]?.external_cost || 0} onSave={v => saveCost(period.id, 'external_cost', v)} bgClass="bg-orange-50/40" />
                    </td>
                    <td className="text-center px-2 py-1.5 font-medium text-gray-700 border-r border-gray-200">{fmt(r.costiPersonale)}</td>

                    <td className="px-1 py-1 border-r border-orange-100">
                      <EditableCell value={costsMap[period.id]?.travel || 0} onSave={v => saveCost(period.id, 'travel', v)} bgClass="bg-orange-50/40" />
                    </td>
                    <td className="px-1 py-1 border-r border-orange-100">
                      <EditableCell value={costsMap[period.id]?.other_costs || 0} onSave={v => saveCost(period.id, 'other_costs', v)} bgClass="bg-orange-50/40" />
                    </td>
                    <td className="px-1 py-1 border-r border-orange-100">
                      <EditableCell value={costsMap[period.id]?.subcontracting || 0} onSave={v => saveCost(period.id, 'subcontracting', v)} bgClass="bg-orange-50/40" />
                    </td>
                    <td className="px-1 py-1 border-r border-orange-100">
                      <EditableCell value={costsMap[period.id]?.third_parties || 0} onSave={v => saveCost(period.id, 'third_parties', v)} bgClass="bg-orange-50/40" />
                    </td>

                    <td className="text-center px-2 py-1.5 font-medium text-gray-800 border-r border-gray-200">{fmt(r.totDiretti)}</td>
                    <td className="text-center px-2 py-1.5 text-gray-700 border-r border-gray-200">{fmt(r.overhead)}</td>
                    <td className="text-center px-2 py-1.5 font-bold text-green-700 bg-green-50/40">{fmt(r.granTotale)}</td>
                  </tr>
                );
              })}

              {/* TOTALE row */}
              <tr className="bg-gray-100 border-t-2 border-gray-400 font-bold text-[11px]">
                <td className="sticky left-0 bg-gray-100 px-3 py-2 text-gray-900 border-r border-gray-300 uppercase tracking-wide">TOTALE</td>
                <td className="border-r border-gray-300"></td>
                {consultants.map(c => (
                  <td key={c.id} className="text-center px-2 py-2 text-blue-800 border-r border-blue-200">{fmtH(totals.cTot[c.id])}</td>
                ))}
                <td className="text-center px-2 py-2 text-gray-800 border-r border-gray-300">{fmtH(totals.totMU)}</td>
                <td className="text-center px-2 py-2 text-gray-800 border-r border-gray-300">{fmt(totals.costoInterno)}</td>
                <td className="text-center px-2 py-2 text-orange-800 border-r border-gray-300">{fmt(totals.costoEsterno)}</td>
                <td className="text-center px-2 py-2 text-gray-800 border-r border-gray-300">{fmt(totals.costiPersonale)}</td>
                <td className="text-center px-2 py-2 text-orange-800 border-r border-gray-300">{fmt(totals.travel)}</td>
                <td className="text-center px-2 py-2 text-orange-800 border-r border-gray-300">{fmt(totals.otherCosts)}</td>
                <td className="text-center px-2 py-2 text-orange-800 border-r border-gray-300">{fmt(totals.subcontr)}</td>
                <td className="text-center px-2 py-2 text-orange-800 border-r border-gray-300">{fmt(totals.thirdParties)}</td>
                <td className="text-center px-2 py-2 text-gray-900 border-r border-gray-300">{fmt(totals.totDiretti)}</td>
                <td className="text-center px-2 py-2 text-gray-800 border-r border-gray-300">{fmt(totals.overhead)}</td>
                <td className="text-center px-2 py-2 text-green-900 bg-green-100">{fmt(totals.granTotale)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────
const ProjectManagement = () => {
  const { toast } = useToast();
  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);
  const [search,   setSearch]   = useState('');
  const [isOpen,   setOpen]     = useState(false);

  const fetchProjects = async () => {
    setLoading(true);
    const { data } = await supabase.from('projects').select('*').order('name');
    const list = data || [];
    setProjects(list);
    setSelected(prev => prev ? (list.find(p => p.id === prev.id) || list[0] || null) : (list[0] || null));
    setLoading(false);
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleCreate = async (payload) => {
    const { error } = await supabase.from('projects').insert(payload);
    if (error) { toast({ title: 'Errore', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Progetto creato' });
    setOpen(false);
    fetchProjects();
  };

  // I progetti archiviati vivono nella pagina Repository
  const filtered = projects.filter(p => p.status !== 'archived' && p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <AdminLayout>
      <div className="space-y-6 pb-12">

        {/* Page header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Progetti</h1>
            <p className="text-gray-500 mt-1">Gestione progetti, periodi e allocazioni</p>
          </div>

          <ProjectFormDialog
            open={isOpen}
            onOpenChange={setOpen}
            initial={EMPTY_FORM}
            onSave={handleCreate}
            title="Crea Nuovo Progetto"
            triggerEl={
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2" />Nuovo Progetto
              </Button>
            }
          />
        </div>

        {/* Layout: sidebar + detail */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input placeholder="Cerca..." className="pl-8 text-gray-900" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {loading ? (
              <div className="text-center py-10 text-gray-400 text-sm">Caricamento...</div>
            ) : (
              <div className="space-y-2 max-h-[75vh] overflow-y-auto pr-1">
                {filtered.map(p => (
                  <motion.div key={p.id} whileHover={{ x: 2 }} onClick={() => setSelected(p)}>
                    <Card className={cn("cursor-pointer border-l-4 transition-all",
                      selected?.id === p.id
                        ? "border-blue-500 bg-blue-50 shadow-sm"
                        : p.is_lump_sum
                          ? "border-purple-300 hover:border-purple-400"
                          : "border-gray-200 hover:border-gray-300")}>
                      <CardContent className="p-3">
                        <p className="font-semibold text-sm text-gray-900 truncate">{p.name}</p>
                        <div className="flex items-center justify-between mt-1.5 gap-1 flex-wrap">
                          <div className="flex items-center gap-1">
                            <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-medium", STATUS_COLORS[p.status] || STATUS_COLORS.active)}>
                              {p.status}
                            </span>
                            {p.is_lump_sum && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-purple-100 text-purple-600 border border-purple-200">
                                LS
                              </span>
                            )}
                          </div>
                          {selected?.id === p.id && <ChevronRight className="w-3 h-3 text-blue-500" />}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Detail */}
          <div className="lg:col-span-4">
            {selected ? (
              <ProjectDetail
                key={selected.id}
                project={selected}
                onProjectUpdated={fetchProjects}
                onProjectDeleted={() => { setSelected(null); fetchProjects(); }}
              />
            ) : (
              <div className="flex items-center justify-center h-64 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
                <div className="text-center space-y-2">
                  <Briefcase className="w-10 h-10 mx-auto opacity-30" />
                  <p className="text-sm">Seleziona un progetto</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ProjectManagement;
