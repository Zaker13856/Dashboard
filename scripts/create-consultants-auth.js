// Script da eseguire UNA VOLTA per creare auth Supabase per consulenti senza account
// Esegui con: node scripts/create-consultants-auth.js

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]])
);

const SUPABASE_URL = 'https://yhkzkpntfkzcktxdceri.supabase.co';
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_PASSWORD = env.DEFAULT_RESET_PASSWORD;
if (!SERVICE_ROLE_KEY || !DEFAULT_PASSWORD) {
  console.error('Servono SUPABASE_SERVICE_ROLE_KEY e DEFAULT_RESET_PASSWORD in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  // 1. Fetch consulenti senza auth_user_id
  const { data: consultants, error } = await supabase
    .from('consultants')
    .select('id, name, email, auth_user_id')
    .is('auth_user_id', null);

  if (error) { console.error('Errore fetch:', error.message); process.exit(1); }
  if (!consultants.length) { console.log('Nessun consulente senza auth_user_id. Tutto ok!'); return; }

  console.log(`Trovati ${consultants.length} consulenti senza account:\n`);

  for (const c of consultants) {
    if (!c.email) { console.log(`  SKIP ${c.name} — nessuna email`); continue; }

    // 2. Crea auth user
    const { data, error: createErr } = await supabase.auth.admin.createUser({
      email: c.email,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
    });

    if (createErr) {
      console.log(`  FAIL  ${c.name} (${c.email}): ${createErr.message}`);
      continue;
    }

    // 3. Aggiorna consultants con auth_user_id
    const { error: updateErr } = await supabase
      .from('consultants')
      .update({ auth_user_id: data.user.id })
      .eq('id', c.id);

    if (updateErr) {
      console.log(`  WARN  ${c.name} — creato (${data.user.id}) ma update fallito: ${updateErr.message}`);
    } else {
      console.log(`  OK    ${c.name} (${c.email}) → ${data.user.id}`);
    }
  }

  console.log('\nFatto!');
}

main();
