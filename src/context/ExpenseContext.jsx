
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

const ExpenseContext = createContext();

export const useExpenses = () => useContext(ExpenseContext);

const SUBCONTRACT_TYPE = 'subcontract';
const OTHER_COST_TYPE = 'other_cost';

export const ExpenseProvider = ({ children }) => {
  const [allExpenses, setAllExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [{ data }, { data: cons }] = await Promise.all([
        supabase.from('expenses').select('*, project:projects!left(id,name)'),
        supabase.from('consultants').select('id, name'),
      ]);
      const consMap = {};
      (cons || []).forEach(c => { consMap[c.id] = c.name; });
      if (data) setAllExpenses(data.map(e => ({
        ...e,
        project_name: e.project?.name || null,
        consultant_name: e.consultant_id ? (consMap[e.consultant_id] || null) : null,
      })));
      setLoading(false);
    };

    fetchData();

    const channel = supabase.channel('expenses-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, fetchData)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Split into categories based on type field
  const expenses = allExpenses.filter(e => e.type !== SUBCONTRACT_TYPE && e.type !== OTHER_COST_TYPE);
  const subcontracts = allExpenses.filter(e => e.type === SUBCONTRACT_TYPE);
  const otherCosts = allExpenses.filter(e => e.type === OTHER_COST_TYPE);

  // ── READ FUNCTIONS ──────────────────────────────────────────────────────────

  const getExpensesByProjectId = useCallback((projectId) => {
    return expenses
      .filter(e => e.project_id === projectId)
      .map(e => ({
        ...e,
        amount: parseFloat(e.amount) || 0,
        expenseType: e.type,
      }));
  }, [expenses]);

  const getSubcontractsByProject = useCallback((projectId) => {
    return subcontracts
      .filter(e => e.project_id === projectId)
      .map(e => ({
        ...e,
        amount: parseFloat(e.amount) || 0,
      }));
  }, [subcontracts]);

  const getOtherCostsByProject = useCallback((projectId) => {
    return otherCosts
      .filter(e => e.project_id === projectId)
      .map(e => ({
        ...e,
        amount: parseFloat(e.amount) || 0,
      }));
  }, [otherCosts]);

  const getExpensesByConsultant = useCallback((consultantId) => {
    if (!consultantId) return [];
    return expenses
      .filter(e => e.consultant_id === consultantId)
      .map(e => ({
        ...e,
        expenseDate: e.date,
        expenseType: e.type,
        amount: parseFloat(e.amount) || 0,
      }));
  }, [expenses]);

  const getConsultantExpenseStats = useCallback((consultantId) => {
    const list = getExpensesByConsultant(consultantId);
    return {
      totalAmount: list.reduce((sum, e) => sum + e.amount, 0),
      count: list.length,
    };
  }, [getExpensesByConsultant]);

  const getAllExpenses = useCallback(() => allExpenses, [allExpenses]);

  const getUnifiedExpenses = useCallback(() => {
    return [
      ...expenses.map(e => ({ ...e, category: 'expense', amount: parseFloat(e.amount) || 0 })),
      ...subcontracts.map(e => ({ ...e, category: 'subcontract', amount: parseFloat(e.amount) || 0 })),
      ...otherCosts.map(e => ({ ...e, category: 'other_cost', amount: parseFloat(e.amount) || 0 })),
    ].sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));
  }, [expenses, subcontracts, otherCosts]);

  // ── WRITE FUNCTIONS ─────────────────────────────────────────────────────────

  const addExpense = async ({ projectId, consultantId, date, type, amount, iva, eligibleAmount, description, days, place, paymentMethod, paymentDate, missionId }) => {
    const payload = {
      project_id: projectId,
      consultant_id: consultantId || null,
      date,
      type,
      amount: parseFloat(amount) || 0,
      description,
    };
    if (iva !== undefined) payload.iva = parseFloat(iva) || 0;
    if (eligibleAmount !== undefined) payload.eligible_amount = parseFloat(eligibleAmount) || 0;
    if (days != null) payload.days = parseInt(days) || null;
    if (place) payload.place = place;
    if (paymentMethod) payload.payment_method = paymentMethod;
    if (paymentDate) payload.payment_date = paymentDate;
    if (missionId) payload.mission_id = missionId;
    const { data, error } = await supabase.from('expenses').insert(payload).select().single();
    if (!error && data) setAllExpenses(prev => [...prev, data]);
    return { data, error };
  };

  const updateExpense = async (id, data) => {
    const { data: updated, error } = await supabase.from('expenses')
      .update(data).eq('id', id).select().single();
    if (!error && updated) {
      setAllExpenses(prev => prev.map(e => e.id === id ? updated : e));
    }
  };

  const deleteExpense = async (id) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (!error) setAllExpenses(prev => prev.filter(e => e.id !== id));
  };

  const addSubcontract = async ({ projectId, date, providerName, description, amount }) => {
    const { data, error } = await supabase.from('expenses').insert({
      project_id: projectId,
      date,
      type: SUBCONTRACT_TYPE,
      amount: parseFloat(amount) || 0,
      description: providerName ? `${providerName}: ${description}` : description,
    }).select().single();
    if (!error && data) setAllExpenses(prev => [...prev, data]);
  };

  const deleteSubcontract = async (id) => deleteExpense(id);

  const addOtherCost = async ({ projectId, date, description, amount }) => {
    const { data, error } = await supabase.from('expenses').insert({
      project_id: projectId,
      date,
      type: OTHER_COST_TYPE,
      amount: parseFloat(amount) || 0,
      description,
    }).select().single();
    if (!error && data) setAllExpenses(prev => [...prev, data]);
  };

  const deleteOtherCost = async (id) => deleteExpense(id);

  const addPlannedExpense = async ({ projectId, date, description, amount, type }) => {
    const { data, error } = await supabase.from('expenses').insert({
      project_id: projectId,
      date,
      type: type || 'planned',
      amount: parseFloat(amount) || 0,
      description,
    }).select().single();
    if (!error && data) setAllExpenses(prev => [...prev, data]);
  };

  const removePlannedExpense = async (id) => deleteExpense(id);

  return (
    <ExpenseContext.Provider value={{
      expenses, subcontracts, otherCosts, plannedExpenses: [], loading,
      addExpense, updateExpense, deleteExpense,
      addSubcontract, deleteSubcontract,
      addOtherCost, deleteOtherCost,
      addPlannedExpense, removePlannedExpense,
      getAllExpenses, getUnifiedExpenses,
      getExpensesByProjectId, getSubcontractsByProject, getOtherCostsByProject,
      getExpensesByConsultant, getConsultantExpenseStats,
    }}>
      {loading ? (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, border: '4px solid #e5e7eb', borderTop: '4px solid #6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ color: '#6b7280', fontSize: 14 }}>Caricamento spese...</p>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : children}
    </ExpenseContext.Provider>
  );
};
