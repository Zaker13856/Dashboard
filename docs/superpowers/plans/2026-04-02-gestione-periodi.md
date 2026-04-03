# Gestione Periodi Progetto – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere tasto "+ Periodo" e cestino per cancellare periodi nella pagina progetto, con spezzatura automatica per anno.

**Architecture:** Tutto in `ProjectManagement.jsx`. Componente locale `AddPeriodDialog` per l'inserimento. Il dialogo di conferma cancellazione usa il `Dialog` già importato. Nessun nuovo file, nessuna modifica al DB schema.

**Tech Stack:** React, Supabase (`project_periods`, `allocations`), shadcn/ui (Dialog, Select, Button, Input, Label già importati), lucide-react

---

## File coinvolti

- **Modify:** `src/pages/ProjectManagement.jsx`
  - Aggiungere `CalendarPlus`, `Trash2` all'import lucide-react
  - Aggiungere costante `MONTHS_IT` e componente `AddPeriodDialog` (scope modulo)
  - Aggiungere state `addPeriodOpen`, `deletingPeriod` in `ProjectDetail`
  - Aggiungere funzioni `addPeriod` e `deletePeriod` in `ProjectDetail`
  - Aggiungere tasto "+ Periodo" nell'header card
  - Aggiungere dialogo conferma cancellazione nel JSX
  - Aggiungere icona cestino nella colonna Periodo di ogni riga

---

## Task 1: Import, costante MONTHS_IT e componente `AddPeriodDialog`

**Files:**
- Modify: `src/pages/ProjectManagement.jsx`

- [ ] **Step 1: Aggiungere `CalendarPlus` e `Trash2` all'import lucide-react (riga 10)**

  Trovare:
  ```js
  import { Plus, Search, ChevronRight, Briefcase, Pencil, FileSpreadsheet } from 'lucide-react';
  ```
  Sostituire con:
  ```js
  import { Plus, Search, ChevronRight, Briefcase, Pencil, FileSpreadsheet, CalendarPlus, Trash2 } from 'lucide-react';
  ```

- [ ] **Step 2: Aggiungere costante `MONTHS_IT` e componente `AddPeriodDialog` prima di `ProjectFormDialog`**

  Trovare la riga con `// ─── Project Form Dialog` e inserire subito prima:

  ```jsx
  const MONTHS_IT = [
    'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
    'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre',
  ];

  // ─── Add Period Dialog ─────────────────────────────────────────
  const AddPeriodDialog = ({ open, onOpenChange, onSave }) => {
    const { toast } = useToast();
    const curYear = new Date().getFullYear();
    const [form, setForm] = useState({
      startMonth: 1, startYear: curYear,
      endMonth: 12,  endYear:  curYear,
    });
    const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

    const handleSave = () => {
      const { startMonth, startYear, endMonth, endYear } = form;
      if (endYear < startYear || (endYear === startYear && endMonth < startMonth)) {
        toast({ title: 'Errore', description: "La data di fine deve essere successiva all'inizio", variant: 'destructive' });
        return;
      }
      onSave(form);
    };

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader><DialogTitle>Aggiungi Periodo</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            <div className="space-y-1.5">
              <Label>Mese inizio</Label>
              <Select value={String(form.startMonth)} onValueChange={v => f('startMonth', parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS_IT.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Anno inizio</Label>
              <Input type="number" min="2020" max="2035" value={form.startYear}
                onChange={e => f('startYear', parseInt(e.target.value) || curYear)} />
            </div>
            <div className="space-y-1.5">
              <Label>Mese fine</Label>
              <Select value={String(form.endMonth)} onValueChange={v => f('endMonth', parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS_IT.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Anno fine</Label>
              <Input type="number" min="2020" max="2035" value={form.endYear}
                onChange={e => f('endYear', parseInt(e.target.value) || curYear)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
            <Button onClick={handleSave}>Crea Periodi</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };
  ```

---

## Task 2: State, `addPeriod`, `deletePeriod` in `ProjectDetail`

**Files:**
- Modify: `src/pages/ProjectManagement.jsx` (componente `ProjectDetail`)

