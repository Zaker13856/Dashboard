import React, { useState } from 'react';
import ConsultantLayout from '@/components/ConsultantLayout';
import { useAuth } from '@/context/AuthContext';
import { useTimesheet } from '@/context/TimesheetContext';
import TimesheetMonthForm from '@/components/TimesheetMonthForm';
import ConsultantExpensesSection from '@/components/ConsultantExpensesSection';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle, Clock, CalendarDays, TrendingUp,
  LayoutDashboard, WalletCards, FileText, Euro, Timer, CheckCircle2
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
    <Card className="relative overflow-hidden border-0 shadow-lg bg-white">
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

const ConsultantHome = () => {
  const { user, loading: authLoading, getHourlyRateByConsultantAndYear, getOreMaxByConsultantAndYear } = useAuth();
  const { getMonthlyHours, getAnnualHours, getConsultantLimits, loading: timesheetLoading } = useTimesheet();
  const { toast } = useToast();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  if (authLoading || timesheetLoading) {
    return (
      <ConsultantLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="text-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
            <p className="text-gray-500">Caricamento...</p>
          </div>
        </div>
      </ConsultantLayout>
    );
  }

  if (!user) return null;

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('it-IT', { month: 'long' });

  const { monthly: monthlyLimit } = getConsultantLimits(user.id, currentYear);
  const monthlyTotal = getMonthlyHours(currentYear, currentMonth, user.id);
  const annualTotal  = getAnnualHours(currentYear, user.id);
  const hourlyRate   = getHourlyRateByConsultantAndYear(user.id, currentYear);
  const oreMax       = getOreMaxByConsultantAndYear(user.id, currentYear);

  const safeMonthly = monthlyLimit || 1;
  const safeAnnual  = oreMax       || 1;
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

  const hour = currentDate.getHours();
  const greeting = hour < 12 ? 'Buongiorno' : hour < 18 ? 'Buon pomeriggio' : 'Buonasera';
  const firstName = user.name?.split(' ')[0] || user.name;

  return (
    <ConsultantLayout>
      <div className="space-y-8">

        {/* ── HERO WELCOME ── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-8 shadow-xl"
        >
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
            value={hourlyRate > 0 ? `€ ${Math.round(hourlyRate)}/h` : '—'}
            sub={`Tariffario ${currentYear}`}
            color={{ bg: 'bg-blue-600', icon: 'bg-blue-600', text: 'text-blue-700' }}
            delay={0.1}
          />
          <KpiCard
            icon={CheckCircle2}
            label="Ore Produttive Annue"
            value={oreMax > 0 ? `${oreMax} h` : '—'}
            sub={`Contratto ${currentYear}`}
            color={{ bg: 'bg-emerald-600', icon: 'bg-emerald-500', text: 'text-emerald-700' }}
            delay={0.2}
          />
          <KpiCard
            icon={Timer}
            label="Ore Inserite Timesheet"
            value={`${annualTotal.toFixed(1)} h`}
            sub={oreMax > 0 ? `su ${oreMax} h previste — ${annualProgress.toFixed(0)}%` : `Anno ${currentYear}`}
            color={{ bg: 'bg-purple-600', icon: 'bg-purple-500', text: 'text-purple-700' }}
            delay={0.3}
          />
        </div>

        {/* ── TABS ── */}
        <Tabs defaultValue="timesheet" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-6">
            <TabsTrigger value="timesheet" className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Timesheet
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex items-center gap-2">
              <WalletCards className="w-4 h-4" />
              Le Mie Spese
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timesheet">
            {monthlyTotal > monthlyLimit * 0.9 && (
              <Alert variant="destructive" className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Attenzione limite mensile</AlertTitle>
                <AlertDescription>
                  Inserite {monthlyTotal.toFixed(2)} h su {monthlyLimit} h mensili.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-6 lg:col-span-1">
                <Card className="bg-gradient-to-br from-white to-blue-50 border-blue-100 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium flex items-center gap-2">
                      <CalendarDays className="w-5 h-5 text-blue-600" />
                      Ore Mensili
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-bold text-gray-700">{monthlyTotal.toFixed(2)} / {monthlyLimit} h</span>
                        <span className="text-gray-500 font-medium">{monthlyProgress.toFixed(0)}%</span>
                      </div>
                      <Progress value={monthlyProgress} className="h-3" indicatorClassName={getProgressColor(monthlyProgress)} />
                    </div>
                    <div className="text-xs text-gray-500 flex justify-between bg-white p-2 rounded border border-gray-100">
                      <span className="font-medium">Rimanenti:</span>
                      <span className="font-bold text-blue-600">{Math.max(0, monthlyLimit - monthlyTotal).toFixed(2)} h</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-white to-purple-50 border-purple-100 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-purple-600" />
                      Progressione Annuale
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-bold text-gray-700">{annualTotal.toFixed(2)} / {oreMax} h</span>
                        <span className="text-gray-500 font-medium">{annualProgress.toFixed(0)}%</span>
                      </div>
                      <Progress value={annualProgress} className="h-3" indicatorClassName="bg-purple-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-2">
                <TimesheetMonthForm />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="expenses">
            <ConsultantExpensesSection />
          </TabsContent>
        </Tabs>

      </div>
    </ConsultantLayout>
  );
};

export default ConsultantHome;
