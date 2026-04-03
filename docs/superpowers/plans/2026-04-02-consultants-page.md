# Consultants Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Costruire la pagina Consultants con anagrafica CRUD e tabella storico tariffe per anno (Costo Az., Ore Max, MU calcolato, Tariffa calcolata).

**Architecture:** `ConsultantsPage.jsx` viene riscritto da stub con due blocchi: card anagrafica e tabella storico tariffe. `AuthContext.jsx` implementa le funzioni CRUD stub con Supabase e aggiunge stato `rates`. Nessun nuovo file.

**Tech Stack:** React, Supabase (`consultants`, `consultant_rates`), shadcn/ui (Dialog, Button, Input, Label, Select, Badge già importati), lucide-react, TailwindCSS

---

## File coinvolti

- **Modify:** `src/context/AuthContext.jsx` — implementare CRUD + aggiungere `rates` state e `upsertRate`
- **Modify:** `src/pages/ConsultantsPage.jsx` — ricostruire da stub completo

---

## Task 1: DB Migration — aggiungere colonne a `consultant_rates`

**Files:** nessun file da modificare (SQL eseguito in Supabase Dashboard)

- [ ] **Step 1: Eseguire la migration SQL in Supabase Dashboard**

  Aprire Supabase Dashboard → SQL Editor → eseguire:

  ```sql
  ALTER TABLE consultant_rates ADD COLUMN IF NOT EXISTS costo_aziendale numeric DEFAULT 0;
  ALTER TABLE consultant_rates ADD COLUMN IF NOT EXISTS ore_max integer DEFAULT 0;

  -- Unique constraint necessario per upsert (conflict su consultant_id, year)
  -- Eseguire solo se non esiste già (ignorare errore "already exists")
  ALTER TABLE consultant_rates
    ADD CONSTRAINT consultant_rates_consultant_id_year_key
    UNIQUE (consultant_id, year);
  ```

  Atteso: `ALTER TABLE` eseguito con successo. Se il constraint esiste già, l'errore è normale — ignorarlo.

- [ ] **Step 2: Verificare le colonne**

  Sempre in SQL Editor:

  ```sql
  SELECT column_name, data_type, column_default
  FROM information_schema.columns
  WHERE table_name = 'consultant_rates'
  ORDER BY ordinal_position;
  ```

  Atteso: colonne `costo_aziendale` (numeric) e `ore_max` (integer) presenti nella lista.

---

## Task 2: AuthContext — implementare CRUD + rates

**Files:**
- Modify: `src/context/AuthContext.jsx`

- [ ] **Step 1: Aggiungere `fetchRates` e stato `rates`**

  Trovare subito dopo la funzione `fetchAllConsultants` (riga ~31):
  ```js
  const fetchAllConsultants = async () => {
    const { data } = await supabase.from('consultants').select('*');
    return data || [];
  };
  ```

  Aggiungere subito dopo:
  ```js
  const fetchRates = async () => {
    const yearFrom = new Date().getFullYear() - 4;
    const { data } = await supabase
      .from('consultant_rates')
      .select('consultant_id, year, hourly_rate, costo_aziendale, ore_max')
      .gte('year', yearFrom);
    return data || [];
  };
  ```

  Poi nel corpo di `AuthProvider`, trovare:
  ```js
  const [ratesVersion, setRatesVersion] = useState(0);
  ```
  Aggiungere subito dopo:
  ```js
  const [rates, setRates] = useState([]);
  ```

- [ ] **Step 2: Caricare `rates` al login**

  Trovare il blocco nell'`useEffect` che carica i consulenti (appare due volte, in `getSession` e in `onAuthStateChange`):
  ```js
  setUser(profile);
  const all = await fetchAllConsultants();
  setConsultants(all);
  ```
  Sostituire **entrambe** le occorrenze con:
  ```js
  setUser(profile);
  const [all, allRates] = await Promise.all([fetchAllConsultants(), fetchRates()]);
  setConsultants(all);
  setRates(allRates);
  ```

  E nel ramo `else` (logout) di `onAuthStateChange`:
  ```js
  } else {
    setUser(null);
    setConsultants([]);
  }
  ```
  Sostituire con:
  ```js
  } else {
    setUser(null);
    setConsultants([]);
    setRates([]);
  }
  ```

