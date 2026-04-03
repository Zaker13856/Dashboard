# Venduto vs Pianificato – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere una card "Venduto vs Pianificato" nella pagina progetto che mostri in tempo reale il delta tra valori venduti e pianificati, sia in MU (mesi persona) che in € (costo personale).

**Architecture:** Componente locale `PlanningGauge` aggiunto direttamente in `ProjectManagement.jsx`. Nessun nuovo file, nessuna chiamata al DB — tutti i dati sono già calcolati in `totals` e `project`. Il componente viene inserito tra la header card e la tabella dei periodi.

**Tech Stack:** React, TailwindCSS, shadcn/ui (`Card`, `CardContent`), `cn` utility già importati nel file.

---

## File coinvolti

- **Modify:** `src/pages/ProjectManagement.jsx`
  - Aggiungere componente `PlanningGauge` (locale, prima di `ProjectDetail`)
  - Inserire `<PlanningGauge>` nel render di `ProjectDetail`, tra header card e tabella

---

## Task 1: Aggiungere il componente `PlanningGauge`

**Files:**
- Modify: `src/pages/ProjectManagement.jsx`

- [ ] **Step 1: Aprire `src/pages/ProjectManagement.jsx` e localizzare il punto di inserimento**

  Trovare la riga con `// ─── Project Form Dialog ──────────────────────────────────────` (circa riga 37).
  Il componente `PlanningGauge` va inserito **prima** di `ProjectFormDialog`, dopo i componenti `EditableCell` e `ProjectFormDialog` ma prima di `ProjectDetail`.

- [ ] **Step 2: Aggiungere il componente `PlanningGauge`**

  Trovare la riga con `// ─── Project Form Dialog` e inserire subito prima il seguente blocco:

  ```jsx
  // ─── Planning Gauge ────────────────────────────────────────────
  const PlanningGauge = ({ soldMU, plannedMU, soldValue, plannedValue }) => {
    const muDelta    = plannedMU - (soldMU || 0);
    const valueDelta = plannedValue - (soldValue || 0);
    const muPct      = soldMU    > 0 ? Math.min((plannedMU    / soldMU)    * 100, 100) : 0;
    const valuePct   = soldValue > 0 ? Math.min((plannedValue / soldValue) * 100, 100) : 0;
    const muOver     = plannedMU    > (soldMU    || 0);
    const valueOver  = plannedValue > (soldValue || 0);

    const GaugeBox = ({ title, sold, planned, delta, pct, isOver, soldLabel, plannedLabel, deltaLabel }) => (
      <div className="flex-1 rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-3">{title}</p>
        <div className="space-y-1 text-xs mb-3">
          <div className="flex justify-between">
            <span className="text-gray-500">Venduti:</span>
            <span className="font-semibold text-gray-700">{sold != null ? soldLabel : '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Pianificati:</span>
            <span className="font-semibold text-gray-700">{plannedLabel}</span>
          </div>
        </div>
        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden mb-2">
          <div
            className={cn('h-full rounded-full transition-all duration-500', isOver ? 'bg-red-500' : 'bg-blue-500')}
            style={{ width: `${pct}%` }}
          />
        </div>
        {sold != null && sold > 0 ? (
          <div className={cn('text-sm font-bold', isOver ? 'text-red-600' : 'text-green-600')}>
            {delta > 0 ? '+' : ''}{deltaLabel}
            <span className="ml-1.5 text-[10px] font-normal text-gray-500">
              {isOver ? 'in eccesso' : 'disponibile'}
            </span>
          </div>
        ) : (
          <div className="text-xs text-gray-400">Valore venduto non impostato</div>
        )}
      </div>
    );

    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">
            Venduto vs Pianificato
          </p>
          <div className="flex gap-3">
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
        </CardContent>
      </Card>
    );
  };
  ```

---

## Task 2: Inserire `PlanningGauge` nel render di `ProjectDetail`

**Files:**
- Modify: `src/pages/ProjectManagement.jsx` (componente `ProjectDetail`, nel return JSX)

- [ ] **Step 1: Localizzare il punto di inserimento nel render**

  Nel return JSX di `ProjectDetail` (circa riga 377), trovare la sezione:

  ```jsx
      {/* Edit dialog */}
      <ProjectFormDialog
  ```

  Il `<PlanningGauge>` va inserito **dopo** questa sezione e **prima** del blocco tabella (`{/* Table */}`).

- [ ] **Step 2: Inserire il componente**

  Sostituire:
  ```jsx
      {/* Edit dialog */}
      <ProjectFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        initial={initialFormData}
        onSave={handleEditSave}
        title="Modifica Progetto"
      />

      {/* Table */}
  ```

  Con:
  ```jsx
      {/* Edit dialog */}
      <ProjectFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        initial={initialFormData}
        onSave={handleEditSave}
        title="Modifica Progetto"
      />

      {/* Planning Gauge */}
      <PlanningGauge
        soldMU={project.sold_person_months}
        plannedMU={totals.totMU}
        soldValue={project.total_value}
        plannedValue={totals.costiPersonale}
      />

      {/* Table */}
  ```

---

## Task 3: Verifica visiva e commit

**Files:**
- Nessuna modifica — solo verifica e commit

- [ ] **Step 1: Avviare il dev server**

  ```bash
  cd C:/Users/DZ/Hostinger
  npm run dev
  ```

- [ ] **Step 2: Verificare i casi**

  Aprire un progetto con `sold_person_months` e `total_value` impostati e verificare:

  1. **Pianificato < Venduto:** entrambi i box mostrano delta verde con etichetta "disponibile"
  2. **Pianificato > Venduto:** entrambi i box mostrano delta rosso con etichetta "in eccesso"
  3. **Progetto senza `sold_person_months` / `total_value`:** i box mostrano "Valore venduto non impostato" invece del delta
  4. **Modificare le ore in tabella:** i valori "Pianificati" nella card si aggiornano in tempo reale

- [ ] **Step 3: Build di produzione**

  ```bash
  npm run build
  ```

  Verificare che non ci siano errori. Poi caricare la cartella `dist/` su Hostinger.

- [ ] **Step 4: Commit**

  ```bash
  git add src/pages/ProjectManagement.jsx
  git commit -m "feat: add PlanningGauge card (venduto vs pianificato)"
  ```
