# Export Excel Piano Progetto – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere un tasto "Esporta Excel" nella pagina progetto che scarica un file `.xlsx` con testata progetto, riepilogo Venduto vs Pianificato e tabella completa dei periodi.

**Architecture:** Nuova funzione `exportProjectPlan` in `excelExporter.js` (stesso pattern delle funzioni esistenti). Tasto nell'header card di `ProjectDetail` in `ProjectManagement.jsx`. Nessun nuovo file, nessuna chiamata DB.

**Tech Stack:** `xlsx` (SheetJS ^0.18.5, già installato), React, lucide-react

---

## File coinvolti

- **Modify:** `src/lib/excelExporter.js` — aggiungere `exportProjectPlan`
- **Modify:** `src/pages/ProjectManagement.jsx` — aggiungere import, handler e tasto

---

## Task 1: Aggiungere `exportProjectPlan` in `excelExporter.js`

**Files:**
- Modify: `src/lib/excelExporter.js`

- [ ] **Step 1: Aprire `src/lib/excelExporter.js` e aggiungere la funzione in fondo al file**

  Aggiungere dopo l'ultima funzione esistente (`exportSingleProjectExpenses`):

  ```js
  /**
   * Exports the project allocation plan: header, sold-vs-planned summary, and periods table.
   */
  export const exportProjectPlan = ({ project, periods, consultants, allocMap, costsMap, ratesMap, totals, ovhRate }) => {
    const wb = XLSX.utils.book_new();
    const MU_HOURS = 143.33;
    const n2 = v => parseFloat((v || 0).toFixed(2));

    // ── Blocco 1: Testata progetto ───────────────────────────────
    const headerRows = [
      ['Nome',           project.name            || '—'],
      ['Cliente',        project.client          || '—'],
      ['Tipo',           project.type            || '—'],
      ['Stato',          project.status          || '—'],
      ['Inizio',         project.start_date      || '—'],
      ['Fine',           project.end_date        || '—'],
      ['Durata',         project.duration_months != null ? `${project.duration_months} mesi` : '—'],
      ['MU Venduti',     project.sold_person_months ?? '—'],
      ['Valore Venduto', project.total_value     ?? '—'],
      [],
    ];

    // ── Blocco 2: Venduto vs Pianificato ─────────────────────────
    const soldMU    = parseFloat(project.sold_person_months) || 0;
    const soldValue = parseFloat(project.total_value)        || 0;
    const planMU    = totals.totMU;
    const planValue = totals.costiPersonale;

    const vvpRows = [
      ['',           'Venduti',        'Pianificati',    'Delta'],
      ['Mesi (MU)',  n2(soldMU),       n2(planMU),       n2(planMU - soldMU)],
      ['Valore (€)', n2(soldValue),    n2(planValue),    n2(planValue - soldValue)],
      [],
    ];

    // ── Blocco 3: Tabella periodi ────────────────────────────────
    const ovhPct = Math.round((ovhRate || 0.25) * 100);

    const tableHeader = [
      'Periodo',
      'Durata (mesi)',
      ...consultants.map(c => c.name),
      'Tot MU',
      'Costo Int. €',
      'Costo Ext. €',
      'Costi Pers. €',
      'Travel €',
      'Other €',
      'Subcontr. €',
      '3rd Part. €',
      'Tot Diretti €',
      `Overhead ${ovhPct}% €`,
      'Gran Totale €',
    ];

    const tableRows = periods.map(period => {
      const pa    = allocMap[period.id] || {};
      const costs = costsMap[period.id] || {};

      let totalHours = 0, costoInterno = 0;
      consultants.forEach(c => {
        const h = pa[c.id]?.hours || 0;
        totalHours   += h;
        costoInterno += h * (ratesMap[c.id]?.[period.year] || 0);
      });

      const totMU          = totalHours / MU_HOURS;
      const costoEsterno   = costs.external_cost  || 0;
      const costiPersonale = costoInterno + costoEsterno;
      const travel         = costs.travel          || 0;
      const otherCosts     = costs.other_costs     || 0;
      const subcontr       = costs.subcontracting  || 0;
      const thirdParties   = costs.third_parties   || 0;
      const totDiretti     = costiPersonale + travel + otherCosts + subcontr + thirdParties;
      const overhead       = (ovhRate || 0.25) * (costiPersonale + travel + otherCosts + thirdParties);
      const granTotale     = totDiretti + overhead;

      return [
        period.label,
        period.duration_months,
        ...consultants.map(c => n2(pa[c.id]?.hours || 0)),
        n2(totMU),
        n2(costoInterno),
        n2(costoEsterno),
        n2(costiPersonale),
        n2(travel),
        n2(otherCosts),
        n2(subcontr),
        n2(thirdParties),
        n2(totDiretti),
        n2(overhead),
        n2(granTotale),
      ];
    });

    const totalRow = [
      'TOTALE',
      '',
      ...consultants.map(c => n2(totals.cTot?.[c.id] || 0)),
      n2(totals.totMU),
      n2(totals.costoInterno),
      n2(totals.costoEsterno),
      n2(totals.costiPersonale),
      n2(totals.travel),
      n2(totals.otherCosts),
      n2(totals.subcontr),
      n2(totals.thirdParties),
      n2(totals.totDiretti),
      n2(totals.overhead),
      n2(totals.granTotale),
    ];

    // ── Assemble sheet ───────────────────────────────────────────
    const ws = XLSX.utils.aoa_to_sheet([
      ...headerRows,
      ...vvpRows,
      tableHeader,
      ...tableRows,
      totalRow,
    ]);

    XLSX.utils.book_append_sheet(wb, ws, 'Piano Progetto');

    const safeName = (project.name || 'Project').replace(/[^a-z0-9]/gi, '_');
    const dateStr  = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `${safeName}_Piano_${dateStr}.xlsx`);
  };
  ```