- [ ] **Step 3: Implementare `addConsultant`**

  Trovare:
  ```js
  const addConsultant = async (c) => c;
  ```
  Sostituire con:
  ```js
  const addConsultant = async ({ name, email, role, status }) => {
    const { data, error } = await supabase
      .from('consultants')
      .insert({ name, email: email || null, role: role || 'consultant', status: status || 'active' })
      .select()
      .single();
    if (error) return { error: error.message };
    setConsultants(prev => [...prev, data]);
    return { data };
  };
  ```

- [ ] **Step 4: Implementare `updateConsultant`**

  Trovare:
  ```js
  const updateConsultant = async () => {};
  ```
  Sostituire con:
  ```js
  const updateConsultant = async (id, fields) => {
    const { error } = await supabase
      .from('consultants')
      .update(fields)
      .eq('id', id);
    if (error) return { error: error.message };
    setConsultants(prev => prev.map(c => c.id === id ? { ...c, ...fields } : c));
    return {};
  };
  ```

- [ ] **Step 5: Implementare `deleteConsultant`**

  Trovare:
  ```js
  const deleteConsultant = async () => {};
  ```
  Sostituire con:
  ```js
  const deleteConsultant = async (id) => {
    await supabase.from('consultant_rates').delete().eq('consultant_id', id);
    const { error } = await supabase.from('consultants').delete().eq('id', id);
    if (error) return { error: error.message };
    setConsultants(prev => prev.filter(c => c.id !== id));
    setRates(prev => prev.filter(r => r.consultant_id !== id));
    return {};
  };
  ```

- [ ] **Step 6: Aggiungere `upsertRate`**

  Trovare:
  ```js
  const incrementRatesVersion = () => setRatesVersion(v => v + 1);
  ```
  Aggiungere subito prima:
  ```js
  const upsertRate = async (consultantId, year, { costo_aziendale, ore_max }) => {
    const costoNum = parseFloat(costo_aziendale) || 0;
    const oreNum   = parseInt(ore_max) || 0;
    const hourly_rate = oreNum > 0 ? costoNum / oreNum : 0;

    const { error } = await supabase
      .from('consultant_rates')
      .upsert(
        { consultant_id: consultantId, year, costo_aziendale: costoNum, ore_max: oreNum, hourly_rate },
        { onConflict: 'consultant_id,year' }
      );
    if (error) return { error: error.message };

    setRates(prev => {
      const exists = prev.find(r => r.consultant_id === consultantId && r.year === year);
      const updated = { consultant_id: consultantId, year, costo_aziendale: costoNum, ore_max: oreNum, hourly_rate };
      return exists
        ? prev.map(r => (r.consultant_id === consultantId && r.year === year) ? updated : r)
        : [...prev, updated];
    });
    return {};
  };
  ```

- [ ] **Step 7: Aggiornare `getHourlyRateByConsultantAndYear` e esporre `rates` + `upsertRate` nel context**

  Trovare:
  ```js
  const getHourlyRateByConsultantAndYear = () => 0;
  ```
  Sostituire con:
  ```js
  const getHourlyRateByConsultantAndYear = (consultantId, year) => {
    const r = rates.find(r => r.consultant_id === consultantId && r.year === year);
    return r?.hourly_rate || 0;
  };
  ```

  Trovare il blocco `<AuthContext.Provider value={{`:
  ```js
    addConsultant,
    updateConsultant,
    deleteConsultant,
    getConsultantHourlyRate,
    getHourlyRateByConsultantAndYear,
    incrementRatesVersion,
    cleanupStaleRatesData,
  ```
  Aggiungere `rates` e `upsertRate`:
  ```js
    addConsultant,
    updateConsultant,
    deleteConsultant,
    rates,
    upsertRate,
    getConsultantHourlyRate,
    getHourlyRateByConsultantAndYear,
    incrementRatesVersion,
    cleanupStaleRatesData,
  ```

