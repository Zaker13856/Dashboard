// Chiavi Supabase per le Edge Functions.
// Le legacy JWT keys (SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY) sono disabilitate dal 12/06/2026:
// si usano le nuove chiavi iniettate in SUPABASE_SECRET_KEYS / SUPABASE_PUBLISHABLE_KEYS (JSON { nome: chiave }).

const pickKey = (raw: string | undefined): string | undefined => {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'string') return parsed;
    if (parsed && typeof parsed === 'object') {
      return parsed.default ?? Object.values(parsed)[0] as string | undefined;
    }
  } catch {
    return raw;
  }
  return undefined;
};

export const getSecretKey = () =>
  pickKey(Deno.env.get('SUPABASE_SECRET_KEYS')) ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

export const getPublishableKey = () =>
  pickKey(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')) ?? Deno.env.get('SUPABASE_ANON_KEY')!;
