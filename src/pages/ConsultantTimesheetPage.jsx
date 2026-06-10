import React, { useState } from 'react';
import ConsultantLayout from '@/components/ConsultantLayout';
import { useAuth } from '@/context/AuthContext';
import { useTimesheet } from '@/context/TimesheetContext';
import TimesheetMonthForm from '@/components/TimesheetMonthForm';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CalendarDays, TrendingUp } from 'lucide-react';

const ConsultantTimesheetPage = () => {
  const { user, loading: authLoading, getOreMaxByConsultantAndYear } = useAuth();
  const { getMonthlyHours, getAnnualHours, getConsultantLimits, loading: timesheetLoading } = useTimesheet();

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const [selectedYear, setSelectedYear]   = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

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

  const { monthly: monthlyLimit } = getConsultantLimits(user.id, selectedYear);
  const monthlyTotal = getMonthlyHours(selectedYear, selectedMonth, user.id);
  const annualTotal  = getAnnualHours(currentYear, user.id);
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

  return (
    <ConsultantLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Timesheet</h1>
          <p className="text-gray-500 mt-1">Registrazione ore mensili</p>
        </div>

        {monthlyTotal > monthlyLimit * 0.9 && (
          <Alert variant="destructive">
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
                  Ore Mensili — {new Date(selectedYear, selectedMonth).toLocaleString('it-IT', { month: 'long', year: 'numeric' })}
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
            <TimesheetMonthForm
              selectedYear={selectedYear}
              setSelectedYear={setSelectedYear}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
            />
          </div>
        </div>
      </div>
    </ConsultantLayout>
  );
};

export default ConsultantTimesheetPage;
