import { createClient } from '@supabase/supabase-js';

const svc = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: prj } = await svc.from('projects').select('id,name').ilike('name', '%roads4all%');
const PROJ = prj[0].id;
const { data: cons } = await svc.from('consultants').select('id,name');
const f = n => cons.find(c => c.name.toLowerCase().includes(n))?.id;
const GAGGI = f('gaggi'), ENEI = f('enei');
console.log('proj:', prj[0].name, '| gaggi:', !!GAGGI, '| enei:', !!ENEI);

const { data: del } = await svc.from('expenses').delete()
  .eq('project_id', PROJ).is('mission_id', null).select('id');
console.log('eliminate:', del.length);

const M = [
  { c: GAGGI, place: 'Salonicco', from: '2025-07-09', to: '2025-07-10', with_: 'Riccardo Enei',
    voci: [['[Other] Totale viaggio', 435.70, 9.96]] },
  { c: ENEI,  place: 'Salonicco', from: '2025-07-09', to: '2025-07-10',
    voci: [['[Other] Totale viaggio', 416.36, 9.68]] },
];
for (const m of M) {
  const { data: mis, error: e1 } = await svc.from('missions').insert({
    consultant_id: m.c, project_id: PROJ, place: m.place, date_from: m.from, date_to: m.to, travelling_with: m.with_ || null,
  }).select().single();
  if (e1) { console.error('mission err:', e1.message); process.exit(1); }
  for (const [desc, amt, iva] of m.voci) {
    const elig = Math.round((amt - iva) * 100) / 100;
    const { error: e2 } = await svc.from('expenses').insert({
      project_id: PROJ, consultant_id: m.c, mission_id: mis.id, place: m.place,
      date: m.from, payment_date: m.from, payment_method: 'carta_aziendale',
      type: 'travel', amount: amt, iva: iva || null, eligible_amount: elig, description: desc,
    });
    if (e2) { console.error('voce err:', e2.message); process.exit(1); }
  }
}
console.log('missioni:', M.length, 'ok');

const O = [
  ['2026-02-11', 'Consortium dinner 11/02 - Meeting Roma', null, 782, 71.09],
  ['2026-02-11', 'Catering 2gg - Meeting Roma', 'Fatt. FPR 4/26/2026', 742.50, 67.50],
  ['2026-02-11', 'Roll Up - Meeting Roma', 'Fatt. 139/EL/2026', 143.96, 25.96],
];
for (const [date, desc, ref, amt, iva] of O) {
  const elig = Math.round((amt - iva) * 100) / 100;
  const { error } = await svc.from('expenses').insert({
    project_id: PROJ, type: 'other_cost', date, description: desc, invoice_ref: ref,
    amount: amt, iva: iva || null, eligible_amount: elig,
  });
  if (error) { console.error('other err:', error.message); process.exit(1); }
}
console.log('other: 3 ok');

const { data: chk } = await svc.from('expenses').select('type,amount,iva,eligible_amount').eq('project_id', PROJ);
const s = (fld, t) => chk.filter(e => !t || e.type === t).reduce((a, e) => a + (parseFloat(e[fld]) || 0), 0);
console.log('TOTALI -> travel:', s('amount', 'travel').toFixed(2), '(atteso 852.06) | other:', s('amount', 'other_cost').toFixed(2), '(atteso 1668.46) | elig:', s('eligible_amount').toFixed(2), '(atteso 2336.33)');
