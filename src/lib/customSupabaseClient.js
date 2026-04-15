import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yhkzkpntfkzcktxdceri.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inloa3prcG50Zmt6Y2t0eGRjZXJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MzQ5NTksImV4cCI6MjA5MDExMDk1OX0.YR6zthkGJxnJg3r7dT2m7aVTVHIe8HbEl9mUMF2WRsU';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

// supabaseAdmin: per operazioni admin auth (richiede service_role key in produzione)
// Usa lo stesso client per ora — le chiamate admin.auth.* funzioneranno solo se
// il progetto Supabase ha auth.enable_signup = false oppure con service_role key
export {
    customSupabaseClient,
    customSupabaseClient as supabase,
    customSupabaseClient as supabaseAdmin,
};
