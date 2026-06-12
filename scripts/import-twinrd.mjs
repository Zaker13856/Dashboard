import { createClient } from '@supabase/supabase-js';

const svc = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: prj } = await svc.from('projects').select('id,name').ilike('name', '%twin%');
const PROJ = prj[0].id;
const { data: cons } = await svc.from('consultants').select('id,name');
const CASSOLA = cons.find(c => c.name.toLowerCase().includes('cassola'))?.id;
console.log('proj:', prj[0].name, '| cassola:', !!CASSOLA);

const { data: del } = await svc.from('expenses').delete()
  .eq('project_id', PROJ).is('mission_id', null).select('id');
console.log('eliminate:', del.length);

// missione Atene KOM
const { data: mis, error: e1 } = await svc.from('missions').insert({
  consultant_id: CASSOLA, project_id: PROJ, place: 'Atene - KOM',
  date_from: '2024-02-01', date_to: '2024-02-01',
}).select().single();
if (e1) { console.error(e1.message); process.exit(1); }
const { error: e2 } = await svc.from('expenses').insert({
  project_id: PROJ, consultant_id: CASSOLA, mission_id: mis.id, place: 'Atene - KOM',
  date: '2024-02-01', payment_date: '2024-02-01', payment_method: 'carta_aziendale',
  type: 'travel', amount: 377.40, eligible_amount: 377.40, description: '[Other] Totale viaggio',
});
if (e2) { console.error(e2.message); process.exit(1); }
console.log('missione: 1 ok');

const O = [
  ['2023-03-18', 'acquisto LOGO', null, 87.99, 0],
  ['2023-12-31', 'sito internet - Andrea Borzi', null, 1000, 0],
  ['2023-12-31', "ritenuta d'acconto (pagherà CONFOR)", null, 250, 0],
  ['2023-12-31', 'IUBENDA licenza cookies', null, 27, 4.87],
  ['2024-12-31', 'Other goods - Carlo', null, 116.42, 0],
  ['2024-11-13', 'Other goods - Carlo', null, 32, 0],
  ['2024-12-30', 'Other goods - Carlo', null, 26.59, 0],
  ['2025-03-11', 'aruba hosting wordpress', 'fatt. 1000253001866024', 44.99, 0],
  ['2025-03-26', 'Other goods - Carlo', null, 28.49, 0.83],
  ['2025-05-05', 'Other goods - Carlo', null, 29.91, 0],
  ['2025-06-25', 'IUBENDA licenza cookies', 'fatt. 179679/2025', 27, 4.87],
  ['2025-03-26', 'Other goods - Carlo', null, 21.50, 0.83],
  ['2025-05-09', 'Other goods - Carlo', null, 22.14, 0],
  ['2025-07-28', 'Other goods - Carlo', null, 18.99, 0],
  ['2025-10-23', 'Other goods - Carlo', null, 19.98, 0],
  ['2025-11-30', 'Other goods - Carlo', null, 9.99, 0],
  ['2025-12-07', 'Other goods - Carlo', null, 16.85, 0],
  ['2026-03-11', 'aruba hosting wordpress', 'fatt. 0337/2026', 60.99, 11],
  ['2026-07-15', 'Other goods - Carlo', null, 79.82, 0],
];
for (const [date, desc, ref, amt, iva] of O) {
  const elig = Math.round((amt - iva) * 100) / 100;
  const { error } = await svc.from('expenses').insert({
    project_id: PROJ, type: 'other_cost', date, description: desc, invoice_ref: ref,
    amount: amt, iva: iva || null, eligible_amount: elig,
  });
  if (error) { console.error('other err:', desc, error.message); process.exit(1); }
}
console.log('other:', O.length, 'ok');

const { data: chk } = await svc.from('expenses').select('type,amount,iva,eligible_amount').eq('project_id', PROJ);
const s = (fld, t) => chk.filter(e => !t || e.type === t).reduce((a, e) => a + (parseFloat(e[fld]) || 0), 0);
console.log('TOTALI -> travel:', s('amount', 'travel').toFixed(2), '(atteso 377.40) | other:', s('amount', 'other_cost').toFixed(2), '(atteso 1920.65) | elig:', s('eligible_amount').toFixed(2), '(atteso 2275.65)');
