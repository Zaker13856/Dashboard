import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, invokeAdminUsers } from '@/lib/customSupabaseClient';

// 2FA obbligatorio solo per il ruolo admin (dati finanziari sensibili).
const MFA_REQUIRED_ROLES = ['admin'];

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

const fetchConsultantProfile = async (authUserId) => {
  const { data, error } = await supabase
    .from('consultants')
    .select('*')
    .eq('auth_user_id', authUserId)
    .limit(1);

  if (error || !data || data.length === 0) return null;

  const c = data[0];
  return {
    id: c.id,
    email: c.email,
    name: c.name,
    role: c.role || 'consultant',
    tipo: c.tipo || 'consulente',
    socio_dal: c.socio_dal || null,
    qualifica_socio: c.qualifica_socio || null,
    isAuthenticated: true,
  };
};

const fetchAllConsultants = async () => {
  const { data } = await supabase.from('consultants').select('*');
  return data || [];
};

const fetchRates = async () => {
  const yearFrom = new Date().getFullYear() - 4;
  const { data } = await supabase
    .from('consultant_rates')
    .select('consultant_id, year, hourly_rate, costo_aziendale, ore_max')
    .gte('year', yearFrom);
  return data || [];
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [consultants, setConsultants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ratesVersion, setRatesVersion] = useState(0);
  const [rates, setRates] = useState([]);
  // { type: 'setup' } = admin senza fattore TOTP verificato, deve attivarlo.
  // { type: 'verify', factorId } = admin con TOTP attivo, sessione ancora aal1.
  const [mfaPending, setMfaPending] = useState(null);

  const loadSessionData = useCallback(async (session) => {
    if (session?.user) {
      const profile = await fetchConsultantProfile(session.user.id);
      if (!profile) {
        console.error('Auth: session exists but no consultant profile found for', session.user.email);
        await supabase.auth.signOut();
        setUser(null);
        setMfaPending(null);
        return;
      }

      if (MFA_REQUIRED_ROLES.includes(profile.role)) {
        const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
        const verifiedTotp = !factorsError && factorsData?.totp?.find((f) => f.status === 'verified');

        if (!verifiedTotp) {
          setUser(null);
          setMfaPending({ type: 'setup' });
          return;
        }

        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal?.nextLevel === 'aal2' && aal?.currentLevel !== aal?.nextLevel) {
          setUser(null);
          setMfaPending({ type: 'verify', factorId: verifiedTotp.id });
          return;
        }
      }

      setMfaPending(null);
      setUser(profile);
      const [all, allRates] = await Promise.all([fetchAllConsultants(), fetchRates()]);
      setConsultants(all);
      setRates(allRates);
    } else {
      setUser(null);
      setMfaPending(null);
      setConsultants([]);
      setRates([]);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => loadSessionData(session))
      .catch((err) => console.error('Auth init failed:', err))
      .finally(() => setLoading(false));

    // Niente await dentro il callback: chiamate supabase qui dentro causano
    // deadlock del lock interno di supabase-js (limite documentato).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setTimeout(() => {
          loadSessionData(session).catch((err) => console.error('Auth state change failed:', err));
        }, 0);
      }
    );

    return () => subscription.unsubscribe();
  }, [loadSessionData]);

  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        return { success: false, error: 'Email o password non valida' };
      }

      const profile = await fetchConsultantProfile(data.user.id);
      if (!profile) {
        await supabase.auth.signOut();
        return { success: false, error: "Profilo utente non trovato. Contatta l'amministratore." };
      }

      if (MFA_REQUIRED_ROLES.includes(profile.role)) {
        const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
        const verifiedTotp = !factorsError && factorsData?.totp?.find((f) => f.status === 'verified');

        if (!verifiedTotp) {
          setMfaPending({ type: 'setup' });
          return { success: true, mfaSetupRequired: true };
        }

        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal?.nextLevel === 'aal2' && aal?.currentLevel !== aal?.nextLevel) {
          setMfaPending({ type: 'verify', factorId: verifiedTotp.id });
          return { success: true, mfaRequired: true };
        }
      }

      await loadSessionData(data.session);
      return { success: true, user: profile };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, error: 'Errore imprevisto durante il login.' };
    }
  };

  const logout = async () => {
    // Clear state first so UI updates immediately even though Header calls logout() without await
    setUser(null);
    setMfaPending(null);
    setConsultants([]);
    setRates([]);
    await supabase.auth.signOut();
  };

  const getCurrentUser = () => user;
  const getConsultantHourlyRate = () => 0;
  const getHourlyRateByConsultantAndYear = (consultantId, year) => {
    const rate = rates.find(r => r.consultant_id === consultantId && r.year === year);
    return rate?.hourly_rate || 0;
  };
  const getOreMaxByConsultantAndYear = (consultantId, year) => {
    const rate = rates.find(r => r.consultant_id === consultantId && r.year === year);
    return rate?.ore_max || 0;
  };
  const addConsultant = async ({ name, email, role, status, tipo, socio_dal, qualifica_socio }) => {
    // 1. Insert into consultants table
    const insertFields = {
      name,
      email: email || null,
      role: role || 'consultant',
      status: status || 'active',
      tipo: tipo || 'consulente',
      qualifica_socio: qualifica_socio || null,
    };
    if (socio_dal && socio_dal.trim() !== '') insertFields.socio_dal = socio_dal;
    const { data, error } = await supabase
      .from('consultants')
      .insert(insertFields)
      .select()
      .single();
    if (error) return { error: error.message };

    // 2. If email provided, create Supabase Auth user (Edge Function, password default server-side)
    if (email) {
      const { data: authData, error: authError } = await invokeAdminUsers({
        action: 'create_user',
        email: email.trim(),
      });
      if (authError) {
        // Consultant row created but auth failed — still return data with warning
        setConsultants(prev => [...prev, data]);
        return { data, warning: `Consulente creato ma account login fallito: ${authError.message}` };
      }
      // 3. Link auth_user_id back to consultants row
      await supabase
        .from('consultants')
        .update({ auth_user_id: authData.auth_user_id })
        .eq('id', data.id);
      data.auth_user_id = authData.auth_user_id;
    }

    setConsultants(prev => [...prev, data]);
    return { data };
  };
  const updateConsultant = async (id, fields) => {
    const { error } = await supabase
      .from('consultants')
      .update(fields)
      .eq('id', id);
    if (error) return { error: error.message };
    setConsultants(prev => prev.map(c => c.id === id ? { ...c, ...fields } : c));
    return {};
  };
  const deleteConsultant = async (id) => {
    const { error: ratesErr } = await supabase.from('consultant_rates').delete().eq('consultant_id', id);
    if (ratesErr) return { error: ratesErr.message };
    const { error } = await supabase.from('consultants').delete().eq('id', id);
    if (error) return { error: error.message };
    setConsultants(prev => prev.filter(c => c.id !== id));
    setRates(prev => prev.filter(r => r.consultant_id !== id));
    return {};
  };
  const upsertRate = async (consultantId, year, { costo_aziendale, ore_max }) => {
    const costoNum = parseFloat(costo_aziendale) || 0;
    const oreNum   = parseInt(ore_max) || 0;
    const hourly_rate = oreNum > 0 ? costoNum / oreNum : 0;

    const { error } = await supabase
      .from('consultant_rates')
      .upsert(
        { consultant_id: consultantId, year, costo_aziendale: costoNum, ore_max: oreNum, hourly_rate },
        { onConflict: 'consultant_id,year' }
      );
    if (error) return { error: error.message };

    setRates(prev => {
      const exists = prev.find(r => r.consultant_id === consultantId && r.year === year);
      const updated = { consultant_id: consultantId, year, costo_aziendale: costoNum, ore_max: oreNum, hourly_rate };
      return exists
        ? prev.map(r => (r.consultant_id === consultantId && r.year === year) ? updated : r)
        : [...prev, updated];
    });
    return {};
  };
  const incrementRatesVersion = () => setRatesVersion(v => v + 1);
  const cleanupStaleRatesData = () => {};

  const resetConsultantPassword = async (consultantId) => {
    const consultant = consultants.find(c => c.id === consultantId);
    if (!consultant?.auth_user_id) return { error: 'auth_user_id non trovato per questo consulente' };
    const { error } = await invokeAdminUsers({
      action: 'reset_password',
      auth_user_id: consultant.auth_user_id,
    });
    if (error) return { error: error.message };
    return { success: true };
  };

  const createAuthForConsultants = async () => {
    const without = consultants.filter(c => !c.auth_user_id && c.email);
    const results = [];
    for (const c of without) {
      const { data, error } = await invokeAdminUsers({ action: 'create_user', email: c.email });
      if (error) {
        results.push({ name: c.name, email: c.email, error: error.message });
        continue;
      }
      const { error: updateError } = await supabase
        .from('consultants')
        .update({ auth_user_id: data.auth_user_id })
        .eq('id', c.id);
      results.push({
        name: c.name,
        email: c.email,
        auth_user_id: data.auth_user_id,
        error: updateError?.message || null,
      });
    }
    return results;
  };

  // --- 2FA (TOTP, compatibile Microsoft/Google Authenticator) ---

  // Avvia l'attivazione: genera un nuovo fattore TOTP e restituisce il QR code da scansionare.
  const enrollMfa = async () => {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: `authenticator-${Date.now()}`,
    });
    if (error) return { error: error.message };
    return { success: true, factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
  };

  // Conferma l'attivazione con il primo codice a 6 cifre generato dall'app.
  const verifyMfaEnrollment = async (factorId, code) => {
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError) return { error: challengeError.message };
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: code.trim(),
    });
    if (verifyError) return { error: 'Codice non valido. Riprova.' };
    const { data: { session } } = await supabase.auth.getSession();
    await loadSessionData(session);
    return { success: true };
  };

  // Verifica il codice al login per un fattore TOTP già attivo.
  const verifyMfaCode = async (code) => {
    if (!mfaPending?.factorId) return { error: 'Nessuna verifica 2FA in corso.' };
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: mfaPending.factorId });
    if (challengeError) return { error: challengeError.message };
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: mfaPending.factorId,
      challengeId: challenge.id,
      code: code.trim(),
    });
    if (verifyError) return { error: 'Codice non valido. Riprova.' };
    const { data: { session } } = await supabase.auth.getSession();
    await loadSessionData(session);
    return { success: true };
  };

  // Annulla il login in corso mentre si è fermi allo step MFA (es. l'utente vuole riprovare con un altro account).
  const cancelMfaLogin = async () => {
    await supabase.auth.signOut();
    setMfaPending(null);
  };

  // Elenco fattori TOTP dell'utente loggato (per il pannello Sicurezza).
  const listMfaFactors = async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) return { error: error.message };
    return { success: true, factors: data?.totp || [] };
  };

  // Rimuove un fattore (es. per sostituire il telefono). Richiede sessione già aal2.
  const unenrollMfa = async (factorId) => {
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) return { error: error.message };
    return { success: true };
  };

  const resetAllConsultantPasswords = async () => {
    const withAuth = consultants.filter(c => c.auth_user_id);
    const results = await Promise.all(
      withAuth.map(c => invokeAdminUsers({ action: 'reset_password', auth_user_id: c.auth_user_id }))
    );
    const failed = results.filter(r => r.error);
    if (failed.length > 0) return { success: false, error: `${failed.length} reset falliti` };
    return { success: true, count: withAuth.length };
  };

  return (
    <AuthContext.Provider value={{
      user,
      consultants,
      loading,
      isAuthenticated: !!user,
      ratesVersion,
      login,
      logout,
      getCurrentUser,
      addConsultant,
      updateConsultant,
      deleteConsultant,
      rates,
      upsertRate,
      getConsultantHourlyRate,
      getHourlyRateByConsultantAndYear,
      getOreMaxByConsultantAndYear,
      incrementRatesVersion,
      cleanupStaleRatesData,
      resetConsultantPassword,
      resetAllConsultantPasswords,
      createAuthForConsultants,
      mfaPending,
      enrollMfa,
      verifyMfaEnrollment,
      verifyMfaCode,
      cancelMfaLogin,
      listMfaFactors,
      unenrollMfa,
    }}>
      {loading ? (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, border: '4px solid #e5e7eb', borderTop: '4px solid #6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ color: '#6b7280', fontSize: 14 }}>Caricamento...</p>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : children}
    </AuthContext.Provider>
  );
};