- [ ] **Step 2: Verificare che non ci siano errori di sintassi**

  Il file non ha un runner di test — ispezionare visivamente che:
  - Tutti i template literal siano chiusi
  - Le parentesi graffe siano bilanciate
  - L'`export` sia presente

---

## Task 2: Aggiungere import, handler e tasto in `ProjectManagement.jsx`

**Files:**
- Modify: `src/pages/ProjectManagement.jsx`

- [ ] **Step 1: Aggiungere `FileSpreadsheet` all'import di lucide-react**

  Trovare la riga (circa riga 10):
  ```js
  import { Plus, Search, ChevronRight, Briefcase, Pencil } from 'lucide-react';
  ```

  Sostituire con:
  ```js
  import { Plus, Search, ChevronRight, Briefcase, Pencil, FileSpreadsheet } from 'lucide-react';
  ```

- [ ] **Step 2: Aggiungere l'import di `exportProjectPlan`**

  Trovare gli import esistenti in cima al file. Aggiungere dopo gli altri import:
  ```js
  import { exportProjectPlan } from '@/lib/excelExporter';
  ```

- [ ] **Step 3: Aggiungere il handler `handleExportPlan` in `ProjectDetail`**

  Nel componente `ProjectDetail`, trovare la riga dove vengono definite le variabili prima del `return` (vicino a `ovhPct`, circa riga 360):
  ```js
  const ovhPct = ((parseFloat(project.overhead_rate) || 0.25) * 100).toFixed(0);
  ```

  Aggiungere subito dopo:
  ```js
  const handleExportPlan = () => {
    exportProjectPlan({
      project,
      periods,
      consultants,
      allocMap,
      costsMap,
      ratesMap,
      totals,
      ovhRate: parseFloat(project.overhead_rate) || 0.25,
    });
  };
  ```

- [ ] **Step 4: Aggiungere il tasto nell'header card**

  Trovare nel return JSX di `ProjectDetail` il blocco con il pulsante "Modifica":
  ```jsx
  <div className="flex items-center gap-2">
    <span className={cn("text-xs px-2 py-1 rounded-full font-medium", STATUS_COLORS[project.status] || STATUS_COLORS.active)}>
      {project.status}
    </span>
    <Button
      size="sm" variant="outline"
      className="h-7 px-2 text-xs text-gray-600 border-gray-200 hover:bg-gray-50"
      onClick={() => setEditOpen(true)}
    >
      <Pencil className="w-3 h-3 mr-1" />Modifica
    </Button>
  </div>
  ```

  Sostituire con:
  ```jsx
  <div className="flex items-center gap-2">
    <span className={cn("text-xs px-2 py-1 rounded-full font-medium", STATUS_COLORS[project.status] || STATUS_COLORS.active)}>
      {project.status}
    </span>
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
  </div>
  ```

---

## Task 3: Build e commit

**Files:** nessuna modifica

- [ ] **Step 1: Eseguire il build**

  ```bash
  cd C:/Users/DZ/Hostinger
  npm run build
  ```

  Atteso: nessun errore. Se compare `FileSpreadsheet is not defined` verificare lo Step 1 del Task 2.

- [ ] **Step 2: Commit**

  ```bash
  git add src/lib/excelExporter.js src/pages/ProjectManagement.jsx
  git commit -m "feat: add Excel export button for project allocation plan"
  ```
