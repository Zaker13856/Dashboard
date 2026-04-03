
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

const TimesheetContext = createContext();

export const useTimesheet = () => useContext(TimesheetContext);

const MONTHLY_LIMIT = 160;
const ANNUAL_LIMIT = 1720;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const TimesheetProvider = ({ children }) => {
  const [projects, setProjects] = useState([]);
  const [entries, setEntries] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [years] = useState([2022, 2023, 2024, 2025, 2026, 2027]);
  const [history, setHistory] = useState([]);
  const [consultantLimits, setConsultantLimits] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: p }, { data: e }, { data: a }] = await Promise.all([
        supabase.from('projects').select('*'),
        supabase.from('timesheets').select('*'),
        supabase.from('allocations').select('*'),
      ]);
      if (p) setProjects(p);
      if (e) setEntries(e);
      if (a) setAllocations(a);
      setLoading(false);
    };

    fetchData();

    const channel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'timesheets' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'allocations' }, fetchData)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const addHistoryEntry = (action, details) => {
    setHistory(prev => [{
      id: Date.now(),
      action,
      details,
      timestamp: new Date().toISOString(),
    }, ...prev].slice(0, 50));
  };

  // ── READ FUNCTIONS ──────────────────────────────────────────────────────────

  const getAnnualHours = useCallback((year, consultantId) => {
    return entries
      .filter(e => {
        const entryYear = new Date(e.date).getFullYear();
        return entryYear === year && (!consultantId || e.consultant_id === consultantId);
      })
      .reduce((sum, e) => sum + (parseFloat(e.hours) || 0), 0);
  }, [entries]);

  const getMonthlyHours = useCallback((year, month, consultantId) => {
    return entries
      .filter(e => {
        const d = new Date(e.date);
        return d.getFullYear() === year && d.getMonth() === month &&
          (!consultantId || e.consultant_id === consultantId);
      })
      .reduce((sum, e) => sum + (parseFloat(e.hours) || 0), 0);
  }, [entries]);

  // Returns array of numbers when consultantId provided (for ConsultantCard monthly grid)
  // Returns array of { monthName, totalHours } when no consultantId (for AdminDashboard chart)
  const getMonthlyBreakdownForYear = useCallback((year, consultantId) => {
    if (consultantId) {
      return MONTH_NAMES.map((_, idx) =>
        entries
          .filter(e => {
            const d = new Date(e.date);
            return d.getFullYear() === year && d.getMonth() === idx && e.consultant_id === consultantId;
          })
          .reduce((sum, e) => sum + (parseFloat(e.hours) || 0), 0)
      );
    }
    return MONTH_NAMES.map((monthName, idx) => ({
      monthName,
      totalHours: entries
        .filter(e => {
          const d = new Date(e.date);
          return d.getFullYear() === year && d.getMonth() === idx;
        })
        .reduce((sum, e) => sum + (parseFloat(e.hours) || 0), 0),
    }));
  }, [entries]);

  const getAssignmentsByYear = useCallback((year, consultantId) => {
    return allocations
      .filter(a => a.consultant_id === consultantId)
      .map(a => {
        const project = projects.find(p => p.id === a.project_id);
        return {
          projectId: a.project_id,
          projectName: project?.name || 'Unknown Project',
          allocatedHours: parseFloat(a.allocated_hours) || 0,
          year,
        };
      });
  }, [allocations, projects]);

  const getConsultantProjectsForMonth = useCallback((year, month, consultantId) => {
    const monthEntries = entries.filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === year && d.getMonth() === month && e.consultant_id === consultantId;
    });

    const projectMap = {};
    monthEntries.forEach(e => {
      if (!projectMap[e.project_id]) {
        const project = projects.find(p => p.id === e.project_id);
        projectMap[e.project_id] = {
          id: e.project_id,
          name: project?.name || 'Unknown Project',
          monthlyHours: 0,
          entries: [],
        };
      }
      projectMap[e.project_id].monthlyHours += parseFloat(e.hours) || 0;
      projectMap[e.project_id].entries.push({
        id: e.id,
        hours: parseFloat(e.hours) || 0,
        modifiedAt: e.updated_at !== e.created_at ? e.updated_at : null,
      });
    });

    return Object.values(projectMap);
  }, [entries, projects]);

  const getProjectHours = useCallback((projectId) => {
    return entries
      .filter(e => e.project_id === projectId)
      .reduce((sum, e) => sum + (parseFloat(e.hours) || 0), 0);
  }, [entries]);

  const getProjectMonthlyBreakdown = useCallback((projectId, year, month) => {
    return entries
      .filter(e => {
        const d = new Date(e.date);
        return e.project_id === projectId && d.getFullYear() === year && d.getMonth() === month;
      })
      .reduce((sum, e) => sum + (parseFloat(e.hours) || 0), 0);
  }, [entries]);

  const getProjectsSortedByValue = useCallback((direction = 'desc') => {
    return [...projects].sort((a, b) => {
      const aVal = parseFloat(a.total_value || a.totalValue || a.budget) || 0;
      const bVal = parseFloat(b.total_value || b.totalValue || b.budget) || 0;
      return direction === 'desc' ? bVal - aVal : aVal - bVal;
    });
  }, [projects]);

  const getConsultantLimits = useCallback((consultantId, year) => {
    const key = `${consultantId}-${year}`;
    return consultantLimits[key] || { monthly: MONTHLY_LIMIT, annual: ANNUAL_LIMIT };
  }, [consultantLimits]);

  const getUsedHours = useCallback((consultantId, year, month) => {
    if (month !== undefined) return getMonthlyHours(year, month, consultantId);
    return getAnnualHours(year, consultantId);
  }, [getMonthlyHours, getAnnualHours]);

  const validateEntry = useCallback((consultantId, date, hours, existingHours = 0) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = d.getMonth();
    const limits = consultantLimits[`${consultantId}-${year}`] || { monthly: MONTHLY_LIMIT, annual: ANNUAL_LIMIT };

    const currentMonthly = getMonthlyHours(year, month, consultantId);
    const currentAnnual = getAnnualHours(year, consultantId);
    const newMonthlyTotal = currentMonthly - existingHours + hours;
    const newAnnualTotal = currentAnnual - existingHours + hours;

    const errors = {};
    if (newMonthlyTotal > limits.monthly) {
      errors.monthly = `Monthly limit exceeded: ${newMonthlyTotal.toFixed(1)}h / ${limits.monthly}h`;
    }
    if (newAnnualTotal > limits.annual) {
      errors.annual = `Annual limit exceeded: ${newAnnualTotal.toFixed(1)}h / ${limits.annual}h`;
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      stats: {
        newMonthlyTotal,
        monthlyLimit: limits.monthly,
        newAnnualTotal,
        annualLimit: limits.annual,
      },
    };
  }, [consultantLimits, getMonthlyHours, getAnnualHours]);

  const getConsultantAllocatedHours = useCallback((consultantId, projectId) => {
    const alloc = allocations.find(a => a.consultant_id === consultantId && a.project_id === projectId);
    return alloc ? parseFloat(alloc.allocated_hours) || 0 : 0;
  }, [allocations]);

  // ── WRITE FUNCTIONS ─────────────────────────────────────────────────────────

  const addEntry = async ({ date, projectId, hours, consultantId }) => {
    const { data, error } = await supabase.from('timesheets').insert({
      date,
      project_id: projectId,
      hours,
      consultant_id: consultantId,
    }).select().single();
    if (!error && data) {
      setEntries(prev => [...prev, data]);
      addHistoryEntry('Created', `Logged ${hours}h on ${date}`);
    }
  };

  const updateEntry = async (id, hours) => {
    const { data, error } = await supabase.from('timesheets')
      .update({ hours: parseFloat(hours) })
      .eq('id', id)
      .select().single();
    if (!error && data) {
      setEntries(prev => prev.map(e => e.id === id ? data : e));
      addHistoryEntry('Modified', `Updated entry to ${hours}h`);
    }
  };

  const deleteEntry = async (id) => {
    const entry = entries.find(e => e.id === id);
    const { error } = await supabase.from('timesheets').delete().eq('id', id);
    if (!error) {
      setEntries(prev => prev.filter(e => e.id !== id));
      addHistoryEntry('Deleted', `Removed ${entry?.hours}h entry`);
    }
  };

  const addProject = async (data) => {
    const { data: p, error } = await supabase.from('projects').insert(data).select().single();
    if (!error && p) setProjects(prev => [...prev, p]);
    return p;
  };

  const updateProject = async (id, data) => {
    const { data: p, error } = await supabase.from('projects').update(data).eq('id', id).select().single();
    if (!error && p) setProjects(prev => prev.map(proj => proj.id === id ? p : proj));
  };

  const deleteProject = async (id) => {
    // Get all periods for this project
    const { data: periodRows } = await supabase
      .from('project_periods').select('id').eq('project_id', id);
    const periodIds = (periodRows || []).map(p => p.id);

    // Delete allocations for those periods
    if (periodIds.length > 0) {
      await supabase.from('allocations').delete().in('project_period_id', periodIds);
    }

    // Delete allocations linked directly to project (if any)
    await supabase.from('allocations').delete().eq('project_id', id);

    // Delete periods
    await supabase.from('project_periods').delete().eq('project_id', id);

    // Delete the project
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (!error) setProjects(prev => prev.filter(p => p.id !== id));
  };

  const updateConsultantLimits = (consultantId, year, limits) => {
    const key = `${consultantId}-${year}`;
    setConsultantLimits(prev => ({ ...prev, [key]: limits }));
  };

  const updateProjectExpensesBudget = async (projectId, budget) => {
    const { data: p, error } = await supabase.from('projects')
      .update({ expenses_budget: budget })
      .eq('id', projectId).select().single();
    if (!error && p) setProjects(prev => prev.map(proj => proj.id === projectId ? p : proj));
  };

  const updateProjectSubcontractsBudget = async (projectId, budget) => {
    const { data: p, error } = await supabase.from('projects')
      .update({ subcontracts_budget: budget })
      .eq('id', projectId).select().single();
    if (!error && p) setProjects(prev => prev.map(proj => proj.id === projectId ? p : proj));
  };

  const assignConsultant = async (projectId, consultantId, allocatedHours) => {
    const { data, error } = await supabase.from('allocations').insert({
      project_id: projectId,
      consultant_id: consultantId,
      allocated_hours: allocatedHours,
    }).select().single();
    if (!error && data) setAllocations(prev => [...prev, data]);
  };

  const removeAssignment = async (projectId, consultantId) => {
    const { error } = await supabase.from('allocations')
      .delete()
      .eq('project_id', projectId)
      .eq('consultant_id', consultantId);
    if (!error) {
      setAllocations(prev => prev.filter(
        a => !(a.project_id === projectId && a.consultant_id === consultantId)
      ));
    }
  };

  const ensureYearsExist = () => {};

  return (
    <TimesheetContext.Provider value={{
      projects, entries, allocations, years, loading, history,
      MONTHLY_LIMIT, ANNUAL_LIMIT,
      addProject, updateProject, deleteProject,
      addEntry, updateEntry, deleteEntry,
      assignConsultant, removeAssignment,
      getConsultantLimits, updateConsultantLimits,
      getUsedHours, validateEntry,
      getConsultantAllocatedHours, ensureYearsExist,
      getAnnualHours, getMonthlyHours,
      getMonthlyBreakdownForYear, getAssignmentsByYear,
      getConsultantProjectsForMonth,
      getProjectHours, getProjectMonthlyBreakdown,
      getProjectsSortedByValue,
      updateProjectExpensesBudget, updateProjectSubcontractsBudget,
    }}>
      {!loading && children}
    </TimesheetContext.Provider>
  );
};
