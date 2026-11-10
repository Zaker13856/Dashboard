-- Tender: elenco caricato dall'admin, collegato a timesheet, attività e note spese
-- Le ore Tender restano activity_type = 'tender_sub' (compatibile con la versione vecchia del sito)
-- e in più hanno tender_id.

create table if not exists public.tenders (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  type                text,
  client              text,
  start_date          date,
  end_date            date,
  total_value         numeric,
  sold_travel         numeric,
  sold_other_costs    numeric,
  sold_subcontracting numeric,
  status              text not null default 'active' check (status in ('active','archived')),
  created_at          timestamptz default now()
);

alter table public.tenders enable row level security;

drop policy if exists tenders_select on public.tenders;
drop policy if exists tenders_insert on public.tenders;
drop policy if exists tenders_update on public.tenders;
drop policy if exists tenders_delete on public.tenders;
create policy tenders_select on public.tenders for select using (auth.uid() is not null);
create policy tenders_insert on public.tenders for insert with check (is_admin());
create policy tenders_update on public.tenders for update using (is_admin());
create policy tenders_delete on public.tenders for delete using (is_admin());

-- Collegamenti (vuoti = come prima). "restrict": non si cancella un Tender con ore o spese
alter table public.timesheets            add column if not exists tender_id uuid references public.tenders(id) on delete restrict;
alter table public.consultant_activities add column if not exists tender_id uuid references public.tenders(id) on delete restrict;
alter table public.missions              add column if not exists tender_id uuid references public.tenders(id) on delete restrict;
alter table public.expenses              add column if not exists tender_id uuid references public.tenders(id) on delete restrict;

create index if not exists idx_timesheets_tender on public.timesheets(tender_id);
create index if not exists idx_expenses_tender   on public.expenses(tender_id);
