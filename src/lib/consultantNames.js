import { supabase } from '@/lib/customSupabaseClient';

// Nomi di tutti i consulenti { id: nome }. Legge la vista consultant_names (solo id e nome, leggibile da tutti):
// un collega da consultants vede solo la propria riga. Se la vista non c'è ancora si torna a consultants.
export const fetchConsultantNames = async () => {
  let { data, error } = await supabase.from('consultant_names').select('id, name');
  if (error) ({ data } = await supabase.from('consultants').select('id, name'));
  const map = {};
  (data || []).forEach(c => { map[c.id] = c.name; });
  return map;
};
