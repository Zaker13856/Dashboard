# Pagina Tender — progetto (10/11/2026)

## Perché

I Tender si vendono "a blocco": una volta acquisiti, il valore è fisso. L'admin vuole vedere,
per ogni Tender, **quante ore vere** ci mettono i consulenti (scritte da loro nel timesheet)
e **quanto si spende davvero**, confrontato con quanto venduto.
Nei progetti le ore le pianifica l'admin; nei Tender no: contano solo le ore reali.

Oggi i consulenti scrivono le ore Tender come "Tender-Sub" con una nota a mano
("CIVINET 2026", "RFI-ENAC"...) e le note spese Tender hanno anch'esse il nome a mano.
Così non si può sommare per Tender. Serve un elenco di Tender caricato dall'admin,
da cui tutti scelgono.

## Obiettivi

1. Pagina admin **Tender** (`/admin/tenders`), fatta come Progetti (`/admin/projects`):
   elenco a sinistra con ricerca, scheda a destra, "+ Nuovo Tender", Modifica, Elimina.
2. Dati del Tender (li inserisce solo l'admin): **nome, tipo, cliente, data inizio, data fine,
   valore venduto, viaggi venduti, altre spese vendute, subappalti venduti**.
   Niente mesi-uomo, niente costi generali, niente terze parti, niente tariffe.
3. Ore **vere** dei consulenti, prese dai timesheet: tabella mese per mese × consulente,
   con totali. Le caselle **non** si modificano dalla pagina admin.
   Nessun calcolo di costo del personale (ogni Tender ha tariffe sue: non interessa).
4. Speso vero contro venduto per viaggi / altre spese / subappalti, preso dalle note spese
   e dalle spese collegate a quel Tender.
5. Timesheet del consulente: nella sezione **Attività** si aggiunge un Tender scegliendolo
   da un menu con **tutti i Tender attivi**. La riga resta fissa ogni mese (come le attività
   di oggi) finché il consulente non la chiude.
6. Note spese Tender (consulente, `MissionForm`) e "Aggiungi Spesa" scheda Tender (admin):
   il Tender si **sceglie dall'elenco**.
7. Archivio: un Tender messo in "Archiviato" va nella pagina **Repository** insieme ai
   progetti archiviati (consultabile, si può ripristinare); sparisce dal menu dei consulenti
   e dai loro timesheet; ore e spese già registrate restano.

## Non obiettivi

- Spese Tender **prima del 2026**: restano come sono (senza Tender collegato). La scheda
  Tender in `/admin/expenses` continua a funzionare come oggi per gli anni passati.
- Promozione: non si tocca.
- Nessun Excel della pagina Tender in questa prima versione (si può aggiungere dopo).
- Le attività "Proposta", "Consulenza", "Altro" restano a nota libera.

## Da evitare (sarebbe un fallimento anche se funziona)

- Mettere i Tender dentro la tabella `projects` o come finti progetti: comparirebbero nel
  cruscotto, nei report, nelle allocazioni, nell'elenco progetti del timesheet.
- Far scrivere ai consulenti il nome del Tender a mano.
- Toccare dati senza elenco preciso + "sì procedi" dell'utente + backup.

## Come (deciso con l'utente)

- Solo l'admin crea i Tender; i consulenti li trovano nell'elenco.
- Ore = solo quelle dei timesheet dei consulenti.
- Archiviato → Repository.

## Dati iniziali (dopo ok dell'utente sull'elenco preciso, con backup prima)

- Creare il Tender **CIVINET 2026** (nome modificabile; valore e date li mette l'utente).
- L'utente crea a mano **RFI-ENAC** e **FOD Automotive** (con valore e date).
- Collegare le ore 2026 già scritte come Tender-Sub:
  - "CIVINET 2026": Proietti (gen 16, feb 8, mar 16, apr 12), Cali (feb 16), Ceci (mag 8) = 76 h
  - "RFI-ENAC": Enei (mar 16, apr 24) = 40 h — quando l'utente avrà creato il Tender
  - "FOD Automotive": Enei (apr 8) = 8 h — idem
  - e le relative righe attive in `consultant_activities` (Proietti, Ceci, Cali, Enei ×2).
- "Framework FOD2 - coordination" (Giuffrè) **non** è un Tender: resta Tender-Sub com'è.
- Collegare a CIVINET 2026 le 7 spese 2026: Russano acconto 700 € (28/05), Russano saldo
  1.500 € (27/07), 5 righe della nota spese "CIVINET Italia" del 02/07 (e la nota stessa).

## Lasciato a chi costruisce (scelte mie, da far vedere all'utente)

- **Tabella nuova `tenders`** (id, name, type, client, start_date, end_date, total_value,
  sold_travel, sold_other_costs, sold_subcontracting, status 'active'|'archived', created_at).
  Lettura per tutti gli utenti loggati, scrittura solo admin (stesse regole di `projects`).
- Colonna `tender_id` (può essere vuota) su `timesheets`, `consultant_activities`,
  `missions`, `expenses`. **Fatto (10/11):** le ore Tender restano `activity_type = 'tender_sub'`
  con `activity_note` = nome del Tender e in più `tender_id`: così il sito vecchio continua a
  funzionare finché non si pubblica, e Excel/viste admin mostrano il nome giusto.
  Verificato: `timesheets` non ha vincoli di unicità su consulente/data/tipo.
  Note spese Tender: `cost_center_note` = nome del Tender + `tender_id`.
- "Tender-Sub" sparisce dal menu "+ Nuova attività"; le righe Tender-Sub esistenti restano
  visibili e funzionanti.
- Tipo del Tender: stesso elenco dei progetti (HORIZON / NATIONAL / PRIVATE / OTHER).
- Stato del Tender: solo Attivo / Archiviato.
- Righe della tabella ore: i mesi da data inizio a data fine; se mancano le date, i mesi
  che hanno ore. Ore mostrate anche in giorni (ore/8) come nell'Excel del timesheet.
- Pagina admin Timesheet (`/admin/timesheets`) ed Excel del timesheet: le righe
  `tender` mostrano il nome del Tender (non "tender").
- Note spese consulente: con centro di costo Tender, campo obbligatorio "Tender" (menu
  Tender attivi); il vecchio campo "Di cosa si tratta" resta facoltativo. Email ed Excel
  della nota mostrano "TENDER – <nome Tender>".
- "Elimina" un Tender è possibile solo se non ha ore né spese collegate; altrimenti si archivia.
- Repository: nuova sezione "Tender archiviati" sotto i progetti, con "Ripristina".
- Voce "Tender" nel menu laterale admin, subito sotto "Progetti".
- SQL e pubblicazione sul sito: sempre dopo ok esplicito dell'utente.
