// Edge Function: notify-expense
// Invia email a segreteria quando consulente invia nota spese.
// Deploy: npx supabase functions deploy notify-expense --project-ref yhkzkpntfkzcktxdceri

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const fmtDate = (d: string | null) => {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

const fmt = (n: number) =>
  new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const resendKey = Deno.env.get('RESEND_API_KEY')!;
  if (!resendKey) return json({ error: 'RESEND_API_KEY non configurata' }, 500);

  // Verifica JWT chiamante
  const authHeader = req.headers.get('Authorization') ?? '';
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser();
  if (callerErr || !caller) return json({ error: 'Non autenticato' }, 401);

  let body: { mission_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Body JSON non valido' }, 400);
  }

  if (!body.mission_id) return json({ error: 'mission_id mancante' }, 400);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Fetch missione
  const { data: mission, error: mErr } = await admin
    .from('missions')
    .select('*, projects(name)')
    .eq('id', body.mission_id)
    .single();

  if (mErr || !mission) return json({ error: 'Missione non trovata' }, 404);

  // Solo il proprietario può inviare
  if (mission.consultant_id !== caller.id) return json({ error: 'Permesso negato' }, 403);

  // Fetch consulente
  const { data: consultant } = await admin
    .from('consultants')
    .select('name')
    .eq('auth_user_id', caller.id)
    .single();

  const consultantName = consultant?.name || caller.email || 'Consulente';
  const projectName = (mission.projects as { name: string })?.name || '—';

  // Fetch spese missione
  const { data: expenses } = await admin
    .from('expenses')
    .select('*')
    .eq('mission_id', body.mission_id)
    .order('payment_date', { ascending: true });

  const rows = expenses || [];
  const totalAmt = rows.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const totalElig = rows.reduce((s, e) => s + (parseFloat(e.eligible_amount) || 0), 0);

  // Genera URL firmati allegati (7 giorni)
  const attachmentLinks: string[] = [];
  if (mission.receipt_paths?.length > 0) {
    for (const path of mission.receipt_paths) {
      const { data } = await admin.storage.from('scontrini').createSignedUrl(path, 60 * 60 * 24 * 7);
      if (data?.signedUrl) {
        const name = path.split('/').pop() || path;
        attachmentLinks.push(`<a href="${data.signedUrl}" style="color:#4f46e5">${name}</a>`);
      }
    }
  }

  // Costruisci tabella spese HTML
  const subtypeLabel = (desc: string) => {
    const m = desc?.match(/^\[([^\]]+)\]/);
    return m ? m[1] : '—';
  };
  const descText = (desc: string) => desc?.replace(/^\[[^\]]+\]\s*/, '') || '—';

  const expenseRows = rows.map(e => `
    <tr>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb">${fmtDate(e.payment_date || e.date)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb">${subtypeLabel(e.description)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb">${descText(e.description)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right">€ ${fmt(parseFloat(e.amount) || 0)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;color:#15803d">€ ${fmt(parseFloat(e.eligible_amount) || 0)}</td>
    </tr>`).join('');

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;color:#111;max-width:640px;margin:0 auto;padding:24px">
  <div style="background:#4f46e5;padding:16px 24px;border-radius:8px 8px 0 0">
    <h2 style="color:#fff;margin:0;font-size:18px">ISINNOVA — Nota Spese</h2>
  </div>
  <div style="background:#f9fafb;padding:20px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
    <table style="width:100%;margin-bottom:16px">
      <tr><td style="color:#6b7280;width:140px">Consulente</td><td><strong>${consultantName}</strong></td></tr>
      <tr><td style="color:#6b7280">Progetto</td><td>${projectName}</td></tr>
      <tr><td style="color:#6b7280">Destinazione</td><td>${mission.place || '—'}</td></tr>
      <tr><td style="color:#6b7280">Periodo</td><td>${fmtDate(mission.date_from)} – ${fmtDate(mission.date_to)}</td></tr>
      ${mission.travelling_with ? `<tr><td style="color:#6b7280">Con</td><td>${mission.travelling_with}</td></tr>` : ''}
    </table>

    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px">
      <thead>
        <tr style="background:#e5e7eb">
          <th style="padding:6px 8px;text-align:left">Data</th>
          <th style="padding:6px 8px;text-align:left">Tipo</th>
          <th style="padding:6px 8px;text-align:left">Descrizione</th>
          <th style="padding:6px 8px;text-align:right">Importo</th>
          <th style="padding:6px 8px;text-align:right">Eligible</th>
        </tr>
      </thead>
      <tbody>${expenseRows}</tbody>
      <tfoot>
        <tr style="font-weight:bold;background:#f3f4f6">
          <td colspan="3" style="padding:6px 8px">Totale</td>
          <td style="padding:6px 8px;text-align:right">€ ${fmt(totalAmt)}</td>
          <td style="padding:6px 8px;text-align:right;color:#15803d">€ ${fmt(totalElig)}</td>
        </tr>
      </tfoot>
    </table>

    ${attachmentLinks.length > 0 ? `
    <div style="margin-bottom:16px">
      <p style="margin:0 0 6px;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">Allegati (link validi 7 giorni)</p>
      <ul style="margin:0;padding-left:18px">
        ${attachmentLinks.map(l => `<li style="margin-bottom:4px;font-size:13px">${l}</li>`).join('')}
      </ul>
    </div>` : ''}

    <p style="font-size:12px;color:#9ca3af;margin:0">Inviato automaticamente da isinnova.cloud</p>
  </div>
</body>
</html>`;

  const TO_EMAIL = 'zaini@libero.it'; // test — cambierà con dzaini@isinnova.org dopo verifica dominio
  const dateRange = mission.date_from === mission.date_to
    ? fmtDate(mission.date_from)
    : `${fmtDate(mission.date_from)}–${fmtDate(mission.date_to)}`;

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'ISINNOVA Dashboard <onboarding@resend.dev>',
      to: [TO_EMAIL],
      subject: `[ISINNOVA] Nota spese — ${consultantName} · ${mission.place} · ${dateRange}`,
      html,
    }),
  });

  if (!resendRes.ok) {
    const err = await resendRes.text();
    return json({ error: `Resend error: ${err}` }, 500);
  }

  // Marca missione come inviata
  await admin.from('missions').update({
    submitted: true,
    submitted_at: new Date().toISOString(),
  }).eq('id', body.mission_id);

  return json({ success: true });
});
