// Edge Function: receipts-cleanup
// Gli scontrini (bucket "scontrini") restano 20 giorni dopo l'invio della nota spese, poi vengono cancellati.
// La nota spese e le voci restano: si svuota solo missions.receipt_paths.
// Azioni (body JSON):
//   { action: "cleanup" }               → cancella i file con receipts_expire_at passato (lanciata ogni notte da pg_cron)
//   { action: "digest", send?: bool }   → riepilogo a segreteria di tutte le note inviate con link 20 giorni;
//                                         senza send restituisce solo l'anteprima HTML
// Accesso: digest solo con la secret key nell'header apikey; cleanup con qualsiasi chiave valida.
// Deploy: npx supabase functions deploy receipts-cleanup --project-ref yhkzkpntfkzcktxdceri

import { createClient } from 'npm:@supabase/supabase-js@2';
import { getSecretKey } from '../_shared/keys.ts';

const RETENTION_DAYS = 20;
const TO_EMAIL = 'gcali@isinnova.org';
const CC_EMAIL = 'dzaini@isinnova.org';
const COST_CENTER_LABELS: Record<string, string> = { tender: 'TENDER', promozione: 'PROMOZIONE' };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const fmtDate = (d: string | null) => {
  if (!d) return '—';
  const [y, m, day] = d.slice(0, 10).split('-');
  return `${day}/${m}/${y}`;
};

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const secretKey = getSecretKey();

  let body: { action?: string; send?: boolean };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Body JSON non valido' }, 400);
  }

  // cleanup è innocua (tocca solo file già scaduti) e la lancia pg_cron con la chiave pubblica;
  // digest invece richiede la secret key
  if (body.action !== 'cleanup' && req.headers.get('apikey') !== secretKey) {
    return json({ error: 'Permesso negato' }, 403);
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── Pulizia notturna ──────────────────────────────────────────────────────
  if (body.action === 'cleanup') {
    const { data: expired, error } = await admin
      .from('missions')
      .select('id, receipt_paths')
      .lt('receipts_expire_at', new Date().toISOString());
    if (error) return json({ error: error.message }, 500);

    let files = 0;
    const cleaned: string[] = [];
    for (const m of expired || []) {
      const paths: string[] = m.receipt_paths || [];
      if (paths.length > 0) {
        const { error: rmErr } = await admin.storage.from('scontrini').remove(paths);
        if (rmErr) continue;
        files += paths.length;
      }
      await admin.from('missions').update({ receipt_paths: [], receipts_expire_at: null }).eq('id', m.id);
      cleaned.push(m.id);
    }
    return json({ missions: cleaned.length, files });
  }

  // ── Riepilogo a segreteria ────────────────────────────────────────────────
  if (body.action === 'digest') {
    const [{ data: missions }, { data: consultants }, { data: projects }] = await Promise.all([
      admin.from('missions').select('*').eq('submitted', true).order('submitted_at', { ascending: true }),
      admin.from('consultants').select('id, name'),
      admin.from('projects').select('id, name'),
    ]);
    const consMap = Object.fromEntries((consultants || []).map(c => [c.id, c.name]));
    const projMap = Object.fromEntries((projects || []).map(p => [p.id, p.name]));
    const expireAt = new Date(Date.now() + RETENTION_DAYS * 86400000);

    const blocks: string[] = [];
    for (const m of missions || []) {
      const cc = m.cost_center;
      const heading = cc && cc !== 'progetto'
        ? [COST_CENTER_LABELS[cc] || cc.toUpperCase(), m.cost_center_note].filter(Boolean).join(' – ')
        : (projMap[m.project_id] || '—');
      const links: string[] = [];
      for (const path of m.receipt_paths || []) {
        const { data } = await admin.storage.from('scontrini').createSignedUrl(path, RETENTION_DAYS * 86400);
        if (data?.signedUrl) links.push(`<a href="${data.signedUrl}" style="color:#4f46e5">${esc(path.split('/').pop() || path)}</a>`);
      }
      blocks.push(`
        <tr><td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;vertical-align:top">
          <strong>${esc(consMap[m.consultant_id] || '—')}</strong> · ${esc(heading)}<br>
          ${esc(m.place || '—')} · ${fmtDate(m.date_from)} – ${fmtDate(m.date_to)}
          <span style="color:#6b7280">(inviata il ${fmtDate(m.submitted_at)})</span>
          <div style="margin-top:4px;font-size:13px">${links.length ? links.join('<br>') : '<span style="color:#9ca3af">nessuno scontrino allegato</span>'}</div>
        </td></tr>`);
    }

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;color:#111;max-width:680px;margin:0 auto;padding:24px">
  <div style="background:#4f46e5;padding:16px 24px;border-radius:8px 8px 0 0">
    <h2 style="color:#fff;margin:0;font-size:18px">ISINNOVA — Riepilogo scontrini note spese</h2>
  </div>
  <div style="background:#f9fafb;padding:20px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
    <p style="margin:0 0 12px;font-size:14px">
      Qui sotto tutte le note spese inviate finora, con i link agli scontrini.
      <strong>I link e gli scontrini restano disponibili fino al ${fmtDate(expireAt.toISOString())}</strong>:
      dopo quella data i file vengono cancellati per liberare spazio (le note spese e gli importi restano sul sito).
    </p>
    <p style="margin:0 0 16px;font-size:13px;color:#6b7280">
      Da ora in poi, per ogni nuova nota spese, gli scontrini restano disponibili 20 giorni dall'invio.
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">${blocks.join('')}</table>
    <p style="font-size:12px;color:#9ca3af;margin:16px 0 0">Inviato automaticamente da isinnova.cloud</p>
  </div>
</body>
</html>`;

    if (!body.send) return json({ notes: blocks.length, html });

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'ISINNOVA Dashboard <noreply@isinnova.cloud>',
        to: [TO_EMAIL],
        cc: [CC_EMAIL],
        subject: `[ISINNOVA] Riepilogo scontrini note spese — disponibili fino al ${fmtDate(expireAt.toISOString())}`,
        html,
      }),
    });
    if (!resendRes.ok) return json({ error: `Resend error: ${await resendRes.text()}` }, 500);

    // Da adesso gli scontrini delle note già inviate scadono insieme ai link
    await admin.from('missions')
      .update({ receipts_expire_at: expireAt.toISOString() })
      .eq('submitted', true);

    return json({ sent: true, notes: blocks.length, expire_at: expireAt.toISOString() });
  }

  return json({ error: 'Azione sconosciuta' }, 400);
});
