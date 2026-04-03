import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

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
  const addConsultant = async ({ name, email, role, status }) => {
    const { data, error } = await supabase
      .from('consultants')
      .insert({ name, email: email || null, role: role || 'consultant', status: status || 'active' })
      .select()
      .single();
    if (error) return { error: error.message };
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
      incrementRatesVersion,
      cleanupStaleRatesData,
      DEFAULT_PASSWORD: 'password',
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
