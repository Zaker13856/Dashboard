import React, { useMemo, useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTimesheet } from '@/context/TimesheetContext';
import { useProjectFinancials } from '@/hooks/useProjectFinancials';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Clock, PieChart, TrendingUp, Euro, Briefcase, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/customSupabaseClient';

const MU_HOURS = 143.33;
const fmtMU = n => new Intl.NumberFormat('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n || 0);

const AdminDashboard = () => {
  const { consultants } = useAuth();
  const { getAnnualHours, projects, getMonthlyBreakdownForYear } = useTimesheet();
  const { formatCurrency } = useProjectFinancials();

  const currentYear = new Date().getFullYear();

  const [hoursData, setHoursData] = useState({ planned: 0, sold: 0 });
  const [muData,    setMuData]    = useState({ venduti: 0, pianificati: 0 });

  useEffect(() => {
    const fetchHours = async () => {
      const [{ data: rates }, { data: allocs }, { data: projectsDB }] = await Promise.all([
        supabase.from('consultant_rates').select('ore_max').eq('year', currentYear),
        supabase.from('allocations').select('allocated_hours, project_periods(year, projects(is_lump_sum))'),
        supabase.from('projects').select('sold_person_months, is_lump_sum'),
      ]);

      // Ore pianificate anno corrente (da ore_max consulenti)
      const planned = (rates || []).reduce((sum, r) => sum + (parseFloat(r.ore_max) || 0), 0);

      // Ore allocate anno corrente
      const sold = (allocs || [])
        .filter(a => a.project_periods?.year === currentYear)
        .reduce((sum, a) => sum + (parseFloat(a.allocated_hours) || 0), 0);

      setHoursData({ planned, sold });

      // MU: intero periodo, tutti gli anni
      const muVenduti = (projectsDB || [])
        .reduce((sum, p) => sum + (parseFloat(p.sold_person_months) || 0), 0);

      const muPianificati = (allocs || [])
        .reduce((sum, a) => sum + (parseFloat(a.allocated_hours) || 0), 0) / MU_HOURS;

      setMuData({ venduti: muVenduti, pianificati: muPianificati });
    };
    fetchHours();
  }, [currentYear]);

  const totalHoursWorked = useMemo(() =>
    consultants.reduce((sum, c) => sum + getAnnualHours(currentYear, c.id), 0),
  [consultants, currentYear, getAnnualHours]);

  const totalValueWorked = useMemo(() =>
    consultants.reduce((sum, c) => {
      const hours = getAnnualHours(currentYear, c.id);
      const annualRate = parseFloat(c.annualRate || 0);
      const hourlyRate = annualRate > 0 ? (annualRate / 1920) : (parseFloat(c.hourlyRate) || 0);
      return sum + (hours * hourlyRate);
    }, 0),
  [consultants, currentYear, getAnnualHours]);

  const allocationPercentage = hoursData.planned > 0
    ? (hoursData.sold / hoursData.planned) * 100
    : 0;

  let progressColor = "bg-green-500";
  if (allocationPercentage > 90) progressColor = "bg-red-500";
  else if (allocationPercentage > 70) progressColor = "bg-yellow-500";

  const muPercentage = muData.venduti > 0
    ? (muData.pianificati / muData.venduti) * 100
    : 0;
  let muProgressColor = "bg-green-500";
  if (muPercentage > 100) muProgressColor = "bg-red-500";
  else if (muPercentage > 85) muProgressColor = "bg-yellow-500";

  const totalPortfolioBudget = useMemo(() =>
    projects.reduce((sum, p) => sum + (parseFloat(p.total_value || p.totalValue || p.budget) || 0), 0),
  [projects]);

  const monthlyBreakdown = useMemo(() =>
    getMonthlyBreakdownForYear ? getMonthlyBreakdownForYear(currentYear) : [],
  [getMonthlyBreakdownForYear, currentYear]);

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview consulenti, progetti e finanziari — {currentYear}</p>
        </div>

        {/* KPI Cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6"
        >
          {/* Card 1: Ore lavorate */}
          <Card className="bg-white border-gray-100 shadow-lg rounded-xl hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-xl"><Clock className="w-6 h-6 text-blue-600" /></div>
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Consuntivo {currentYear}</span>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 font-medium">Ore Lavorate</p>
                  <h3 className="text-3xl font-bold text-gray-900">{totalHoursWorked.toFixed(1)}<span className="text-lg text-gray-400 font-normal ml-1">h</span></h3>
                </div>
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 font-medium mb-1">Valore Ore Lavorate</p>
                  <div className="flex items-center gap-1.5">
                    <Euro className="w-4 h-4 text-gray-400" />
                    <span className="text-lg font-bold text-gray-700">{formatCurrency(totalValueWorked)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Ore pianificate anno corrente */}
          <Card className="bg-white border-gray-100 shadow-lg rounded-xl hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-xl"><PieChart className="w-6 h-6 text-purple-600" /></div>
                <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-1 rounded-full">Pianificato</span>
              </div>
              <div className="mb-3">
                <p className="text-sm text-gray-500 font-medium">Ore Vendute / Pianificate</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold text-gray-900">{hoursData.sold.toLocaleString()}</h3>
                  <span className="text-xs text-gray-400">/ {hoursData.planned.toLocaleString()}h</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600 font-medium">{allocationPercentage.toFixed(1)}% Venduto</span>
                  <span className="text-gray-400">{(hoursData.planned - hoursData.sold).toLocaleString()}h disponibili</span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", progressColor)}
                    style={{ width: `${Math.min(allocationPercentage, 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Mesi Uomo — intero periodo */}
          <Card className="bg-white border-gray-100 shadow-lg rounded-xl hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-teal-100 rounded-xl"><Users className="w-6 h-6 text-teal-600" /></div>
                <span className="text-xs font-semibold text-teal-600 bg-teal-50 px-2 py-1 rounded-full">Intero Periodo</span>
              </div>
              <div className="mb-3">
                <p className="text-sm text-gray-500 font-medium">MU Venduti / Pianificati</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold text-gray-900">{fmtMU(muData.pianificati)}</h3>
                  <span className="text-xs text-gray-400">/ {fmtMU(muData.venduti)} MU</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600 font-medium">{muPercentage.toFixed(1)}% Pianificato</span>
                  <span className={cn("font-medium", muData.venduti - muData.pianificati < 0 ? "text-red-500" : "text-gray-400")}>
                    {fmtMU(Math.abs(muData.venduti - muData.pianificati))} MU {muData.venduti - muData.pianificati >= 0 ? 'disponibili' : 'in eccesso'}
                  </span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", muProgressColor)}
                    style={{ width: `${Math.min(muPercentage, 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Progetti */}
          <Card className="bg-white border-gray-100 shadow-lg rounded-xl hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-xl"><Briefcase className="w-6 h-6 text-green-600" /></div>
                <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">Attivi</span>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Progetti Totali</p>
                <h3 className="text-3xl font-bold text-gray-900">{projects.length}</h3>
              </div>
            </CardContent>
          </Card>

          {/* Card 5: Valore portfolio */}
          <Card className="bg-white border-gray-100 shadow-lg rounded-xl hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-100 rounded-xl"><Activity className="w-6 h-6 text-orange-600" /></div>
                <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-1 rounded-full">Budget Totale</span>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Valore Portfolio</p>
                <h3 className="text-2xl font-bold text-gray-900 truncate" title={formatCurrency(totalPortfolioBudget)}>
                  {formatCurrency(totalPortfolioBudget)}
                </h3>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Grafico mensile */}
        <Card className="border-gray-100 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Andamento Mensile Ore — {currentYear}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between gap-2 pt-4 px-2">
              {monthlyBreakdown.map((month, idx) => {
                const maxHours = Math.max(...monthlyBreakdown.map(m => m.totalHours), 1);
                const heightPercent = Math.max((month.totalHours / maxHours) * 100, 5);
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full gap-2 group relative">
                    <div className="absolute bottom-full mb-2 bg-gray-900 text-white text-xs rounded p-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                      <p className="font-bold">{month.monthName}</p>
                      <p>Ore: {month.totalHours.toFixed(1)}</p>
                    </div>
                    <div
                      className="w-full bg-blue-100 hover:bg-blue-400 rounded-t-md transition-all duration-300 group-hover:shadow-md"
                      style={{ height: `${heightPercent}%` }}
                    />
                    <span className="text-xs text-gray-500 font-medium truncate w-full text-center">
                      {month.monthName.substr(0, 3)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
