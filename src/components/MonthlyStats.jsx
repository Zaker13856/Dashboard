import React from 'react';
import { useTimesheet } from '@/context/TimesheetContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const MonthlyStats = () => {
  const { getMonthlyHours, MONTHLY_LIMIT } = useTimesheet();
  
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  
  const totalHours = getMonthlyHours(currentYear, currentMonth);
  const remainingHours = MONTHLY_LIMIT - totalHours;
  const percentUsed = (totalHours / MONTHLY_LIMIT) * 100;
  
  // Determine color based on percentage
  let progressColor = 'bg-green-500';
  let alertVariant = null;
  let alertIcon = <CheckCircle2 className="h-4 w-4" />;
  let alertMessage = null;
  
  if (percentUsed >= 95) {
    progressColor = 'bg-red-500';
    alertVariant = 'destructive';
    alertIcon = <AlertTriangle className="h-4 w-4" />;
    alertMessage = `Critical: You've used ${percentUsed.toFixed(1)}% of your monthly limit! Only ${remainingHours.toFixed(2)} hours remaining.`;
  } else if (percentUsed >= 80) {
    progressColor = 'bg-yellow-500';
    alertVariant = 'warning';
    alertIcon = <AlertTriangle className="h-4 w-4" />;
    alertMessage = `Warning: You've used ${percentUsed.toFixed(1)}% of your monthly limit. ${remainingHours.toFixed(2)} hours remaining.`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className="bg-gradient-to-br from-white to-green-50 border-green-200 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-600" />
            Monthly Statistics - {monthName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {alertMessage && (
            <Alert variant={alertVariant}>
              {alertIcon}
              <AlertTitle>Monthly Limit Alert</AlertTitle>
              <AlertDescription>{alertMessage}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Hours Logged:</span>
              <span className="font-semibold text-gray-900">{totalHours.toFixed(2)}h</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Monthly Limit:</span>
              <span className="font-semibold text-gray-900">{MONTHLY_LIMIT}h</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Remaining Hours:</span>
              <span className={`font-semibold ${remainingHours < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {remainingHours.toFixed(2)}h
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Progress</span>
              <span>{percentUsed.toFixed(1)}%</span>
            </div>
            <Progress 
              value={Math.min(percentUsed, 100)} 
              indicatorClassName={progressColor}
              className="h-3"
            />
          </div>

          {remainingHours < 0 && (
            <div className="text-center p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm font-semibold text-red-700">
                ⚠️ Monthly limit exceeded by {Math.abs(remainingHours).toFixed(2)} hours!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default MonthlyStats;