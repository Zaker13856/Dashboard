import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, supabaseAdmin } from '@/lib/customSupabaseClient';

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

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchConsultantProfile(session.user.id);
        if (!profile) {
          console.error('Auth: session exists but no consultant profile found for', session.user.email);
          await supabase.auth.signOut();
        } else {
          setUser(profile);
          const [all, allRates] = await Promise.all([fetchAllConsultants(), fetchRates()]);
          setConsultants(all);
          setRates(allRates);
        }
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const profile = await fetchConsultantProfile(session.user.id);
          if (!profile) {
            console.error('Auth: session exists but no consultant profile found for', session.user.email);
            await supabase.auth.signOut();
            return;
          }
          setUser(profile);
          const [all, allRates] = await Promise.all([fetchAllConsultants(), fetchRates()]);
          setConsultants(all);
          setRates(allRates);
        } else {
          setUser(null);
          setConsultants([]);
          setRates([]);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

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

      return { success: true, user: profile };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, error: 'Errore imprevisto durante il login.' };
    }
  };

  const logout = async () => {
    // Clear state first so UI updates immediately even though Header calls logout() without await
    setUser(null);
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
    const { data, error } = await supabase
      .from('consultants')
      .insert({ name, email: email || null, role: role || 'consultant', status: status || 'active', tipo: tipo || 'consulente', socio_dal: socio_dal || null, qualifica_socio: qualifica_socio || null })
      .select()
      .single();
    if (error) return { error: error.message };

    // 2. If email provided, create Supabase Auth user with default password
    if (email) {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email.trim(),
        password: DEFAULT_RESET_PASSWORD,
        email_confirm: true,
      });
      if (authError) {
        // Consultant row created but auth failed — still return data with warning
        setConsultants(prev => [...prev, data]);
        return { data, warning: `Consulente creato ma account login fallito: ${authError.message}` };
      }
      // 3. Link auth_user_id back to consultants row
      await supabase
        .from('consultants')
        .update({ auth_user_id: authData.user.id })
        .eq('id', data.id);
      data.auth_user_id = authData.user.id;
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

  const DEFAULT_RESET_PASSWORD = 'Sistina42@';

  const resetConsultantPassword = async (consultantId) => {
    const consultant = consultants.find(c => c.id === consultantId);
    if (!consultant?.auth_user_id) return { error: 'auth_user_id non trovato per questo consulente' };
    const { error } = await supabaseAdmin.auth.admin.updateUserById(consultant.auth_user_id, {
      password: DEFAULT_RESET_PASSWORD,
    });
    if (error) return { error: error.message };
    return { success: true };
  };

  const createAuthForConsultants = async () => {
    const without = consultants.filter(c => !c.auth_user_id && c.email);
    const results = [];
    for (const c of without) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: c.email,
        password: DEFAULT_RESET_PASSWORD,
        email_confirm: true,
      });
      if (error) {
        results.push({ name: c.name, email: c.email, error: error.message });
        continue;
      }
      const { error: updateError } = await supabase
        .from('consultants')
        .update({ auth_user_id: data.user.id })
        .eq('id', c.id);
      results.push({
        name: c.name,
        email: c.email,
        auth_user_id: data.user.id,
        error: updateError?.message || null,
      });
    }
    return results;
  };

  const resetAllConsultantPasswords = async () => {
    const withAuth = consultants.filter(c => c.auth_user_id);
    const results = await Promise.all(
      withAuth.map(c =>
        supabaseAdmin.auth.admin.updateUserById(c.auth_user_id, { password: DEFAULT_RESET_PASSWORD })
      )
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
      DEFAULT_PASSWORD: DEFAULT_RESET_PASSWORD,
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
