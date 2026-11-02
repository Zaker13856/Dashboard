-- Nomi dei consulenti visibili a tutti gli utenti collegati (solo id e nome, niente email/ruolo):
-- servono nella tabella "Tutte le spese del progetto" per mostrare chi ha fatto le note spese dei colleghi.
-- La vista gira con i permessi del proprietario, quindi non dipende dalle regole di lettura di consultants.
-- Si può rilanciare senza problemi.

CREATE OR REPLACE VIEW public.consultant_names AS
  SELECT id, name FROM public.consultants;

REVOKE ALL ON public.consultant_names FROM anon;
GRANT SELECT ON public.consultant_names TO authenticated;
