import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yhkzkpntfkzcktxdceri.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inloa3prcG50Zmt6Y2t0eGRjZXJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MzQ5NTksImV4cCI6MjA5MDExMDk1OX0.YR6zthkGJxnJg3r7dT2m7aVTVHIe8HbEl9mUMF2WRsU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export default supabase;
