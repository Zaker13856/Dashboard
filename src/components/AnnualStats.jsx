import React from 'react';
import { useTimesheet } from '@/context/TimesheetContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

const AnnualStats = () => {
  const { getAnnualHours, getMonthlyBreakdownForYear, ANNUAL_LIMIT } = useTimesheet();
  
  const currentYear = new Date().getFullYear();
  const totalHours = getAnnualHours(currentYear);
  const remainingHours = ANNUAL_LIMIT - totalHours;
  const percentUsed = (totalHours / ANNUAL_LIMIT) * 100;
  
  const monthlyBreakdown = getMonthlyBreakdownForYear(currentYear);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Determine progress color
  let progressColor = 'bg-blue-500';
  if (percentUsed >= 95) {
    progressColor = 'bg-red-500';
  } else if (percentUsed >= 80) {
    progressColor = 'bg-yellow-500';
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card className="bg-gradient-to-br from-white to-indigo-50 border-indigo-200 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            Annual Statistics - {currentYear}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Year-to-Date Total:</span>
              <span className="font-semibold text-gray-900">{totalHours.toFixed(2)}h</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Annual Limit:</span>
              <span className="font-semibold text-gray-900">{ANNUAL_LIMIT}h</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Remaining Hours:</span>
              <span className={`font-semibold ${remainingHours < 0 ? 'text-red-600' : 'text-indigo-600'}`}>
                {remainingHours.toFixed(2)}h
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Annual Progress</span>
              <span>{percentUsed.toFixed(1)}%</span>
            </div>
            <Progress 
              value={Math.min(percentUsed, 100)} 
              indicatorClassName={progressColor}
              className="h-3"
            />
          </div>

          <div className="pt-4 border-t border-indigo-100">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Monthly Breakdown</h4>
            <div className="grid grid-cols-4 gap-2">
              {monthlyBreakdown.map((hours, index) => (
                <div 
                  key={index} 
                  className={`p-2 rounded text-center transition-all duration-200 ${
                    hours > 0 
                      ? 'bg-indigo-100 hover:bg-indigo-200' 
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="text-xs text-gray-600">{monthNames[index]}</div>
                  <div className={`text-sm font-semibold ${hours > 0 ? 'text-indigo-700' : 'text-gray-400'}`}>
                    {hours.toFixed(1)}h
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AnnualStats;