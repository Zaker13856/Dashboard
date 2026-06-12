// Edge Function: admin-users
// Operazioni admin su Supabase Auth (create user, reset password).
// La service_role key vive SOLO qui, mai nel client.
// Deploy: npx supabase functions deploy admin-users --project-ref yhkzkpntfkzcktxdceri

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const defaultPassword = Deno.env.get('DEFAULT_RESET_PASSWORD') ?? 'Sistina42@';

  // Verifica chiamante: JWT valido + ruolo admin nella tabella consultants
  const authHeader = req.headers.get('Authorization') ?? '';
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser();
  if (callerErr || !caller) return json({ error: 'Non autenticato' }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: callerProfile } = await admin
    .from('consultants')
    .select('role')
    .eq('auth_user_id', caller.id)
    .limit(1)
    .maybeSingle();
  if (callerProfile?.role !== 'admin') return json({ error: 'Permesso negato: richiesto ruolo admin' }, 403);

  let body: { action?: string; email?: string; password?: string; auth_user_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Body JSON non valido' }, 400);
  }

  switch (body.action) {
    case 'create_user': {
      if (!body.email) return json({ error: 'email mancante' }, 400);
      const { data, error } = await admin.auth.admin.createUser({
        email: body.email.trim(),
        password: body.password || defaultPassword,
        email_confirm: true,
      });
      if (error) return json({ error: error.message }, 400);
      return json({ auth_user_id: data.user.id });
    }
    case 'reset_password': {
      if (!body.auth_user_id) return json({ error: 'auth_user_id mancante' }, 400);
      const { error } = await admin.auth.admin.updateUserById(body.auth_user_id, {
        password: body.password || defaultPassword,
      });
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }
    default:
      return json({ error: `Azione sconosciuta: ${body.action}` }, 400);
  }
});