- [ ] **Step 8: Commit**

  ```bash
  cd C:/Users/DZ/Hostinger
  git add src/context/AuthContext.jsx
  git commit -m "feat: implement consultant CRUD and rates loading in AuthContext"
  ```

---

## Task 3: ConsultantsPage — Blocco A (anagrafica) + Blocco B (storico tariffe)

**Files:**
- Modify: `src/pages/ConsultantsPage.jsx`

- [ ] **Step 1: Riscrivere `ConsultantsPage.jsx`**

  Sostituire tutto il contenuto del file con:

  ```jsx
  import React, { useState } from 'react';
  import AdminLayout from '@/components/AdminLayout';
  import { useAuth } from '@/context/AuthContext';
  import { useToast } from '@/components/ui/use-toast';
  import { Button } from '@/components/ui/button';
  import { Input } from '@/components/ui/input';
  import { Label } from '@/components/ui/label';
  import { Badge } from '@/components/ui/badge';
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
  import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
  import { cn } from '@/lib/utils';
  import { UserPlus, Pencil, Trash2 } from 'lucide-react';

  const MU_HOURS = 143.33;

  const STATUS_COLORS = {
    active:   'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-500',
  };

  const EMPTY_ADD_FORM = { name: '', email: '', role: 'consultant', status: 'active' };

  const ConsultantsPage = () => {
    const { consultants, rates, addConsultant, updateConsultant, deleteConsultant, upsertRate } = useAuth();
    const { toast } = useToast();

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - 4 + i);

    // ── Dialog state ────────────────────────────────────────────────
    const [addOpen,            setAddOpen]            = useState(false);
    const [editingConsultant,  setEditingConsultant]  = useState(null);
    const [deletingConsultant, setDeletingConsultant] = useState(null);

    const [addForm,  setAddForm]  = useState(EMPTY_ADD_FORM);
    const [editForm, setEditForm] = useState({});

    // ── Cell draft state for inline rate editing ─────────────────────
    // key: `${consultantId}_${year}`  value: { costo_aziendale, ore_max }
    const [cellDraft, setCellDraft] = useState({});

    // ── Helpers ─────────────────────────────────────────────────────
    const getRateForYear = (consultantId, year) =>
      rates.find(r => r.consultant_id === consultantId && r.year === year);

    const getDraft = (consultantId, year) => {
      const key  = `${consultantId}_${year}`;
      const rate = getRateForYear(consultantId, year);
      return cellDraft[key] ?? {
        costo_aziendale: rate?.costo_aziendale ?? '',
        ore_max:         rate?.ore_max         ?? '',
      };
    };

    const updateDraft = (consultantId, year, field, value) => {
      const key = `${consultantId}_${year}`;
      setCellDraft(prev => ({
        ...prev,
        [key]: { ...getDraft(consultantId, year), [field]: value },
      }));
    };

    // ── Handlers ────────────────────────────────────────────────────
    const handleAddSave = async () => {
      if (!addForm.name.trim()) {
        toast({ title: 'Errore', description: 'Il nome è obbligatorio', variant: 'destructive' });
        return;
      }
      const result = await addConsultant(addForm);
      if (result.error) {
        toast({ title: 'Errore', description: result.error, variant: 'destructive' });
        return;
      }
      toast({ title: `Consulente ${addForm.name} aggiunto` });
      setAddForm(EMPTY_ADD_FORM);
      setAddOpen(false);
    };

    const handleEditSave = async () => {
      if (!editForm.name?.trim()) {
        toast({ title: 'Errore', description: 'Il nome è obbligatorio', variant: 'destructive' });
        return;
      }
      const result = await updateConsultant(editingConsultant.id, editForm);
      if (result.error) {
        toast({ title: 'Errore', description: result.error, variant: 'destructive' });
        return;
      }
      toast({ title: 'Consulente aggiornato' });
      setEditingConsultant(null);
    };

    const handleDeleteConfirm = async () => {
      const result = await deleteConsultant(deletingConsultant.id);
      if (result.error) {
        toast({ title: 'Errore', description: result.error, variant: 'destructive' });
        setDeletingConsultant(null);
        return;
      }
      toast({ title: `${deletingConsultant.name} eliminato` });
      setDeletingConsultant(null);
    };

    const handleCellBlur = async (consultantId, year) => {
      const draft = getDraft(consultantId, year);
      const costo = parseFloat(draft.costo_aziendale) || 0;
      const ore   = parseInt(draft.ore_max)           || 0;
      if (costo === 0 && ore === 0) return; // nessun valore, non salvare
      const result = await upsertRate(consultantId, year, { costo_aziendale: costo, ore_max: ore });
      if (result.error) {
        toast({ title: 'Errore salvataggio tariffa', description: result.error, variant: 'destructive' });
      }
      // remove draft so cell re-reads from rates state
      setCellDraft(prev => {
        const next = { ...prev };
        delete next[`${consultantId}_${year}`];
        return next;
      });
    };

    // ── Render ──────────────────────────────────────────────────────
    return (
      <AdminLayout>
        <div className="space-y-8">

          {/* ── Blocco A: Anagrafica ── */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Consulenti</h1>
                <p className="text-sm text-gray-500 mt-0.5">Gestione anagrafica e tariffe</p>
              </div>
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => { setAddForm(EMPTY_ADD_FORM); setAddOpen(true); }}
              >
                <UserPlus className="w-4 h-4 mr-1.5" />+ Consulente
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {consultants.map(c => (
                <div key={c.id} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{c.name}</p>
                    {c.role && <p className="text-xs text-gray-400 mt-0.5 capitalize">{c.role}</p>}
                    <span className={cn('text-[11px] px-2 py-0.5 rounded-full mt-1.5 inline-block font-medium', STATUS_COLORS[c.status] || STATUS_COLORS.inactive)}>
                      {c.status || 'active'}
                    </span>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={() => { setEditingConsultant(c); setEditForm({ name: c.name, email: c.email || '', role: c.role || 'consultant', status: c.status || 'active' }); }}
                      className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                      title="Modifica"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingConsultant(c)}
                      className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                      title="Elimina"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Blocco B: Storico Tariffe ── */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Storico Tariffe per Anno</h2>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left font-medium text-gray-700 border-r border-gray-200 min-w-[160px]">
                      Consulente
                    </th>
                    {years.map(year => (
                      <th key={year} colSpan={4} className="px-2 py-3 text-center font-semibold text-gray-700 border-r border-gray-200 last:border-0">
                        {year}
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-gray-50/50 border-b border-gray-200 text-[11px] text-gray-500">
                    <th className="sticky left-0 bg-gray-50/50 px-4 py-2 border-r border-gray-200" />
                    {years.flatMap(year =>
                      ['Costo Az. €', 'Ore Max', 'MU', 'Tariffa €'].map(h => (
                        <th key={`${year}-${h}`} className="px-2 py-2 text-center font-normal border-r border-gray-200 last:border-0 min-w-[72px]">
                          {h}
                        </th>
                      ))
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {consultants.map((c, idx) => (
                    <tr key={c.id} className={cn('hover:bg-yellow-50/20 transition-colors', idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30')}>
                      <td className="sticky left-0 bg-inherit px-4 py-2 font-medium text-gray-900 border-r border-gray-200 text-sm">
                        {c.name}
                      </td>
                      {years.flatMap(year => {
                        const draft   = getDraft(c.id, year);
                        const costo   = parseFloat(draft.costo_aziendale) || 0;
                        const ore     = parseInt(draft.ore_max)           || 0;
                        const mu      = ore > 0 ? (ore / MU_HOURS).toFixed(2) : '—';
                        const tariffa = ore > 0 && costo > 0 ? (costo / ore).toFixed(2) : '—';

                        return [
                          <td key={`${year}-costo`} className="px-1 py-1 border-r border-gray-200">
                            <input
                              type="number"
                              className="w-full px-1.5 py-1 text-xs text-center rounded border border-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none bg-transparent"
                              value={draft.costo_aziendale}
                              onChange={e => updateDraft(c.id, year, 'costo_aziendale', e.target.value)}
                              onBlur={() => handleCellBlur(c.id, year)}
                              placeholder="—"
                            />
                          </td>,
                          <td key={`${year}-ore`} className="px-1 py-1 border-r border-gray-200">
                            <input
                              type="number"
                              className="w-full px-1.5 py-1 text-xs text-center rounded border border-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none bg-transparent"
                              value={draft.ore_max}
                              onChange={e => updateDraft(c.id, year, 'ore_max', e.target.value)}
                              onBlur={() => handleCellBlur(c.id, year)}
                              placeholder="—"
                            />
                          </td>,
                          <td key={`${year}-mu`} className="px-2 py-2 text-center text-xs text-gray-500 border-r border-gray-200">
                            {mu}
                          </td>,
                          <td key={`${year}-tariffa`} className="px-2 py-2 text-center text-xs text-gray-500 border-r border-gray-200 last:border-0">
                            {tariffa}
                          </td>,
                        ];
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              MU = Ore Max ÷ 143,33 &nbsp;·&nbsp; Tariffa = Costo Az. ÷ Ore Max &nbsp;·&nbsp; Modifiche salvate automaticamente all'uscita dalla cella
            </p>
          </div>

        </div>

        {/* ── Dialog: Aggiungi consulente ── */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader><DialogTitle>Aggiungi Consulente</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label>Nome completo *</Label>
                <Input value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} placeholder="es. Mario Rossi" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={addForm.email} onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))} placeholder="mario.rossi@example.com" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Ruolo</Label>
                  <Select value={addForm.role} onValueChange={v => setAddForm(p => ({ ...p, role: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consultant">Consultant</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Stato</Label>
                  <Select value={addForm.status} onValueChange={v => setAddForm(p => ({ ...p, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Attivo</SelectItem>
                      <SelectItem value="inactive">Inattivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setAddOpen(false)}>Annulla</Button>
              <Button onClick={handleAddSave}>Aggiungi</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Dialog: Modifica consulente ── */}
        <Dialog open={!!editingConsultant} onOpenChange={open => !open && setEditingConsultant(null)}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader><DialogTitle>Modifica Consulente</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label>Nome completo *</Label>
                <Input value={editForm.name || ''} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={editForm.email || ''} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Ruolo</Label>
                  <Select value={editForm.role || 'consultant'} onValueChange={v => setEditForm(p => ({ ...p, role: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consultant">Consultant</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Stato</Label>
                  <Select value={editForm.status || 'active'} onValueChange={v => setEditForm(p => ({ ...p, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Attivo</SelectItem>
                      <SelectItem value="inactive">Inattivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditingConsultant(null)}>Annulla</Button>
              <Button onClick={handleEditSave}>Salva</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Dialog: Conferma eliminazione ── */}
        {deletingConsultant && (
          <Dialog open={!!deletingConsultant} onOpenChange={() => setDeletingConsultant(null)}>
            <DialogContent className="sm:max-w-[360px]">
              <DialogHeader>
                <DialogTitle>Eliminare {deletingConsultant.name}?</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-gray-600 py-2">
                Verranno cancellate anche tutte le tariffe associate. Le allocazioni nei progetti rimarranno.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeletingConsultant(null)}>Annulla</Button>
                <Button variant="destructive" onClick={handleDeleteConfirm}>Elimina</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

      </AdminLayout>
    );
  };

  export default ConsultantsPage;
  ```

- [ ] **Step 2: Commit**

  ```bash
  cd C:/Users/DZ/Hostinger
  git add src/pages/ConsultantsPage.jsx
  git commit -m "feat: build consultants page with anagrafica and storico tariffe"
  ```

---

## Task 4: Build e verifica

**Files:** nessuna modifica

- [ ] **Step 1: Build**

  ```bash
  cd C:/Users/DZ/Hostinger
  npm run build
  ```

  Atteso: exit 0, nessun errore. Se compaiono errori su `upsertRate` o `rates` non definiti, verificare che il Task 2 Step 7 abbia aggiunto entrambi al `value` del Provider.

- [ ] **Step 2: Commit finale**

  ```bash
  git add src/context/AuthContext.jsx src/pages/ConsultantsPage.jsx
  git commit -m "feat: consultants page complete with CRUD and yearly rates table"
  ```

  (Solo se ci sono file non ancora committati dopo i task precedenti.)
