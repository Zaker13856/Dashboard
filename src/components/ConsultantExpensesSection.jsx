import React, { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useExpenses } from '@/context/ExpenseContext';
import { useMissions } from '@/context/MissionContext';
import { useTimesheet } from '@/context/TimesheetContext';
import MissionForm from './MissionForm';
import MissionList from './MissionList';
import ProjectExpensesTable from './ProjectExpensesTable';
import { groupByMission, exportExpensesXLS } from '@/lib/expenseDisplay';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { motion } from 'framer-motion';
import { ListChecks, Plus, Plane, Receipt, Briefcase, Users, Layers, Tag, FileSpreadsheet } from 'lucide-react';
import { COST_CENTERS } from '@/lib/costCenter';

const fmt = n => new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);


const TYPE_CFG = {
  travel:        { label: 'Travel',      icon: Plane,     text: 'text-blue-700',   bar: 'bg-blue-500',   budgetKey: 'sold_travel' },
  other_cost:    { label: 'Other Costs', icon: Receipt,   text: 'text-amber-700',  bar: 'bg-amber-500',  budgetKey: 'sold_other_costs' },
  subcontract:   { label: 'Subcontract', icon: Briefcase, text: 'text-purple-700', bar: 'bg-purple-500', budgetKey: 'sold_subcontracting' },
  third_parties: { label: '3rd Parties', icon: Users,     text: 'text-pink-700',   bar: 'bg-pink-500',   budgetKey: 'sold_third_parties' },
};

const BudgetBar = ({ icon: Icon, label, consumed, budget, color }) => {
  const over = budget > 0 && consumed > budget;
  const pct = budget > 0 ? Math.min(100, (consumed / budget) * 100) : 0;
  const remaining = budget - consumed;

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

const ConsultantExpensesSection = () => {
  const { user } = useAuth();
  const { getAllExpenses } = useExpenses();
  const { missions, getMissionsByConsultant } = useMissions();
  const { projects } = useTimesheet();

  const missionMap = useMemo(() => {
    const m = {};
    missions.forEach(mi => { m[mi.id] = mi; });
    return m;
  }, [missions]);

  // Projects where the consultant actually has expenses or missions
  const myProjectIds = useMemo(() => {
    if (!user) return new Set();
    const ids = new Set(
      getAllExpenses()
        .filter(e => e.consultant_id === user.id)
        .map(e => e.project_id)
    );
    getMissionsByConsultant(user.id).forEach(m => ids.add(m.project_id));
    return ids;
  }, [user, getAllExpenses, getMissionsByConsultant]);

  // Per-project summaries with totals
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
        // Tutte le spese del progetto (travel di tutti, other cost, subcontract...), come le vede l'admin
        return { ...p, consumed, items: projExp, displayItems: groupByMission(projExp, missionMap) };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [user, myProjectIds, projects, getAllExpenses, missionMap]);

  // Gruppi Tender / Promozione (note spese senza progetto)
  const costCenterGroups = useMemo(() => {
    if (!user) return [];
    const mine = getMissionsByConsultant(user.id);
    return COST_CENTERS
      .filter(c => c.value !== 'progetto')
      .map(c => ({ ...c, count: mine.filter(m => m.cost_center === c.value).length }))
      .filter(c => c.count > 0);
  }, [user, getMissionsByConsultant]);

  if (!user) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <ListChecks className="w-4 h-4" />
            Le Mie Spese
          </TabsTrigger>
          <TabsTrigger value="add" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nuova Nota Spese
          </TabsTrigger>
        </TabsList>

        {/* ── LE MIE SPESE ── */}
        <TabsContent value="list" className="mt-4">
          {projectSummaries.length === 0 && costCenterGroups.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Nessuna spesa registrata. Usa "Nuova Nota Spese" per iniziare.</p>
          ) : (
            <Accordion type="multiple" className="space-y-3">
              {projectSummaries.map(proj => {
                return (
                  <AccordionItem key={proj.id} value={proj.id} className="border rounded-xl bg-white shadow-sm">
                    <AccordionTrigger className="px-5 py-4 hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        {/* Left: icon + name */}
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Layers className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-gray-900">{proj.name}</p>
                            <p className="text-xs text-gray-400">{proj.items.length} voci</p>
                          </div>
                        </div>
                        {(() => {
                          const sT = parseFloat(proj.sold_travel) || 0;
                          const sO = parseFloat(proj.sold_other_costs) || 0;
                          const sS = parseFloat(proj.sold_subcontracting) || 0;
                          const s3 = parseFloat(proj.sold_third_parties) || 0;
                          return (
                            <div className="hidden md:flex items-center gap-4 text-xs">
                              <span className="text-gray-400 font-medium uppercase tracking-wide text-[10px]">Venduto:</span>
                              <span className="text-blue-600 font-semibold">Travel: € {fmt(sT)}</span>
                              <span className="text-amber-600 font-semibold">Other: € {fmt(sO)}</span>
                              <span className="text-purple-600 font-semibold">Sub: € {fmt(sS)}</span>
                              <span className="text-pink-600 font-semibold">3rd: € {fmt(s3)}</span>
                              <span className="text-green-700 font-bold">Tot: € {fmt(sT + sO + sS + s3)}</span>
                            </div>
                          );
                        })()}
                      </div>
                    </AccordionTrigger>
                    <div className="flex justify-end px-5 -mt-2 mb-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs text-gray-600 border-gray-200 hover:bg-gray-50"
                        onClick={(e) => { e.stopPropagation(); exportExpensesXLS(proj.name, proj.items); }}
                      >
                        <FileSpreadsheet className="w-3 h-3 mr-1" />Excel
                      </Button>
                    </div>

                    <AccordionContent className="px-5 pb-5">
                      {/* Budget bars */}
                      <div className="space-y-3 mb-6 pt-2 border-b pb-5">
                        {Object.entries(TYPE_CFG).map(([type, cfg]) => {
                          const consumed = proj.consumed[type] || 0;
                          const budget = parseFloat(proj[cfg.budgetKey]) || 0;
                          return (
                            <BudgetBar
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

                      {/* Tutte le spese del progetto (sola lettura) */}
                      <h4 className="text-sm font-bold text-gray-900 mb-2">Tutte le spese del progetto</h4>
                      <ProjectExpensesTable name={proj.name} items={proj.items} displayItems={proj.displayItems} />

                      {/* Note spese del consulente su questo progetto */}
                      <h4 className="text-sm font-bold text-gray-900 mt-6 mb-2">Le mie note spese</h4>
                      <MissionList projectId={proj.id} />
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
              {costCenterGroups.map(cc => (
                <AccordionItem key={cc.value} value={cc.value} className="border rounded-xl bg-white shadow-sm">
                  <AccordionTrigger className="px-5 py-4 hover:no-underline">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <Tag className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-gray-900">{cc.label.toUpperCase()}</p>
                        <p className="text-xs text-gray-400">{cc.count} note spese</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-5 pb-5">
                    <MissionList costCenter={cc.value} />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </TabsContent>

        {/* ── NUOVA NOTA SPESE ── */}
        <TabsContent value="add" className="mt-4">
          <MissionForm />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default ConsultantExpensesSection;
