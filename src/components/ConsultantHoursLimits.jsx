import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTimesheet } from '@/context/TimesheetContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Calendar, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';

const ConsultantHoursLimits = () => {
  const { consultants } = useAuth();
  const { getConsultantLimits, getUsedHours, getAssignmentsByYear } = useTimesheet();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const currentMonth = new Date().getMonth();

  const years = [2023, 2024, 2025, 2026];

  const getProgressColor = (percent) => {
    if (percent >= 100) return "bg-red-500";
    if (percent >= 90) return "bg-orange-500";
    if (percent >= 75) return "bg-yellow-500";
    return "bg-blue-600";
  };
  
  // Effect to listen for updates - essentially handled by Context re-renders, 
  // but we can log updates to confirm synchronization for Task 5.
  useEffect(() => {
    // console.log("Context updated - ConsultantHoursLimits re-rendering");
  }, [getAssignmentsByYear, getUsedHours]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Consultant Hours Usage</h2>
        <div className="w-32">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {consultants.map((consultant) => {
          const yearInt = parseInt(selectedYear);
          const limits = getConsultantLimits(consultant.id, yearInt);
          
          // Actual Used Hours (Timesheets)
          const usedAnnual = getUsedHours(consultant.id, yearInt);
          const percentAnnual = Math.min((usedAnnual / limits.annual) * 100, 100);

          // Allocated (Planned) Hours for Selected Year
          const assignments = getAssignmentsByYear(yearInt, consultant.id);
          const totalAllocated = assignments.reduce((sum, a) => sum + (parseFloat(a.allocatedHours) || 0), 0);

          return (
            <motion.div
              key={consultant.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="h-full border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="flex justify-between items-center text-lg">
                    {consultant.name}
                    <span className="text-sm font-normal text-gray-500">€{consultant.hourlyRate}/hr</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-2">
                   {/* Allocated (Planned) Stats */}
                  <div className="bg-purple-50 p-3 rounded border border-purple-100">
                    <div className="flex justify-between items-center text-sm mb-1">
                      <span className="flex items-center gap-1 text-purple-800 font-medium">
                        <Briefcase className="w-3 h-3" /> Allocated ({selectedYear})
                      </span>
                      <span className="font-bold text-purple-900">{totalAllocated} h</span>
                    </div>
                    <p className="text-[10px] text-purple-600">Total planned assignments for year</p>
                  </div>

                  {/* Annual Progress (Actual) */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-1 text-gray-600">
                        <Calendar className="w-3 h-3" /> Annual Limit
                      </span>
                      <span className="font-medium">
                        {usedAnnual.toFixed(1)} / {limits.annual} h
                      </span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${getProgressColor(percentAnnual)}`} 
                        style={{ width: `${percentAnnual}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default ConsultantHoursLimits;