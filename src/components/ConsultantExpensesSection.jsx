import React, { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useExpenses } from '@/context/ExpenseContext';
import { useTimesheet } from '@/context/TimesheetContext';
import ExpenseForm from './ExpenseForm';
import ExpenseList from './ExpenseList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from 'framer-motion';
import { ListChecks, Plus, Plane, Receipt, Briefcase, Users } from 'lucide-react';

const fmt = n => new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

const BudgetRow = ({ icon: Icon, label, consumed, budget, color }) => {
  const remaining = budget - consumed;
  const over = budget > 0 && consumed > budget;
  const pct = budget > 0 ? Math.min(100, (consumed / budget) * 100) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className={`flex items-center gap-1.5 font-semibold ${color.text}`}>
          <Icon className="w-3.5 h-3.5" />
          {label}
        </span>
        <div className="flex items-center gap-3 text-right">
          <span className="text-gray-500">
            Eleg: <span className={`font-bold ${over ? 'text-red-600' : 'text-gray-900'}`}>€ {fmt(consumed)}</span>
          </span>
          {budget > 0 && (
            <span className={`font-bold ${over ? 'text-red-600' : 'text-green-700'}`}>
              {over ? `Sforato: € ${fmt(consumed - budget)}` : `Residuo: € ${fmt(remaining)}`}
            </span>
          )}
        </div>
      </div>
      {budget > 0 && (
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${over ? 'bg-red-500' : color.bar}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
};

const TYPE_CFG = {
  travel:        { label: 'Travel',      icon: Plane,     text: 'text-blue-700',   bar: 'bg-blue-500',   budgetKey: 'sold_travel' },
  other_cost:    { label: 'Other Costs', icon: Receipt,   text: 'text-amber-700',  bar: 'bg-amber-500',  budgetKey: 'sold_other_costs' },
  subcontract:   { label: 'Subcontract', icon: Briefcase, text: 'text-purple-700', bar: 'bg-purple-500', budgetKey: 'sold_subcontracting' },
  third_parties: { label: '3rd Parties', icon: Users,     text: 'text-pink-700',   bar: 'bg-pink-500',   budgetKey: 'sold_third_parties' },
};

const ConsultantExpensesSection = () => {
  const { user } = useAuth();
  const { getAllExpenses } = useExpenses();
  const { projects, allocations } = useTimesheet();

  const myProjectIds = useMemo(() => {
    if (!user) return new Set();
    return new Set(
      (allocations || [])
        .filter(a => a.consultant_id === user.id)
        .map(a => a.project_id)
    );
  }, [allocations, user]);

  const projectSummaries = useMemo(() => {
    if (!user || myProjectIds.size === 0) return [];
    const allExp = getAllExpenses();

    return projects
      .filter(p => myProjectIds.has(p.id))
      .map(p => {
        const projExp = allExp.filter(e => e.project_id === p.id);
        const consumed = {};
        Object.keys(TYPE_CFG).forEach(t => {
          consumed[t] = projExp
            .filter(e => e.type === t)
            .reduce((s, e) => s + (parseFloat(e.eligible_amount) || parseFloat(e.amount) || 0), 0);
        });
        return { ...p, consumed };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [user, myProjectIds, projects, getAllExpenses]);

  if (!user) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Per-project expense counters */}
      {projectSummaries.length > 0 && (
        <div className="space-y-3">
          {projectSummaries.map(proj => (
            <div key={proj.id} className="bg-white border rounded-xl shadow-sm p-4 space-y-3">
              <h3 className="font-bold text-gray-900 text-base border-b pb-2">{proj.name}</h3>
              <div className="space-y-3">
                {Object.entries(TYPE_CFG).map(([type, cfg]) => {
                  const consumed = proj.consumed[type] || 0;
                  const budget = parseFloat(proj[cfg.budgetKey]) || 0;
                  return (
                    <BudgetRow
                      key={type}
                      icon={cfg.icon}
                      label={cfg.label}
                      consumed={consumed}
                      budget={budget}
                      color={{ text: cfg.text, bar: cfg.bar }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <ListChecks className="w-4 h-4" />
            Le Mie Spese
          </TabsTrigger>
          <TabsTrigger value="add" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Carica Spesa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <ExpenseList />
        </TabsContent>

        <TabsContent value="add" className="mt-4">
          <ExpenseForm />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default ConsultantExpensesSection;
