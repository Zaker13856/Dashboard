import { supabase } from '@/lib/customSupabaseClient';

// Tender: elenco caricato dall'admin. Le ore Tender nei timesheet restano activity_type 'tender_sub'
// (compatibile con le righe vecchie) e in più hanno tender_id.
export const TENDER_ACTIVITY_TYPE = 'tender_sub';

export const TENDER_TYPES = ['HORIZON', 'NATIONAL', 'PRIVATE', 'OTHER'];

// Tutti i Tender (anche archiviati), ordinati per nome
export const fetchTenders = async () => {
  const { data, error } = await supabase.from('tenders').select('*').order('name');
  return error ? [] : (data || []);
};

export const activeTenders = (list) => (list || []).filter(t => t.status !== 'archived');
