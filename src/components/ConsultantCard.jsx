import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTimesheet } from '@/context/TimesheetContext';
import { useHourlyRates } from '@/hooks/useHourlyRates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { Trash2, Edit2, ChevronDown, ChevronUp, Briefcase, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ConsultantCard = ({ consultant }) => {
  const { deleteConsultant, updateConsultant } = useAuth();
  const { getAnnualHours, getMonthlyBreakdownForYear, getAssignmentsByYear } = useTimesheet();
  const { getConsultantRate, getConsultantRateHistory, formatCurrency } = useHourlyRates();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [editName, setEditName] = useState(consultant.name);

  // We display current year rate by default, but component logic supports any year via getConsultantRate
  const currentYear = new Date().getFullYear();
  const currentRate = getConsultantRate(consultant.id, currentYear);
  const rateHistory = getConsultantRateHistory(consultant.id);
  
  const annualHours = getAnnualHours(currentYear, consultant.id);
  const monthlyData = getMonthlyBreakdownForYear(currentYear, consultant.id);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Find assignments for this year
  const assignments = getAssignmentsByYear(2026, consultant.id);
  const totalAssignedHours2026 = assignments.reduce((sum, a) => sum + (parseFloat(a.allocatedHours) || 0), 0);

  const handleUpdate = () => {
    updateConsultant(consultant.id, {
      name: editName
    });
    setIsEditing(false);
  };

  return (
    <motion.div layout>
      <Card className="border shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            {isEditing ? (
              <div className="flex gap-2 w-full items-center">
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8" />
                <Button size="sm" onClick={handleUpdate}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
              </div>
            ) : (
              <>
                <div>
                  <CardTitle className="text-lg font-bold">{consultant.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm text-gray-500">
                       Rate ({currentYear}): <span className="font-semibold text-gray-900">{formatCurrency(currentRate)}/hr</span>
                    </p>
                    <Dialog>
                      <DialogTrigger asChild>
                         <Button variant="ghost" size="icon" className="h-5 w-5 text-blue-600 hover:bg-blue-50">
                            <History className="h-3 w-3" />
                         </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Rate History: {consultant.name}</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                           <table className="w-full text-sm">
                             <thead className="bg-gray-50 text-left">
                               <tr>
                                 <th className="px-3 py-2">Year</th>
                                 <th className="px-3 py-2 text-right">Rate</th>
                               </tr>
                             </thead>
                             <tbody>
                               {[2022, 2023, 2024, 2025, 2026].map(year => (
                                 <tr key={year} className="border-b last:border-0">
                                   <td className="px-3 py-2 font-medium">{year}</td>
                                   <td className="px-3 py-2 text-right">
                                     {formatCurrency(getConsultantRate(consultant.id, year))}
                                   </td>
                                 </tr>
                               ))}
                             </tbody>
                           </table>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit2 className="w-4 h-4 text-gray-500" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Consultant?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete {consultant.name} and all their records.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => deleteConsultant(consultant.id)}
                          className="bg-red-600"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-50 p-2 rounded">
              <p className="text-xs text-gray-500">Allocated (2026)</p>
              <p className="font-semibold text-purple-700">{totalAssignedHours2026} h</p>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <p className="text-xs text-gray-500">Worked ({currentYear})</p>
              <p className="font-semibold text-green-700">{annualHours.toFixed(2)} h</p>
            </div>
          </div>

          <div className="space-y-3">
             <div className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
               <Briefcase className="w-3 h-3" /> {assignments.length > 0 ? 'Assigned Projects (2026)' : 'Assignments'}
             </div>
             <div className="flex flex-wrap gap-2">
               {assignments.length > 0 ? (
                 assignments.map(a => (
                   <Badge key={`${a.projectId}-${a.year}`} variant="secondary" className="text-xs font-normal">
                     {a.projectName}: {a.allocatedHours}h
                   </Badge>
                 ))
               ) : (
                 <span className="text-xs text-gray-400">No 2026 assignments</span>
               )}
             </div>
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-xs flex items-center justify-center gap-1"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Hide Monthly Breakdown' : 'Show Monthly Breakdown'}
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>
          </div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-4 gap-2 mt-4">
                  {monthlyData.map((hours, idx) => (
                    <div key={idx} className="text-center p-1">
                      <p className="text-[10px] text-gray-500 uppercase">{months[idx]}</p>
                      <p className={`text-xs font-medium ${hours > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                        {hours > 0 ? hours.toFixed(1) : '-'}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ConsultantCard;