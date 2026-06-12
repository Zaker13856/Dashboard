import { createClient } from '@supabase/supabase-js';

const svc = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: prj } = await svc.from('projects').select('id,name').ilike('name', '%icoshell%');
const PROJ = prj[0].id;
const { data: cons } = await svc.from('consultants').select('id,name');
const f = n => cons.find(c => c.name.toLowerCase().includes(n))?.id;
const CASSOLA = f('cassola'), GUALDI = f('gualdi'), ZAINI = f('zaini');
console.log('proj:', prj[0].name, '| cassola:', !!CASSOLA, '| gualdi:', !!GUALDI, '| zaini:', !!ZAINI);

// 1. pulizia voci senza missione
const { data: del } = await svc.from('expenses').delete()
  .eq('project_id', PROJ).is('mission_id', null).select('id');
console.log('eliminate:', del.length);

// 2. missioni (voce: [desc, amount, iva, consultantOverride|undefined])
const M = [
  { c: CASSOLA, place: 'Gothemburg', from: '2024-09-09', to: '2024-09-11', voci: [['[Other] Totale viaggio - KOM', 53, 0]] },
  { c: GUALDI,  place: 'Gothemburg', from: '2024-09-09', to: '2024-09-11', voci: [['[Other] Totale viaggio - KOM', 1850.25, 165.54]] },
  { c: GUALDI,  place: 'Milano',     from: '2024-10-14', to: '2024-10-15',
    with_: 'Danilo Zaini, Daniel Cassolà, Maurizia Castellari',
    voci: [
      ['[Lodging] Hotel + tassa soggiorno x4 (Mario, Danilo, Daniel, Maurizia)', 572.40, 50.40],
      ['[Other] Totale viaggio', 260.10, 13.03],
      ['[Transportation] Maurizia Castellari - treno', 148.80, 0, null], // voce admin
    ] },
  { c: ZAINI,   place: 'Milano',     from: '2024-10-14', to: '2024-10-15', with_: 'Daniel Cassolà',
    voci: [['[Other] Totale viaggio', 455.08, 24.68]] },
  { c: CASSOLA, place: 'Milano',     from: '2024-10-14', to: '2024-10-15',
    voci: [['[Other] Totale viaggio', 8.80, 0]] },
  { c: CASSOLA, place: 'Trento',     from: '2025-03-27', to: '2025-03-27', with_: 'Mario Gualdi',
    voci: [['[Other] Totale viaggio', 221, 4.23]] },
  { c: CASSOLA, place: 'Bilbao',     from: '2025-10-08', to: '2025-10-12',
    voci: [['[Other] Totale viaggio', 484.17, 11.50]] },
  { c: GUALDI,  place: 'Bilbao',     from: '2025-10-08', to: '2025-10-10',
    voci: [['[Other] Totale viaggio', 1212.62, 8.63]] },
  { c: GUALDI,  place: 'Franciacorta', from: '2026-11-26', to: '2026-11-26',
    voci: [['[Other] Totale viaggio', 110.14, 0]] },
];
for (const m of M) {
  const { data: mis, error: e1 } = await svc.from('missions').insert({
    consultant_id: m.c, project_id: PROJ, place: m.place, date_from: m.from, date_to: m.to, travelling_with: m.with_ || null,
  }).select().single();
  if (e1) { console.error('mission err:', m.place, e1.message); process.exit(1); }
  for (const v of m.voci) {
    const [desc, amt, iva] = v;
    const cid = v.length > 3 ? v[3] : m.c; // null = admin
    const elig = Math.round((amt - iva) * 100) / 100;
    const { error: e2 } = await svc.from('expenses').insert({
      project_id: PROJ, consultant_id: cid, mission_id: mis.id, place: m.place,
      date: m.from, payment_date: m.from, payment_method: 'carta_aziendale',
      type: 'travel', amount: amt, iva: iva || null, eligible_amount: elig, description: desc,
    });
    if (e2) { console.error('voce err:', e2.message); process.exit(1); }
  }
}
console.log('missioni:', M.length, 'ok');

// 3. other cost Franciacorta
const { error: oe } = await svc.from('expenses').insert({
  project_id: PROJ, type: 'other_cost', date: '2026-11-26',
  description: 'Gualdi - Franciacorta (quota other)',
  amount: 20, eligible_amount: 20,
});
if (oe) { console.error('other err:', oe.message); process.exit(1); }
console.log('other: 1 ok');

const { data: chk } = await svc.from('expenses').select('type,amount,iva,eligible_amount').eq('project_id', PROJ);
const s = (fld, t) => chk.filter(e => !t || e.type === t).reduce((a, e) => a + (parseFloat(e[fld]) || 0), 0);
console.log('TOTALI -> travel:', s('amount', 'travel').toFixed(2), '(atteso 5376.36) | other:', s('amount', 'other_cost').toFixed(2), '(atteso 20.00) | elig tot:', s('eligible_amount').toFixed(2), '(atteso 5118.35)');
