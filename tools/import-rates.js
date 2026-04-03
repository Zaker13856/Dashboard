/**
 * One-time script: import consultant rates from CSV data into Supabase consultant_rates.
 * Run with: node tools/import-rates.js
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://yhkzkpntfkzcktxdceri.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inloa3prcG50Zmt6Y2t0eGRjZXJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MzQ5NTksImV4cCI6MjA5MDExMDk1OX0.YR6zthkGJxnJg3r7dT2m7aVTVHIe8HbEl9mUMF2WRsU'
);

// Parse Italian number format: "45.631" → 45631, "35,37" → 35.37
const parseNum = (s) => {
  if (!s || s.trim() === '' || s.trim() === '0') return 0;
  return parseFloat(s.trim().replace(/\./g, '').replace(',', '.')) || 0;
};

const YEARS = [2022, 2023, 2024, 2025, 2026, 2027, 2028];

// Data extracted from CSV (name, then per year: [costo_aziendale, ore_max])
const RAW = [
  ['Carlo Sessa',      ['45.631','1290'], ['25.000','585'],  ['20.000','582'],  ['20.000','584'],  ['20.000','333'],  ['20.000','333'],  ['20.000','333']],
  ['Andrea Ricci',     ['34.114','860'],  ['36.000','1048'], ['36.000','1048'], ['25.000','728'],  ['22.000','367'],  ['22.000','367'],  ['22.000','367']],
  ['Stefano Faberi',   ['24.516','662'],  ['25.000','702'],  ['25.000','728'],  ['17.000','495'],  ['15.000','250'],  ['15.000','250'],  ['15.000','250']],
  ['Riccardo Enei',    ['42.466','1376'], ['59.524','1720'], ['63.339','1326'], ['66.302','1290'], ['66.646','1290'], ['66.646','1290'], ['66.646','1290']],
  ['Mario Gualdi',     ['71.084','1720'], ['95.574','1720'], ['91.246','1326'], ['100.382','1290'],['101.569','1290'],['101.569','1290'],['101.569','1290']],
  ['Stefano Proietti', ['46.777','1505'], ['70.806','1720'], ['82.559','1326'], ['86.000','1290'], ['91.462','1290'], ['91.462','1290'], ['91.462','1290']],
  ['Danilo Zaini',     ['45.330','1376'], ['62.529','1621'], ['66.000','1326'], ['69.080','1290'], ['70.132','1290'], ['70.132','1290'], ['70.132','1290']],
  ['Silvia Gaggi',     ['59.907','1720'], ['97.816','1720'], ['96.652','1326'], ['95.569','1290'], ['89.061','1290'], ['89.061','1290'], ['89.061','1290']],
  ['Giovanna Giuffrè', ['42.301','1290'], ['52.623','1376'], ['36.000','1032'], ['36.000','1032'], ['36.000','1032'], ['36.000','1032'], ['36.000','1032']],
  ['Loredana Marmora', ['50.220','1505'], ['71.522','1720'], ['8.806','160'],   ['0','0'],         ['0','0'],         ['0','0'],         ['0','0']],
  ['Loriana Paolucci', ['24.446','830'],  ['54.200','860'],  ['39.941','1000'], ['49.000','1290'], ['50.571','1290'], ['50.571','1290'], ['50.571','1290']],
  ['Giorgia Galvini',  ['26.681','1284'], ['36.381','1720'], ['38.000','1720'], ['40.000','1720'], ['42.000','1720'], ['42.000','1720'], ['42.000','1720']],
  ['Dani Cassola',     ['0','0'],         ['41.000','1281'], ['41.000','1025'], ['52.150','1518'], ['53.000','1159'], ['53.000','1159'], ['53.000','1159']],
  ['Valentina Malcotti',['0','0'],        ['34.800','1160'], ['34.800','870'],  ['40.000','1000'], ['44.000','1000'], ['44.000','1000'], ['44.000','1000']],
];

async function main() {
  // Fetch all consultants to build name → id map
  const { data: consultants, error: cErr } = await supabase.from('consultants').select('id, name');
  if (cErr) { console.error('Error fetching consultants:', cErr.message); process.exit(1); }

  const nameToId = {};
  consultants.forEach(c => { nameToId[c.name.trim()] = c.id; });

  console.log('Consultants found in DB:', Object.keys(nameToId));

  const rows = [];
  const skipped = [];

  for (const [name, ...yearData] of RAW) {
    const consultantId = nameToId[name];
    if (!consultantId) {
      skipped.push(`⚠️  "${name}" not found in DB — skipped`);
      continue;
    }

    for (let i = 0; i < YEARS.length; i++) {
      const year = YEARS[i];
      const [costoRaw, oreRaw] = yearData[i];
      const costo_aziendale = parseNum(costoRaw);
      const ore_max         = parseNum(oreRaw);

      if (costo_aziendale === 0 && ore_max === 0) continue; // skip empty rows

      const hourly_rate = ore_max > 0 ? costo_aziendale / ore_max : 0;
      rows.push({ consultant_id: consultantId, year, costo_aziendale, ore_max, hourly_rate });
    }
  }

  if (skipped.length > 0) {
    console.log('\nSkipped (name mismatch):');
    skipped.forEach(s => console.log(s));
  }

  console.log(`\nInserting ${rows.length} rate rows...`);

  // Upsert in batches of 50
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const { error } = await supabase
      .from('consultant_rates')
      .upsert(batch, { onConflict: 'consultant_id,year' });
    if (error) {
      console.error(`Error upserting batch ${i}–${i + batch.length}:`, error.message);
      process.exit(1);
    }
    console.log(`  ✓ batch ${i + 1}–${i + batch.length}`);
  }

  console.log('\n✅ Import complete!');
}

main();
