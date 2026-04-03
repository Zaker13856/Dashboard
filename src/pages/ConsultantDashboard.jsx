import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTimesheet } from '@/context/TimesheetContext';
import MonthlyHoursForm from '@/components/MonthlyHoursForm';
import ConsultantExpensesSection from '@/components/ConsultantExpensesSection';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Clock, CalendarDays, TrendingUp, LayoutDashboard, WalletCards, FileText, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { generateManualPDF } from '@/lib/generateManualPDF';
import { useToast } from '@/components/ui/use-toast';

const ConsultantDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { getMonthlyHours, getAnnualHours, getConsultantLimits, loading: timesheetLoading } = useTimesheet();
  const { toast } = useToast();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Guard clause for early returns if context isn't ready
  if (authLoading || timesheetLoading) {
      return (
          <div className="flex h-screen items-center justify-center">
              <div className="text-center space-y-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500">Loading your dashboard...</p>
              </div>
          </div>
      );
  }
  
  if (!user) return null;

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  // Use dynamic limits
  const { monthly: monthlyLimit, annual: currentAnnualLimit } = getConsultantLimits(user.id, currentYear);
  
  // Explicitly pass user.id to ensure filtering
  const monthlyTotal = getMonthlyHours(currentYear, currentMonth, user.id);
  const annualTotal = getAnnualHours(currentYear, user.id);
  
  // Calculations
  const safeMonthlyLimit = monthlyLimit || 1; // avoid division by zero
  const safeAnnualLimit = currentAnnualLimit || 1;
  
  const monthlyProgress = (monthlyTotal / safeMonthlyLimit) * 100;
  const annualProgress = (annualTotal / safeAnnualLimit) * 100;

  const getProgressColor = (percent) => {
    if (percent >= 95) return 'bg-red-600';
    if (percent >= 80) return 'bg-yellow-500';
    return 'bg-green-600';
  };

  const handleDownloadManual = async () => {
    try {
      setIsGeneratingPDF(true);
      toast({
        title: "Generazione PDF",
        description: "Creazione del manuale in corso, attendere...",
      });
      await generateManualPDF();
      toast({
        title: "Download completato",
        description: "Il manuale d'uso è stato scaricato con successo.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Si è verificato un errore durante la generazione del manuale.",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Welcome back, {user.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={handleDownloadManual} 
            disabled={isGeneratingPDF}
            className="flex items-center gap-2 bg-white text-blue-600 border-blue-200 hover:bg-blue-50"
            title="Scarica il Manuale d'Uso in formato PDF"
          >
            {isGeneratingPDF ? (
              <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            Scarica Manuale PDF
          </Button>
          <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-gray-700">{monthName} {currentYear}</span>
          </div>
        </div>
      </motion.div>

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
          {monthlyTotal > (monthlyLimit * 0.9) && (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Monthly Limit Warning</AlertTitle>
              <AlertDescription>
                You have logged {monthlyTotal.toFixed(2)} hours. You are approaching the monthly limit of {monthlyLimit} hours.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stats Column */}
            <div className="space-y-6 lg:col-span-1">
              {/* Monthly Stats Card */}
              <Card className="bg-gradient-to-br from-white to-blue-50 border-blue-100 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-blue-600" />
                    Monthly Overview
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
                    <span className="font-medium">Remaining:</span>
                    <span className="font-bold text-blue-600">{Math.max(0, monthlyLimit - monthlyTotal).toFixed(2)}h</span>
                  </div>
                </CardContent>
              </Card>

              {/* Annual Stats Card */}
              <Card className="bg-gradient-to-br from-white to-purple-50 border-purple-100 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                    Annual Progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-bold text-gray-700">{annualTotal.toFixed(2)} / {currentAnnualLimit} h</span>
                      <span className="text-gray-500 font-medium">{annualProgress.toFixed(0)}%</span>
                    </div>
                    <Progress value={annualProgress} className="h-3" indicatorClassName="bg-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Form and Management Column - Spans 2 columns on large screens */}
            <div className="lg:col-span-2">
              <MonthlyHoursForm />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="expenses">
          <ConsultantExpensesSection />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConsultantDashboard;