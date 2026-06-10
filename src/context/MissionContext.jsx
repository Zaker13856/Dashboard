import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

const MissionContext = createContext();
export const useMissions = () => useContext(MissionContext);

export const MissionProvider = ({ children }) => {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMissions = useCallback(async () => {
    const [{ data }, { data: projs }, { data: cons }] = await Promise.all([
      supabase.from('missions').select('*').order('date_from', { ascending: false }),
      supabase.from('projects').select('id, name'),
      supabase.from('consultants').select('id, name'),
    ]);
    const projMap = {};
    (projs || []).forEach(p => { projMap[p.id] = p.name; });
    const consMap = {};
    (cons || []).forEach(c => { consMap[c.id] = c.name; });
    if (data) {
      setMissions(data.map(m => ({
        ...m,
        project_name: projMap[m.project_id] || null,
        consultant_name: consMap[m.consultant_id] || null,
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMissions();
    const channel = supabase.channel('missions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'missions' }, fetchMissions)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [fetchMissions]);

  const createMission = async ({ consultantId, projectId, place, dateFrom, dateTo, travellingWith, notes }) => {
    const { data, error } = await supabase.from('missions').insert({
      consultant_id: consultantId,
      project_id: projectId,
      place,
      date_from: dateFrom,
      date_to: dateTo,
      travelling_with: travellingWith || null,
      notes: notes || null,
    }).select('*').single();

    if (!error && data) {
      const { data: proj } = await supabase.from('projects').select('id,name').eq('id', projectId).single();
      setMissions(prev => [{
        ...data,
        project_name: proj?.name || null,
      }, ...prev]);
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
      deleteMission,
      getMissionsByConsultant,
      fetchMissions,
    }}>
      {children}
    </MissionContext.Provider>
  );
};
