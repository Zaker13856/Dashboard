import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useTimesheet } from '@/context/TimesheetContext';
import TimesheetFreeRow from '@/components/TimesheetFreeRow';

const MONTH_NAMES_IT = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

const FIXED_ACTIVITY_TYPES = [
  'ferie', 'malattia',
  'isinnova_comunicazione', 'isinnova_amministrazione', 'isinnova_altro'
];

const FREE_ACTIVITY_TYPES = ['tender_sub', 'proposta', 'consulenza', 'altro'];

const MONTHLY_LIMIT = 160;

let localIdCounter = 0;
const nextLocalId = () => `local_${++localIdCounter}`;

const TimesheetMonthForm = () => {
  const { user } = useAuth();
  const { allocations, projects } = useTimesheet();

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  const [fixedHours, setFixedHours] = useState({
    ferie: 0, malattia: 0,
    isinnova_comunicazione: 0, isinnova_amministrazione: 0, isinnova_altro: 0,
    isinnova_altro_note: '',
  });

  const [projectRows, setProjectRows] = useState([]);
  const [freeRows, setFreeRows] = useState([]);
  const freeRowsToDelete = useRef([]);

  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('idle');
  const debounceTimer = useRef(null);
  const isFirstLoad = useRef(true);

  const firstOfMonth = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;

  const totalHours = (
    fixedHours.ferie + fixedHours.malattia +
    fixedHours.isinnova_comunicazione + fixedHours.isinnova_amministrazione + fixedHours.isinnova_altro +
    projectRows.reduce((s, r) => s + r.hours, 0) +
    freeRows.reduce((s, r) => s + r.hours, 0)
  );

  // ── Caricamento ───────────────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      isFirstLoad.current = true;
      freeRowsToDelete.current = [];

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

      const consultantAllocations = allocations.filter(a => a.consultant_id === user.id);
      const newProjectRows = consultantAllocations.map(a => {
        const project = projects.find(p => p.id === a.project_id);
        const dbRow = dbRows.find(r => r.activity_type === 'project' && r.project_id === a.project_id);
        return {
          projectId: a.project_id,
          projectName: project?.name || 'Progetto sconosciuto',
          hours: dbRow ? parseFloat(dbRow.hours) || 0 : 0,
          dbId: dbRow?.id || null,
        };
      });
      setProjectRows(newProjectRows);

      const newFreeRows = dbRows
        .filter(r => FREE_ACTIVITY_TYPES.includes(r.activity_type))
        .map(r => ({
          localId: nextLocalId(),
          id: r.id,
          activity_type: r.activity_type,
          activity_note: r.activity_note || '',
          hours: parseFloat(r.hours) || 0,
        }));
      setFreeRows(newFreeRows);

      setLoading(false);
      setTimeout(() => { isFirstLoad.current = false; }, 100);
    };

    if (user?.id) load();
  }, [selectedYear, selectedMonth, user?.id, allocations, projects]);

  // ── Save ──────────────────────────────────────────────────────────────────

  const save = useCallback(async (fixed, projRows, freeR, toDelete) => {
    setSaveStatus('saving');
    try {
      const deletes = [];

      // Fixed rows: upsert se ore > 0, delete se ore = 0
      for (const type of FIXED_ACTIVITY_TYPES) {
        const hours = fixed[type];
        const note = type === 'isinnova_altro' ? fixed.isinnova_altro_note : null;
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

      // Project rows
      for (const row of projRows) {
        if (row.hours > 0) {
          await supabase.from('timesheets').upsert({
            consultant_id: user.id,
            date: firstOfMonth,
            activity_type: 'project',
            project_id: row.projectId,
            hours: row.hours,
            activity_note: null,
          }, { onConflict: 'consultant_id,date,project_id' });
        } else if (row.dbId) {
          deletes.push(supabase.from('timesheets').delete().eq('id', row.dbId));
        }
      }

      // Free rows da eliminare
      toDelete.forEach(dbId => {
        deletes.push(supabase.from('timesheets').delete().eq('id', dbId));
      });

      await Promise.all(deletes);

      // Free rows: insert o update per id
      for (const row of freeR) {
        if (!row.activity_note?.trim()) continue;
        if (row.id) {
          await supabase.from('timesheets').update({
            activity_type: row.activity_type,
            activity_note: row.activity_note,
            hours: row.hours,
          }).eq('id', row.id);
        } else {
          const { data } = await supabase.from('timesheets').insert({
            consultant_id: user.id,
            date: firstOfMonth,
            activity_type: row.activity_type,
            activity_note: row.activity_note,
            hours: row.hours,
            project_id: null,
          }).select().single();
          if (data) {
            setFreeRows(prev => prev.map(r =>
              r.localId === row.localId ? { ...r, id: data.id } : r
            ));
          }
        }
      }

      freeRowsToDelete.current = [];
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
    }
  }, [user?.id, firstOfMonth]);

  const triggerSave = useCallback((fixed, projRows, freeR) => {
    if (isFirstLoad.current) return;
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      save(fixed, projRows, freeR, [...freeRowsToDelete.current]);
    }, 1500);
  }, [save]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleFixedChange = (field, value) => {
    const updated = { ...fixedHours, [field]: value };
    setFixedHours(updated);
    triggerSave(updated, projectRows, freeRows);
  };

  const handleProjectChange = (projectId, hours) => {
    const updated = projectRows.map(r =>
      r.projectId === projectId ? { ...r, hours } : r
    );
    setProjectRows(updated);
    triggerSave(fixedHours, updated, freeRows);
  };

  const handleFreeChange = (localId, field, value) => {
    const updated = freeRows.map(r =>
      r.localId === localId ? { ...r, [field]: value } : r
    );
    setFreeRows(updated);
    triggerSave(fixedHours, projectRows, updated);
  };

  const handleFreeDelete = (localId) => {
    const row = freeRows.find(r => r.localId === localId);
    if (row?.id) freeRowsToDelete.current.push(row.id);
    const updated = freeRows.filter(r => r.localId !== localId);
    setFreeRows(updated);
    triggerSave(fixedHours, projectRows, updated);
  };

  const handleAddFreeRow = () => {
    setFreeRows(prev => [...prev, {
      localId: nextLocalId(),
      id: null,
      activity_type: 'tender_sub',
      activity_note: '',
      hours: 0,
    }]);
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

      {/* Header: navigazione mese + badge ore + stato salvataggio */}
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
              <AlertCircle className="w-3 h-3" /> Errore nel salvataggio
            </span>
          )}
        </div>
      </div>

      {/* Sezione: Ferie & Malattia */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Ferie & Malattia</h3>
        {[
          { key: 'ferie', label: 'Ferie' },
          { key: 'malattia', label: 'Malattia' },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center gap-3">
            <span className="flex-1 text-sm text-gray-700">{label}</span>
            <input
              type="number" min="0" step="0.5"
              className="w-20 rounded-md border border-gray-300 px-2 py-1.5 text-sm text-right"
              value={fixedHours[key]}
              onChange={e => handleFixedChange(key, parseFloat(e.target.value) || 0)}
            />
          </div>
        ))}
      </div>

      {/* Sezione: ISINNOVA */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">ISINNOVA</h3>
        {[
          { key: 'isinnova_comunicazione', label: 'Comunicazione' },
          { key: 'isinnova_amministrazione', label: 'Amministrazione' },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center gap-3">
            <span className="flex-1 text-sm text-gray-700">{label}</span>
            <input
              type="number" min="0" step="0.5"
              className="w-20 rounded-md border border-gray-300 px-2 py-1.5 text-sm text-right"
              value={fixedHours[key]}
              onChange={e => handleFixedChange(key, parseFloat(e.target.value) || 0)}
            />
          </div>
        ))}
        <div className="flex items-center gap-3">
          <span className="flex-1 text-sm text-gray-700">Altro</span>
          <input
            type="text"
            placeholder="Nota"
            className="flex-[2] rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            value={fixedHours.isinnova_altro_note}
            onChange={e => handleFixedChange('isinnova_altro_note', e.target.value)}
          />
          <input
            type="number" min="0" step="0.5"
            className="w-20 rounded-md border border-gray-300 px-2 py-1.5 text-sm text-right"
            value={fixedHours.isinnova_altro}
            onChange={e => handleFixedChange('isinnova_altro', parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>

      {/* Sezione: Progetti */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Progetti</h3>
        {projectRows.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Nessun progetto assegnato.</p>
        ) : (
          projectRows.map(row => (
            <div key={row.projectId} className="flex items-center gap-3">
              <span className="flex-1 text-sm text-gray-700">{row.projectName}</span>
              <input
                type="number" min="0" step="0.5"
                className="w-20 rounded-md border border-gray-300 px-2 py-1.5 text-sm text-right"
                value={row.hours}
                onChange={e => handleProjectChange(row.projectId, parseFloat(e.target.value) || 0)}
              />
            </div>
          ))
        )}
      </div>

      {/* Sezione: Attività libere */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Attività</h3>
        {freeRows.length === 0 && (
          <p className="text-sm text-gray-400">Nessuna attività aggiunta.</p>
        )}
        {freeRows.map(row => (
          <TimesheetFreeRow
            key={row.localId}
            row={row}
            onChange={handleFreeChange}
            onDelete={handleFreeDelete}
          />
        ))}
        <button
          onClick={handleAddFreeRow}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium mt-1"
        >
          + Aggiungi attività
        </button>
      </div>

    </div>
  );
};

export default TimesheetMonthForm;
