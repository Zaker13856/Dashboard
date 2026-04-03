# Design: Consultants Page

**Data:** 2026-04-02
**Feature:** Pagina Consultants — anagrafica admin + storico tariffe + timesheet separato
**File coinvolti:**
- `src/pages/ConsultantsPage.jsx` — rebuild da stub
- `src/context/AuthContext.jsx` — implementare CRUD consulenti + rates
- `src/components/AdminConsultantForm.jsx` — aggiornare per nuovi campi rates
- `src/components/ConsultantCard.jsx` — aggiornare per costo_aziendale / ore_max

---

## Obiettivo

Costruire la pagina Consultants con due blocchi:
1. **Anagrafica** — lista consulenti con CRUD completo (admin)
2. **Storico Tariffe** — tabella per anno con Costo Az., Ore Max, MU (calcolato), Tariffa € (calcolata)

Il consulente autenticato non accede a questa pagina — è solo per admin.

---

## Flusso utente

1. Admin apre pagina Consultants
2. Vede lista consulenti + tabella storico tariffe
3. Aggiunge/modifica/cancella consulenti dal blocco Anagrafica
4. Modifica i valori annuali (Costo Az., Ore Max) direttamente nelle celle della tabella Storico Tariffe

---

## Layout pagina

### Blocco A — Anagrafica (in alto)

- Header con titolo "Consulenti" e pulsante "+ Consulente"
- Griglia di card compatte: nome, ruolo, stato (badge), icone Pencil + Trash2
- Click Pencil → dialog modifica (nome, ruolo, stato)
- Click Trash2 → dialog conferma → delete consulente + tariffe associate
- Click "+ Consulente" → dialog form (nome, ruolo, stato, email)

### Blocco B — Storico Tariffe (in basso)

- Finestra mobile di **5 anni**: da `currentYear - 4` a `currentYear` (es. 2022–2026 nel 2026)
- Tabella: righe = consulenti, colonne = gruppi per anno
- Per ogni anno, 4 sotto-colonne: `Costo Az. €` | `Ore Max` | `MU` | `Tariffa €`
- `MU` = Ore Max ÷ 143.33 (calcolato, read-only)
- `Tariffa €` = Costo Az. ÷ Ore Max (calcolato, read-only)
- `Costo Az.` e `Ore Max` → editabili inline (click → input numerico, salva on blur)
- Se non esiste riga per quell'anno → celle vuote, editabili per inserire nuovi dati

---

## Modello dati

### `consultant_rates` — aggiunte colonne

```sql
ALTER TABLE consultant_rates ADD COLUMN costo_aziendale numeric DEFAULT 0;
ALTER TABLE consultant_rates ADD COLUMN ore_max integer DEFAULT 0;
```

`hourly_rate` rimane e viene **ricalcolato** al salvataggio:
```
hourly_rate = costo_aziendale / ore_max   (0 se ore_max = 0)
```

`mesi_uomo` e `tariffa_oraria` non vengono mai salvati — calcolati in frontend.

### `consultants` — nessuna modifica schema

Campi esistenti utilizzati: `id`, `name`, `role`, `status`, `email`.

---

## Operazioni dati (AuthContext)

### Funzioni da implementare

| Funzione | Operazione DB |
|---|---|
| `addConsultant({ name, role, status, email })` | INSERT `consultants` |
| `updateConsultant(id, fields)` | UPDATE `consultants` |
| `deleteConsultant(id)` | DELETE `consultant_rates` WHERE consultant_id=id, poi DELETE `consultants` |
| `upsertRate(consultantId, year, { costo_aziendale, ore_max })` | UPSERT `consultant_rates` con hourly_rate calcolato |
| `deleteRate(consultantId, year)` | DELETE riga `consultant_rates` |

### Caricamento dati

Il `load()` esistente carica già `consultants`. Aggiungere caricamento di `consultant_rates` filtrato sulla finestra 5 anni:
```js
const yearFrom = currentYear - 4;
const { data } = await supabase
  .from('consultant_rates')
  .select('*')
  .gte('year', yearFrom);
```

Esporre `rates` (array) dallo stesso AuthContext.

---

## Interazioni UI dettagliate

### Dialog "+ Consulente" / Modifica

Campi: Nome, Ruolo (text), Stato (Select: active/inactive), Email

### Editing inline tariffe

- Click su cella `Costo Az.` o `Ore Max` → diventa `<input type="number">`
- On blur → chiama `upsertRate(consultantId, year, { costo_aziendale, ore_max })`
- Se entrambi i valori sono 0 dopo il salvataggio → non mostrare MU e Tariffa
- MU e Tariffa si aggiornano in tempo reale mentre si digita (prima del blur)

### Conferma cancellazione consulente

Dialog: "Eliminare {nome}? Verranno cancellate anche tutte le tariffe associate."
Le allocazioni esistenti nei progetti rimangono (non si cancellano i dati storici).

---

## Scope

- Solo `ConsultantsPage.jsx`, `AuthContext.jsx`, `AdminConsultantForm.jsx`, `ConsultantCard.jsx`
- Nessuna nuova pagina (il Timesheet consulente è fuori scope — design separato)
- Nessuna modifica a tabelle DB tranne le 2 colonne su `consultant_rates`
- Admin only — nessuna logica di ruolo aggiuntiva per questa pagina
