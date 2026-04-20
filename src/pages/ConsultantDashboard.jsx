import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTimesheet } from '@/context/TimesheetContext';
import { Card, CardContent } from '@/components/ui/card';
import {
  Clock, FileText, Euro, Timer, CheckCircle2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { generateManualPDF } from '@/lib/generateManualPDF';
import { useToast } from '@/components/ui/use-toast';

const KpiCard = ({ icon: Icon, label, value, sub, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4, ease: 'easeOut' }}
  >
    <Card className={`relative overflow-hidden border-0 shadow-lg bg-white`}>
      <div className={`absolute inset-0 opacity-5 ${color.bg}`} />
      <CardContent className="p-6 flex items-center gap-5">
        <div className={`p-3 rounded-2xl ${color.icon}`}>
          <Icon className="w-7 h-7 text-white" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">{label}</p>
          <p className={`text-3xl font-extrabold ${color.text}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

const ConsultantDashboard = () => {
  const { user, loading: authLoading, getHourlyRateByConsultantAndYear } = useAuth();
  const { getMonthlyHours, getAnnualHours, getConsultantLimits, loading: timesheetLoading } = useTimesheet();
  const { toast } = useToast();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  if (authLoading || timesheetLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          <p className="text-gray-500">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('it-IT', { month: 'long' });

  const { monthly: monthlyLimit, annual: annualLimit } = getConsultantLimits(user.id, currentYear);
  const monthlyTotal = getMonthlyHours(currentYear, currentMonth, user.id);
  const annualTotal  = getAnnualHours(currentYear, user.id);
  const hourlyRate   = getHourlyRateByConsultantAndYear(user.id, currentYear);

  const safeMonthly  = monthlyLimit || 1;
  const safeAnnual   = annualLimit  || 1;
  const monthlyProgress = (monthlyTotal / safeMonthly) * 100;
  const annualProgress  = (annualTotal  / safeAnnual)  * 100;

  const getProgressColor = (pct) => {
    if (pct >= 95) return 'bg-red-500';
    if (pct >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const handleDownloadManual = async () => {
    try {
      setIsGeneratingPDF(true);
      toast({ title: 'Generazione PDF', description: 'Creazione manuale in corso...' });
      await generateManualPDF();
      toast({ title: 'Download completato', description: 'Manuale scaricato.', className: 'bg-green-50 border-green-200 text-green-900' });
    } catch {
      toast({ variant: 'destructive', title: 'Errore', description: 'Errore durante la generazione del manuale.' });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Saluto in base all'ora
  const hour = currentDate.getHours();
  const greeting = hour < 12 ? 'Buongiorno' : hour < 18 ? 'Buon pomeriggio' : 'Buonasera';
  const firstName = user.name?.split(' ')[0] || user.name;

  return (
    <div className="space-y-8">

      {/* ── HERO WELCOME ── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-8 shadow-xl"
      >
        {/* sfondo decorativo */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />

        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <p className="text-blue-200 text-sm font-medium uppercase tracking-widest mb-1">{greeting}</p>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
              {firstName} <span className="text-blue-200">👋</span>
            </h1>
            <p className="text-blue-300 mt-2 text-sm">
              {currentDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={handleDownloadManual}
              disabled={isGeneratingPDF}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
            >
              {isGeneratingPDF
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                : <FileText className="w-4 h-4 mr-2" />}
              Manuale PDF
            </Button>
            <div className="bg-white/10 border border-white/20 px-4 py-2 rounded-lg flex items-center gap-2 text-white backdrop-blur-sm text-sm font-medium">
              <Clock className="w-4 h-4 text-blue-200" />
              {monthName} {currentYear}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          icon={Euro}
          label="Tariffa Anno in Corso"
          value={hourlyRate > 0 ? `€ ${hourlyRate.toFixed(2)}/h` : '—'}
          sub={`Tariffario ${currentYear}`}
          color={{ bg: 'bg-blue-600', icon: 'bg-blue-600', text: 'text-blue-700' }}
          delay={0.1}
        />
        <KpiCard
          icon={CheckCircle2}
          label="Ore Produttive Annue"
          value={annualLimit > 0 ? `${annualLimit} h` : '—'}
          sub={`Contratto ${currentYear}`}
          color={{ bg: 'bg-emerald-600', icon: 'bg-emerald-500', text: 'text-emerald-700' }}
          delay={0.2}
        />
        <KpiCard
          icon={Timer}
          label="Ore Inserite Timesheet"
          value={`${annualTotal.toFixed(1)} h`}
          sub={`su ${annualLimit} h previste — ${annualProgress.toFixed(0)}%`}
          color={{ bg: 'bg-purple-600', icon: 'bg-purple-500', text: 'text-purple-700' }}
          delay={0.3}
        />
      </div>

    </div>
  );
};

// v2
export default ConsultantDashboard;
