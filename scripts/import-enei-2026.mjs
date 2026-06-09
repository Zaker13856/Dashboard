// import-enei-2026.mjs
// Esegui con: node scripts/import-enei-2026.mjs

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yhkzkpntfkzcktxdceri.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;

if (!SERVICE_KEY) {
  console.error('Manca SUPABASE_SERVICE_KEY. Esegui:');
  console.error('  $env:SUPABASE_SERVICE_KEY="eyJ..."; node scripts/import-enei-2026.mjs');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ── DATI DA IMPORTARE (giorni × 8 = ore) ─────────────────────────
// activity_type: 'project' | 'ferie' | 'isinnova_altro'
const DATA = [
  // Ferie
  { month: 1, day: 15, type: 'ferie',          note: null,                    project: null,        hours: 2*8 },
  // Roads4All
  { month: 1, day: 1,  type: 'project',         note: null,                    project: 'Roads4All', hours: 15*8 },
  { month: 2, day: 1,  type: 'project',         note: null,                    project: 'Roads4All', hours: 14*8 },
  { month: 3, day: 1,  type: 'project',         note: null,                    project: 'Roads4All', hours: 10*8 },
  { month: 4, day: 1,  type: 'project',         note: null,                    project: 'Roads4All', hours: 8*8  },
  // Proposta HE - NEB
  { month: 1, day: 2,  type: 'isinnova_altro',  note: 'Proposta HE - NEB',    project: null,        hours: 4*8  },
  { month: 2, day: 2,  type: 'isinnova_altro',  note: 'Proposta HE - NEB',    project: null,        hours: 4*8  },
  { month: 3, day: 2,  type: 'isinnova_altro',  note: 'Proposta HE - NEB',    project: null,        hours: 7*8  },
  { month: 4, day: 2,  type: 'isinnova_altro',  note: 'Proposta HE - NEB',    project: null,        hours: 6*8  },
  // Promozione
  { month: 2, day: 3,  type: 'isinnova_altro',  note: 'Promozione',           project: null,        hours: 2*8  },
  // Proposta HE - MISS
  { month: 3, day: 3,  type: 'isinnova_altro',  note: 'Proposta HE - MISS',   project: null,        hours: 3*8  },
  { month: 4, day: 3,  type: 'isinnova_altro',  note: 'Proposta HE - MISS',   project: null,        hours: 1*8  },
  // RFI-ENAC
  { month: 3, day: 4,  type: 'isinnova_altro',  note: 'RFI-ENAC',             project: null,        hours: 2*8  },
  { month: 4, day: 4,  type: 'isinnova_altro',  note: 'RFI-ENAC',             project: null,        hours: 3*8  },
  // FOD Automotive
  { month: 4, day: 5,  type: 'isinnova_altro',  note: 'FOD Automotive',       project: null,        hours: 1*8  },
];

async function main() {
  // 1. Trova Riccardo Enei
  const { data: enei } = await supabase
    .from('consultants')
    .select('id, name')
    .ilike('name', '%Enei%')
    .single();

  if (!enei) { console.error('Riccardo Enei non trovato!'); process.exit(1); }
  console.log(`Consulente: ${enei.name} (${enei.id})`);

  // 2. Trova progetti necessari
  const { data: projects } = await supabase.from('projects').select('id, name');
  const findProject = (name) => projects.find(p => p.name.toLowerCase().includes(name.toLowerCase()));

  // 3. Inserisci le righe
  let ok = 0, err = 0;
  for (const row of DATA) {
    let project_id = null;
    if (row.project) {
      const p = findProject(row.project);
      if (!p) { console.error(`Progetto non trovato: ${row.project}`); err++; continue; }
      project_id = p.id;
    }

    const date = `2026-${String(row.month).padStart(2,'0')}-${String(row.day).padStart(2,'0')}`;
    const { error } = await supabase.from('timesheets').upsert({
      consultant_id: enei.id,
      date,
      hours: row.hours,
      activity_type: row.type,
      activity_note: row.note,
      project_id,
    }, { onConflict: 'consultant_id,date,activity_type' });

    if (error) {
      console.error(`ERRORE ${date} ${row.type} ${row.note || ''}: ${error.message}`);
      err++;
    } else {
      console.log(`OK  ${date}  ${row.hours}h  ${row.type}  ${row.note || row.project || ''}`);
      ok++;
    }
  }

  console.log(`\nImport completato: ${ok} OK, ${err} errori`);
}

main();
