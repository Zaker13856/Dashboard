import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, Loader2, AlertCircle, X, Archive } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useTimesheet } from '@/context/TimesheetContext';

const MONTH_NAMES_IT = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

const FIXED_ACTIVITY_TYPES = [
  'ferie', 'malattia',
  'isinnova_comunicazione', 'isinnova_amministrazione', 'isinnova_altro'
];

const ACTIVITY_CATEGORIES = [
  { value: 'tender_sub', label: 'Tender-Sub' },
  { value: 'proposta',   label: 'Proposta' },
  { value: 'consulenza', label: 'Consulenza' },
  { value: 'altro',      label: 'Altro' },
];

const MONTHLY_LIMIT = 160;

let localIdCounter = 0;
const nextLocalId = () => `local_${++localIdCounter}`;

const TimesheetMonthForm = () => {
  const { user } = useAuth();
  const { projects } = useTimesheet();

  const now = new Date();
  const [selectedYear, setSelectedYear]   = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  const [fixedHours, setFixedHours] = useState({
    ferie: 0, malattia: 0,
    isinnova_comunicazione: 0, isinnova_amministrazione: 0, isinnova_altro: 0,
    isinnova_altro_note: '',
  });

  const [projectRows, setProjectRows]           = useState([]);
  const projectRowsToDelete                     = useRef([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  // activities: [{ id, activity_type, activity_note }] — persistenti
  // activityHours: { [activityId]: { timesheetId, hours } } — per mese
  const [activities, setActivities]       = useState([]);
  const [activityHours, setActivityHours] = useState({});

  const [showNewActivity, setShowNewActivity] = useState(false);
  const [newActivityType, setNewActivityType] = useState('proposta');
  const [newActivityNote, setNewActivityNote] = useState('');

  const [loading, setLoading]       = useState(true);
  const [saveStatus, setSaveStatus] = useState('idle');
  const debounceTimer               = useRef(null);
  const isFirstLoad                 = useRef(true);

  const firstOfMonth = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;

  const totalHours = (
    fixedHours.ferie + fixedHours.malattia +
    fixedHours.isinnova_comunicazione + fixedHours.isinnova_amministrazione + fixedHours.isinnova_altro +
    projectRows.reduce((s, r) => s + r.hours, 0) +
    Object.values(activityHours).reduce((s, v) => s + (v.hours || 0), 0)
  );

  // ── Caricamento ───────────────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      isFirstLoad.current = true;
      projectRowsToDelete.current = [];

      const { data: activitiesData } = await supabase
        .from('consultant_activities')
        .select('*')
        .eq('consultant_id', user.id)
        .eq('status', 'active')
        .order('created_at');
      const loadedActivities = activitiesData || [];
      setActivities(loadedActivities);

      const { data: rows } = await supabase
        .from('timesheets')
        .select('*')
        .eq('consultant_id', user.id)
        .eq('date', firstOfMonth);
      const dbRows = rows || [];

      const newFixed = {
        ferie: 0, malattia: 0,
        isinnova_comunicazione: 0, isinnova_amministrazione: 0, isinnova_altro: 0,
        isinnova_altro_note: '',
      };
      FIXED_ACTIVITY_TYPES.forEach(type => {
        const row = dbRows.find(r => r.activity_type === type);
        if (row) {
          newFixed[type] = parseFloat(row.hours) || 0;
          if (type === 'isinnova_altro') newFixed.isinnova_altro_note = row.activity_note || '';
        }
      });
      setFixedHours(newFixed);

      const newProjectRows = dbRows
        .filter(r => r.activity_type === 'project' && r.project_id)
        .map(r => {
          const project = projects.find(p => p.id === r.project_id);
          return {
            localId: nextLocalId(),
            id: r.id,
            projectId: r.project_id,
            projectName: project?.name || 'Progetto sconosciuto',
            hours: parseFloat(r.hours) || 0,
          };
        });
      setProjectRows(newProjectRows);

      const newActivityHours = {};
      loadedActivities.forEach(activity => {
        const tsRow = dbRows.find(r =>
          r.activity_type === activity.activity_type &&
          r.activity_note === activity.activity_note
        );
        newActivityHours[activity.id] = {
          timesheetId: tsRow?.id || null,
          hours: tsRow ? parseFloat(tsRow.hours) || 0 : 0,
        };
      });
      setActivityHours(newActivityHours);

      setLoading(false);
      setTimeout(() => { isFirstLoad.current = false; }, 100);
    };

    if (user?.id) load();
  }, [selectedYear, selectedMonth, user?.id, projects]);

  // ── Save ──────────────────────────────────────────────────────────────────

  const save = useCallback(async (fixed, projRows, projToDelete, actHours, activitiesList) => {
    setSaveStatus('saving');
    try {
      const deletes = [];

      for (const type of FIXED_ACTIVITY_TYPES) {
        const hours = fixed[type];
        const note  = type === 'isinnova_altro' ? fixed.isinnova_altro_note : null;
        if (hours > 0) {
          await supabase.from('timesheets').upsert({
            consultant_id: user.id,
            date: firstOfMonth,
            activity_type: type,
            activity_note: note,
            hours,
            project_id: null,
          }, { onConflict: 'consultant_id,date,activity_type' });
        } else {
          deletes.push(
            supabase.from('timesheets').delete()
              .eq('consultant_id', user.id)
              .eq('date', firstOfMonth)
              .eq('activity_type', type)
          );
        }
      }

      projToDelete.forEach(dbId => {
        deletes.push(supabase.from('timesheets').delete().eq('id', dbId));
      });

      await Promise.all(deletes);

      for (const row of projRows) {
        if (row.id) {
          await supabase.from('timesheets').update({ hours: row.hours }).eq('id', row.id);
        } else {
          const { data } = await supabase.from('timesheets').insert({
            consultant_id: user.id,
            date: firstOfMonth,
            activity_type: 'project',
            project_id: row.projectId,
            hours: row.hours,
            activity_note: null,
          }).select().single();
          if (data) {
            setProjectRows(prev => prev.map(r =>
              r.localId === row.localId ? { ...r, id: data.id } : r
            ));
          }
        }
      }

      for (const [activityId, { timesheetId, hours }] of Object.entries(actHours)) {
        const activity = activitiesList.find(a => a.id === activityId);
        if (!activity) continue;
        if (hours > 0) {
          if (timesheetId) {
            await supabase.from('timesheets').update({ hours }).eq('id', timesheetId);
          } else {
            const { data } = await supabase.from('timesheets').insert({
              consultant_id: user.id,
              date: firstOfMonth,
              activity_type: activity.activity_type,
              activity_note: activity.activity_note,
              hours,
              project_id: null,
            }).select().single();
            if (data) {
              setActivityHours(prev => ({
                ...prev,
                [activityId]: { timesheetId: data.id, hours },
              }));
            }
          }
        } else if (timesheetId) {
          await supabase.from('timesheets').delete().eq('id', timesheetId);
          setActivityHours(prev => ({
            ...prev,
            [activityId]: { timesheetId: null, hours: 0 },
          }));
        }
      }

      projectRowsToDelete.current = [];
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
    }
  }, [user?.id, firstOfMonth]);

  const triggerSave = useCallback((fixed, projRows, actHours) => {
    if (isFirstLoad.current) return;
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      save(fixed, projRows, [...projectRowsToDelete.current], actHours, activities);
    }, 1500);
  }, [save, activities]);

  const handleSaveNow = () => {
    clearTimeout(debounceTimer.current);
    save(fixedHours, projectRows, [...projectRowsToDelete.current], activityHours, activities);
  };

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleFixedChange = (field, value) => {
    const updated = { ...fixedHours, [field]: value };
    setFixedHours(updated);
    triggerSave(updated, projectRows, activityHours);
  };

  const handleAddProject = () => {
    if (!selectedProjectId) return;
    if (projectRows.find(r => r.projectId === selectedProjectId)) return;
    const project = projects.find(p => p.id === selectedProjectId);
    const updated = [...projectRows, {
      localId: nextLocalId(), id: null,
      projectId: selectedProjectId,
      projectName: project?.name || 'Progetto sconosciuto',
      hours: 0,
    }];
    setProjectRows(updated);
    setSelectedProjectId('');
    triggerSave(fixedHours, updated, activityHours);
  };

  const handleProjectChange = (localId, hours) => {
    const updated = projectRows.map(r => r.localId === localId ? { ...r, hours } : r);
    setProjectRows(updated);
    triggerSave(fixedHours, updated, activityHours);
  };

  const handleProjectDelete = (localId) => {
    const row = projectRows.find(r => r.localId === localId);
    if (row?.id) projectRowsToDelete.current.push(row.id);
    const updated = projectRows.filter(r => r.localId !== localId);
    setProjectRows(updated);
    triggerSave(fixedHours, updated, activityHours);
  };

  const handleActivityHoursChange = (activityId, hours) => {
    const updated = { ...activityHours, [activityId]: { ...activityHours[activityId], hours } };
    setActivityHours(updated);
    triggerSave(fixedHours, projectRows, updated);
  };

  const handleCloseActivity = async (activityId) => {
    await supabase.from('consultant_activities').update({ status: 'closed' }).eq('id', activityId);
    setActivities(prev => prev.filter(a => a.id !== activityId));
    setActivityHours(prev => {
      const updated = { ...prev };
      delete updated[activityId];
      return updated;
    });
  };

  const handleCreateActivity = async () => {
    if (!newActivityNote.trim()) return;
    const { data } = await supabase.from('consultant_activities').insert({
      consultant_id: user.id,
      activity_type: newActivityType,
      activity_note: newActivityNote.trim(),
      status: 'active',
    }).select().single();
    if (data) {
      setActivities(prev => [...prev, data]);
      setActivityHours(prev => ({ ...prev, [data.id]: { timesheetId: null, hours: 0 } }));
      setNewActivityNote('');
      setShowNewActivity(false);
    }
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 0) { setSelectedYear(y => y - 1); setSelectedMonth(11); }
    else setSelectedMonth(m => m - 1);
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) { setSelectedYear(y => y + 1); setSelectedMonth(0); }
    else setSelectedMonth(m => m + 1);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Caricamento...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={handlePrevMonth} className="p-1 rounded hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-lg font-semibold w-36 text-center">
            {MONTH_NAMES_IT[selectedMonth]} {selectedYear}
          </span>
          <button onClick={handleNextMonth} className="p-1 rounded hover:bg-gray-100">
            <ChevronRight className="w-5 h-5" />
          </button>
          <span className={`ml-2 text-sm font-medium px-2 py-0.5 rounded-full ${
            totalHours > MONTHLY_LIMIT ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
          }`}>
            {totalHours}h / {MONTHLY_LIMIT}h
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm">
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-gray-400">
                <Loader2 className="w-3 h-3 animate-spin" /> Salvataggio...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle className="w-3 h-3" /> Salvato
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="flex items-center gap-1 text-red-500">
                <AlertCircle className="w-3 h-3" /> Errore
              </span>
            )}
          </div>
          <button
            onClick={handleSaveNow}
            disabled={saveStatus === 'saving'}
            className="px-4 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            Salva
          </button>
        </div>
      </div>

      {/* Ferie & Malattia */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 space-y-2">
        <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-1">Ferie & Malattia</h3>
        {[{ key: 'ferie', label: 'Ferie' }, { key: 'malattia', label: 'Malattia' }].map(({ key, label }) => (
          <div key={key} className="flex items-center gap-3">
            <span className="flex-1 text-sm text-gray-700">{label}</span>
            <input
              type="number" min="0" step="0.5"
              className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm text-right"
              value={fixedHours[key]}
              onChange={e => handleFixedChange(key, parseFloat(e.target.value) || 0)}
            />
          </div>
        ))}
      </div>

      {/* ISINNOVA */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 space-y-2">
        <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-1">ISINNOVA</h3>
        {[
          { key: 'isinnova_comunicazione', label: 'Comunicazione' },
          { key: 'isinnova_amministrazione', label: 'Amministrazione' },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center gap-3">
            <span className="flex-1 text-sm text-gray-700">{label}</span>
            <input
              type="number" min="0" step="0.5"
              className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm text-right"
              value={fixedHours[key]}
              onChange={e => handleFixedChange(key, parseFloat(e.target.value) || 0)}
            />
          </div>
        ))}
        <div className="flex items-center gap-3">
          <span className="flex-1 text-sm text-gray-700">Altro</span>
          <input
            type="text" placeholder="Nota"
            className="flex-[2] rounded-md border border-gray-300 px-2 py-1 text-sm"
            value={fixedHours.isinnova_altro_note}
            onChange={e => handleFixedChange('isinnova_altro_note', e.target.value)}
          />
          <input
            type="number" min="0" step="0.5"
            className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm text-right"
            value={fixedHours.isinnova_altro}
            onChange={e => handleFixedChange('isinnova_altro', parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>

      {/* Progetti */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 space-y-2">
        <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-1">Progetti</h3>
        {projectRows.length === 0 && (
          <p className="text-sm text-gray-400">Nessun progetto aggiunto per questo mese.</p>
        )}
        {projectRows.map(row => (
          <div key={row.localId} className="flex items-center gap-3">
            <span className="flex-1 text-sm text-gray-700">{row.projectName}</span>
            <input
              type="number" min="0" step="0.5"
              className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm text-right"
              value={row.hours}
              onChange={e => handleProjectChange(row.localId, parseFloat(e.target.value) || 0)}
            />
            <button onClick={() => handleProjectDelete(row.localId)} className="text-gray-400 hover:text-red-500 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        <div className="flex items-center gap-2 pt-1">
          <select
            className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm bg-white"
            value={selectedProjectId}
            onChange={e => setSelectedProjectId(e.target.value)}
          >
            <option value="">— Seleziona progetto —</option>
            {projects
              .filter(p => !projectRows.find(r => r.projectId === p.id))
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(p => <option key={p.id} value={p.id}>{p.name}</option>)
            }
          </select>
          <button
            onClick={handleAddProject}
            disabled={!selectedProjectId}
            className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            + Aggiungi
          </button>
        </div>
      </div>

      {/* Attività persistenti */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 space-y-2">
        <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-1">Attività</h3>

        {activities.length === 0 && !showNewActivity && (
          <p className="text-sm text-gray-400">Nessuna attività in corso.</p>
        )}

        {activities.map(activity => {
          const catLabel = ACTIVITY_CATEGORIES.find(c => c.value === activity.activity_type)?.label || activity.activity_type;
          const ah = activityHours[activity.id] || { timesheetId: null, hours: 0 };
          return (
            <div key={activity.id} className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 w-24 shrink-0">{catLabel}</span>
              <span className="flex-1 text-sm text-gray-700">{activity.activity_note}</span>
              <input
                type="number" min="0" step="0.5"
                className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm text-right"
                value={ah.hours}
                onChange={e => handleActivityHoursChange(activity.id, parseFloat(e.target.value) || 0)}
              />
              <button
                onClick={() => handleCloseActivity(activity.id)}
                title="Chiudi attività"
                className="text-gray-400 hover:text-orange-500 transition-colors p-1"
              >
                <Archive className="w-4 h-4" />
              </button>
            </div>
          );
        })}

        {showNewActivity && (
          <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
            <select
              className="w-32 rounded-md border border-gray-300 px-2 py-1.5 text-sm bg-white"
              value={newActivityType}
              onChange={e => setNewActivityType(e.target.value)}
            >
              {ACTIVITY_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <input
              type="text" placeholder="Descrizione attività"
              className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              value={newActivityNote}
              onChange={e => setNewActivityNote(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateActivity()}
              autoFocus
            />
            <button
              onClick={handleCreateActivity}
              disabled={!newActivityNote.trim()}
              className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
            >
              Crea
            </button>
            <button
              onClick={() => { setShowNewActivity(false); setNewActivityNote(''); }}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {!showNewActivity && (
          <button
            onClick={() => setShowNewActivity(true)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            + Nuova attività
          </button>
        )}
      </div>

    </div>
  );
};

export default TimesheetMonthForm;