- [ ] **Step 1: Aggiungere stato `addPeriodOpen` e `deletingPeriod`**

  Trovare il blocco di `useState` all'inizio di `ProjectDetail` (circa riga 270):
  ```js
  const [loading,     setLoading]     = useState(true);
  const [editOpen,    setEditOpen]    = useState(false);
  ```
  Aggiungere subito dopo:
  ```js
  const [addPeriodOpen,  setAddPeriodOpen]  = useState(false);
  const [deletingPeriod, setDeletingPeriod] = useState(null); // { id, label }
  ```

- [ ] **Step 2: Aggiungere funzione `addPeriod` dopo `handleEditSave`**

  Trovare la fine di `handleEditSave` (la funzione termina con `onProjectUpdated();`) e aggiungere subito dopo:

  ```js
  // ─── Period management ────────────────────────────────────────
  const addPeriod = async ({ startMonth, startYear, endMonth, endYear }) => {
    for (let y = startYear; y <= endYear; y++) {
      const mStart = y === startYear ? startMonth : 1;
      const mEnd   = y === endYear   ? endMonth   : 12;
      const duration_months = mEnd - mStart + 1;

      const existing = periods.filter(p => p.year === y);
      const maxN = existing.reduce((m, p) => Math.max(m, p.period_number || 0), 0);
      const period_number = maxN + 1;
      const label = `${y}_${period_number}`;

      const { error } = await supabase.from('project_periods').insert({
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
      });

      if (error) {
        toast({ title: 'Errore creazione periodo', description: error.message, variant: 'destructive' });
        return;
      }
    }
    setAddPeriodOpen(false);
    await load();
  };

  const deletePeriod = async (periodId, periodLabel) => {
    // Delete allocations first (in case no CASCADE on FK)
    await supabase.from('allocations').delete().eq('project_period_id', periodId);

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
  ```

---

## Task 3: UI — tasto "+ Periodo", dialogo conferma cancellazione, cestino per riga

**Files:**
- Modify: `src/pages/ProjectManagement.jsx` (JSX di `ProjectDetail`)

- [ ] **Step 1: Aggiungere tasto "+ Periodo" nell'header card**

  Trovare nel JSX il blocco dei bottoni (Excel + Modifica):
  ```jsx
  <Button
    size="sm" variant="outline"
    className="h-7 px-2 text-xs text-gray-600 border-gray-200 hover:bg-gray-50"
    onClick={handleExportPlan}
    title="Esporta piano in Excel"
  >
    <FileSpreadsheet className="w-3 h-3 mr-1" />Excel
  </Button>
  ```
  Aggiungere PRIMA di quel bottone:
  ```jsx
  <Button
    size="sm" variant="outline"
    className="h-7 px-2 text-xs text-gray-600 border-gray-200 hover:bg-gray-50"
    onClick={() => setAddPeriodOpen(true)}
    title="Aggiungi periodo"
  >
    <CalendarPlus className="w-3 h-3 mr-1" />+ Periodo
  </Button>
  ```

- [ ] **Step 2: Aggiungere `AddPeriodDialog` e dialogo conferma cancellazione nel JSX**

  Trovare nel JSX:
  ```jsx
      {/* Planning Gauge */}
  ```
  Aggiungere subito prima:
  ```jsx
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
  ```

- [ ] **Step 3: Aggiungere cestino nella cella periodo di ogni riga**

  Trovare nella tbody la cella con il label del periodo:
  ```jsx
  <td className="sticky left-0 bg-inherit px-3 py-1.5 font-bold text-blue-600 border-r border-gray-200">{period.label}</td>
  ```
  Sostituire con:
  ```jsx
  <td className="sticky left-0 bg-inherit px-2 py-1.5 font-bold text-blue-600 border-r border-gray-200">
    <div className="flex items-center justify-between gap-1">
      <span>{period.label}</span>
      <button
        onClick={() => setDeletingPeriod({ id: period.id, label: period.label })}
        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity p-0.5 rounded"
        title="Elimina periodo"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  </td>
  ```

  Trovare la riga `<tr>` del tbody e aggiungere `group` alla className:
  ```jsx
  <tr key={period.id} className={cn("group border-b border-gray-100 hover:bg-yellow-50/30 transition-colors", idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40')}>
  ```

---

## Task 4: Build e commit

- [ ] **Step 1: Build**

  ```bash
  cd C:/Users/DZ/Hostinger
  npm run build
  ```
  Atteso: exit 0, nessun errore.

- [ ] **Step 2: Commit**

  ```bash
  git add src/pages/ProjectManagement.jsx
  git commit -m "feat: add period creation and deletion in project detail"
  ```
