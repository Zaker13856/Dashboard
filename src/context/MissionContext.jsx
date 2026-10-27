import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/AuthContext';
import { fetchAllRows } from '@/lib/fetchAllRows';
import { missionHeading } from '@/lib/costCenter';

const MissionContext = createContext();
export const useMissions = () => useContext(MissionContext);

export const MissionProvider = ({ children }) => {
  // Ricarica dopo il login: al primo caricamento l'utente non è ancora entrato e il database non restituisce niente
  const { user } = useAuth();
  const userId = user?.id;
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Legge le note spese con nome progetto/centro di costo e consulente
  const loadMissions = async () => {
    const [{ data }, { data: projs }, { data: cons }] = await Promise.all([
      fetchAllRows(() => supabase.from('missions').select('*').order('date_from', { ascending: false }).order('id')),
      supabase.from('projects').select('id, name'),
      supabase.from('consultants').select('id, name'),
    ]);
    if (!data) return null;
    const projMap = {};
    (projs || []).forEach(p => { projMap[p.id] = p.name; });
    const consMap = {};
    (cons || []).forEach(c => { consMap[c.id] = c.name; });
    return data.map(m => ({
      ...m,
      project_name: missionHeading(m, projMap[m.project_id]),
      consultant_name: consMap[m.consultant_id] || null,
    }));
  };

  const fetchMissions = useCallback(async () => {
    const list = await loadMissions();
    if (list) setMissions(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Nessun utente (prima del login o dopo l'uscita): niente dati in memoria
    if (!userId) {
      setMissions([]);
      setLoading(false);
      return;
    }
    // Una risposta arrivata dopo il cambio di utente viene scartata
    let active = true;
    const refresh = async () => {
      const list = await loadMissions();
      if (!active) return;
      if (list) setMissions(list);
      setLoading(false);
    };
    refresh();
    // Nome diverso per ogni utente: il canale precedente si chiude in ritardo e verrebbe riusato già chiuso
    const channel = supabase.channel(`missions-changes-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'missions' }, refresh)
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [userId]);

  const createMission = async ({ consultantId, projectId, place, dateFrom, dateTo, travellingWith, notes, costCenter, costCenterNote }) => {
    const payload = {
      consultant_id: consultantId,
      project_id: projectId || null,
      place,
      date_from: dateFrom,
      date_to: dateTo,
      travelling_with: travellingWith || null,
      notes: notes || null,
    };
    if (costCenter && costCenter !== 'progetto') {
      payload.cost_center = costCenter;
      payload.cost_center_note = costCenterNote || null;
    }
    const { data, error } = await supabase.from('missions').insert(payload).select('*').single();

    if (!error && data) {
      const { data: proj } = projectId
        ? await supabase.from('projects').select('id,name').eq('id', projectId).single()
        : { data: null };
      setMissions(prev => [{
        ...data,
        project_name: missionHeading(data, proj?.name),
      }, ...prev]);
    }
    return { data, error };
  };

  const updateMission = async (id, updates) => {
    const { data, error } = await supabase.from('missions').update(updates).eq('id', id).select('*').single();
    if (!error && data) {
      setMissions(prev => prev.map(m => m.id === id ? { ...m, ...data } : m));
    }
    return { data, error };
  };

  const deleteMission = async (id) => {
    const { error } = await supabase.from('missions').delete().eq('id', id);
    if (!error) setMissions(prev => prev.filter(m => m.id !== id));
    return { error };
  };

  const getMissionsByConsultant = useCallback((consultantId) => {
    if (!consultantId) return [];
    return missions.filter(m => m.consultant_id === consultantId);
  }, [missions]);

  return (
    <MissionContext.Provider value={{
      missions,
      loading,
      createMission,
      updateMission,
      deleteMission,
      getMissionsByConsultant,
      fetchMissions,
    }}>
      {children}
    </MissionContext.Provider>
  );
};
