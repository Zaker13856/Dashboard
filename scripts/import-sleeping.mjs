import { createClient } from '@supabase/supabase-js';

const svc = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: prj } = await svc.from('projects').select('id,name').ilike('name', '%sleeping%');
const PROJ = prj[0].id;
const { data: cons } = await svc.from('consultants').select('id,name');
const f = n => cons.find(c => c.name.toLowerCase().includes(n))?.id;
const CASSOLA = f('cassola'), GUALDI = f('gualdi');
console.log('proj:', prj[0].name, '| cassola:', !!CASSOLA, '| gualdi:', !!GUALDI);

const { data: del } = await svc.from('expenses').delete()
  .eq('project_id', PROJ).is('mission_id', null).select('id');
console.log('eliminate:', del.length);

const M = [
  { c: CASSOLA, place: 'Vienna',  from: '2025-06-04', to: '2025-06-06',
    voci: [['[Other] Totale viaggio', 231.08, 1.32]] },
  { c: GUALDI,  place: 'Vienna',  from: '2025-06-04', to: '2025-06-06', with_: 'Daniel Cassolà',
    voci: [['[Other] Totale viaggio', 1022.48, 5.78]] },
  { c: CASSOLA, place: 'Bolzano', from: '2025-11-11', to: '2025-11-13', with_: 'Mario Gualdi',
    voci: [['[Other] Totale viaggio - Gualdi non presente per motivi di salute, spesa hotel non rimborsabile (414,20 euro)', 1015.10, 82.84]] },
];
for (const m of M) {
  const { data: mis, error: e1 } = await svc.from('missions').insert({
    consultant_id: m.c, project_id: PROJ, place: m.place, date_from: m.from, date_to: m.to, travelling_with: m.with_ || null,
  }).select().single();
  if (e1) { console.error('mission err:', m.place, e1.message); process.exit(1); }
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

// WorldLabs -> subcontract
const S = [
  ['2025-12-09', 'WorldLabs Ltd - First payment 50%', 'Invoice WL-25263822', 15015.82],
  ['2026-04-03', 'WorldLabs Ltd - Second payment', 'Invoice WL-25263822', 4504.75],
];
for (const [date, desc, ref, amt] of S) {
  const { error } = await svc.from('expenses').insert({
    project_id: PROJ, type: 'subcontract', date, description: desc, invoice_ref: ref,
    amount: amt, eligible_amount: amt,
  });
  if (error) { console.error('sub err:', desc, error.message); process.exit(1); }
}
console.log('subcontract: 2 ok');

const { data: chk } = await svc.from('expenses').select('type,amount,iva,eligible_amount').eq('project_id', PROJ);
const s = (fld, t) => chk.filter(e => !t || e.type === t).reduce((a, e) => a + (parseFloat(e[fld]) || 0), 0);
console.log('TOTALI -> travel:', s('amount', 'travel').toFixed(2), '(atteso 2268.66) | sub:', s('amount', 'subcontract').toFixed(2), '(atteso 19520.57) | iva:', s('iva').toFixed(2), '(atteso 89.94)');
