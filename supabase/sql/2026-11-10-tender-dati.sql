-- Dati iniziali Tender (10/11/2026, autorizzato dall'utente). Backup: backups/2026-11-10T15-46-52
-- Valore, tipo, cliente e date li compila l'utente dalla pagina Tender.

insert into public.tenders (name)
select n from (values ('CIVINET 2026'), ('RFI-ENAC'), ('FOD Automotive')) v(n)
where not exists (select 1 from public.tenders t where t.name = v.n);

-- Ore 2026 scritte come Tender-Sub con nota a mano
update public.timesheets ts set tender_id = t.id
from public.tenders t
where ts.activity_type = 'tender_sub' and ts.tender_id is null
  and ((ts.activity_note = 'CIVINET 2026'   and t.name = 'CIVINET 2026')
    or (ts.activity_note = 'RFI-ENAC'       and t.name = 'RFI-ENAC')
    or (ts.activity_note = 'FOD Aotomotive' and t.name = 'FOD Automotive'));

-- Righe fisse nei timesheet dei consulenti
update public.consultant_activities a set tender_id = t.id
from public.tenders t
where a.activity_type = 'tender_sub' and a.tender_id is null
  and ((a.activity_note = 'CIVINET 2026'   and t.name = 'CIVINET 2026')
    or (a.activity_note = 'RFI-ENAC'       and t.name = 'RFI-ENAC')
    or (a.activity_note = 'FOD Aotomotive' and t.name = 'FOD Automotive'));

-- Nota spese "CIVINET Italia" (luglio 2026) e tutte le spese Tender 2026 (sono tutte CIVINET)
update public.missions m set tender_id = t.id
from public.tenders t
where t.name = 'CIVINET 2026' and m.cost_center = 'tender' and m.date_from >= '2026-01-01' and m.tender_id is null;

update public.expenses e set tender_id = t.id
from public.tenders t
where t.name = 'CIVINET 2026' and e.cost_center = 'tender' and e.date >= '2026-01-01' and e.tender_id is null;

-- Controllo
select t.name,
  (select coalesce(sum(hours),0) from public.timesheets where tender_id = t.id) as ore,
  (select count(*) from public.consultant_activities where tender_id = t.id) as righe_fisse,
  (select count(*) from public.missions where tender_id = t.id) as note_spese,
  (select count(*) from public.expenses where tender_id = t.id) as spese,
  (select coalesce(sum(amount),0) from public.expenses where tender_id = t.id) as euro
from public.tenders t order by t.name;

-- Nome scritto a mano allineato al nome del Tender (es. 'FOD Aotomotive' -> 'FOD Automotive')
update public.timesheets ts set activity_note = t.name from public.tenders t where ts.tender_id = t.id and ts.activity_note is distinct from t.name;
update public.consultant_activities a set activity_note = t.name from public.tenders t where a.tender_id = t.id and a.activity_note is distinct from t.name;
