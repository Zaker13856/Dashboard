// Supabase restituisce al massimo 1000 righe per richiesta: legge a blocchi finché ce ne sono.
// makeQuery deve creare ogni volta una query nuova, es. () => supabase.from('expenses').select('*').order('id')
const PAGE = 1000;

export const fetchAllRows = async (makeQuery) => {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await makeQuery().range(from, from + PAGE - 1);
    if (error) return { data: from === 0 ? null : rows, error };
    rows.push(...(data || []));
    if (!data || data.length < PAGE) return { data: rows, error: null };
  }
};
