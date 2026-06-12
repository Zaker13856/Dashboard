import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Operazioni admin (create user, reset password) passano dalla Edge Function
// 'admin-users': la service_role key non deve MAI entrare nel bundle client.
export const invokeAdminUsers = async (payload) => {
  const { data, error } = await supabase.functions.invoke('admin-users', { body: payload });
  if (error) {
    let message = error.message;
    try {
      const ctx = await error.context?.json();
      if (ctx?.error) message = ctx.error;
    } catch { /* risposta non JSON, tengo message generico */ }
    return { error: { message } };
  }
  if (data?.error) return { error: { message: data.error } };
  return { data };
};

export default supabase;
