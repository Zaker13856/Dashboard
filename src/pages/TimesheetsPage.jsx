import React, { useState, useMemo } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, Download, AlertTriangle, Calendar } from 'lucide-react';
import { useTimesheet } from '@/context/TimesheetContext';
import { useAuth } from '@/context/AuthContext';
import { useTimesheetExport } from '@/hooks/useTimesheetExport';

const TimesheetsPage = () => {
  const { entries, projects, getConsultantLimits } = useTimesheet();
  const { consultants } = useAuth();
  const { exportTimesheetData } = useTimesheetExport();
  
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const availableYears = ['2023', '2024', '2025', '2026', '2027'];

  // Process Annual Data
  const annualData = useMemo(() => {
    const yearEntries = entries.filter(e => {
      try { return new Date(e.date).getFullYear() === parseInt(selectedYear); }
      catch { return false; }
    });

    const grouped = {};
    yearEntries.forEach(entry => {
      const consultant = consultants?.find(c => c.id === entry.consultantId);
      const project = projects?.find(p => p.id === entry.projectId);
      if (!consultant || !project) return;
      
      const key = `${entry.consultantId}_${entry.projectId}`;
      if (!grouped[key]) {
        grouped[key] = {
          consultantId: entry.consultantId,
          consultantName: consultant.name,
          projectId: entry.projectId,
          projectName: project.name,
          months: Array(12).fill(0),
          totalHours: 0
        };
      }
      
      const month = new Date(entry.date).getMonth();
      const hours = parseFloat(entry.hours || 0);
      grouped[key].months[month] += hours;
      grouped[key].totalHours += hours;
    });

    return Object.values(grouped).sort((a, b) => {
      if (a.consultantName === b.consultantName) return a.projectName.localeCompare(b.projectName);
      return a.consultantName.localeCompare(b.consultantName);
    });
  }, [entries, projects, consultants, selectedYear]);

  // Process Monthly Control Data
  const monthlyData = useMemo(() => {
    const monthEntries = entries.filter(e => {
      try { 
        const d = new Date(e.date);
        return d.getFullYear() === parseInt(selectedYear) && d.getMonth() === parseInt(selectedMonth);
      }
      catch { return false; }
    });

    const consultantTotals = {};
    const detailedList = [];

    monthEntries.forEach(entry => {
      const consultant = consultants?.find(c => c.id === entry.consultantId);
      const project = projects?.find(p => p.id === entry.projectId);
      if (!consultant || !project) return;
      
      const hours = parseFloat(entry.hours || 0);
      
      if (!consultantTotals[consultant.id]) {
        consultantTotals[consultant.id] = {
          id: consultant.id,
          name: consultant.name,
          totalHours: 0,
          limit: getConsultantLimits(consultant.id, parseInt(selectedYear)).monthly
        };
      }
      consultantTotals[consultant.id].totalHours += hours;

      const existingDetail = detailedList.find(d => d.consultantId === consultant.id && d.projectId === project.id);
      if (existingDetail) {
        existingDetail.hours += hours;
      } else {
        detailedList.push({
          consultantId: consultant.id,
          consultantName: consultant.name,
          projectId: project.id,
          projectName: project.name,
          hours: hours
        });
      }
    });

    detailedList.sort((a, b) => a.consultantName.localeCompare(b.consultantName));

    return { details: detailedList, totals: Object.values(consultantTotals) };
  }, [entries, projects, consultants, selectedYear, selectedMonth, getConsultantLimits]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Timesheets Overview</h1>
            <p className="text-gray-500">Review time entries, monthly controls, and export data.</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[120px] bg-white">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => exportTimesheetData(selectedYear)} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export Excel
            </Button>
          </div>
        </div>

        <Tabs defaultValue="annual" className="w-full">
          <TabsList className="bg-white border rounded-md p-1 mb-4">
            <TabsTrigger value="annual" className="data-[state=active]:bg-gray-100">Annual View</TabsTrigger>
            <TabsTrigger value="monthly" className="data-[state=active]:bg-gray-100">Monthly Control</TabsTrigger>
          </TabsList>

          <TabsContent value="annual" className="m-0">
            <Card className="border shadow-sm">
              <CardHeader className="bg-gray-50 border-b pb-4">
                <CardTitle className="text-lg flex items-center gap-2 text-gray-800">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Annual Timesheet Summary ({selectedYear})
                </CardTitle>
                <CardDescription>Comprehensive overview of all consultant hours per project.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="font-semibold text-gray-700 w-[200px]">Consultant Name</TableHead>
                        <TableHead className="font-semibold text-gray-700 w-[200px]">Project Name</TableHead>
                        {monthNames.map(month => (
                          <TableHead key={month} className="font-semibold text-gray-700 text-center">{month}</TableHead>
                        ))}
                        <TableHead className="font-semibold text-gray-900 text-right bg-blue-50/50">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {annualData.length > 0 ? (
                        annualData.map((row, idx) => (
                          <TableRow key={idx} className="hover:bg-gray-50 transition-colors">
                            <TableCell className="font-medium text-gray-900">{row.consultantName}</TableCell>
                            <TableCell className="text-gray-600">{row.projectName}</TableCell>
                            {row.months.map((hours, mIdx) => (
                              <TableCell key={mIdx} className="text-center text-gray-500">
                                {hours > 0 ? hours.toFixed(1) : '-'}
                              </TableCell>
                            ))}
                            <TableCell className="text-right font-bold text-gray-900 bg-blue-50/20">
                              {row.totalHours.toFixed(1)}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={15} className="text-center py-8 text-gray-500">
                            No timesheet data available for {selectedYear}.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monthly" className="m-0">
            <Card className="border shadow-sm">
              <CardHeader className="bg-gray-50 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2 text-gray-800">
                    <Clock className="w-5 h-5 text-orange-600" />
                    Monthly Control View
                  </CardTitle>
                  <CardDescription>Detailed breakdown and limit validation for specific month.</CardDescription>
                </div>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[150px] bg-white">
                    <SelectValue placeholder="Select Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthNames.map((month, idx) => (
                      <SelectItem key={idx} value={idx.toString()}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x">
                  {/* Detailed List */}
                  <div className="lg:col-span-2 overflow-x-auto p-4">
                    <h3 className="font-semibold text-gray-700 mb-4">Project Breakdown</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Consultant</TableHead>
                          <TableHead>Project</TableHead>
                          <TableHead className="text-right">Hours Logged</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monthlyData.details.length > 0 ? (
                          monthlyData.details.map((detail, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{detail.consultantName}</TableCell>
                              <TableCell>{detail.projectName}</TableCell>
                              <TableCell className="text-right font-semibold">{detail.hours.toFixed(1)}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-6 text-gray-500">
                              No entries for {monthNames[parseInt(selectedMonth)]} {selectedYear}.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Monthly Limits Check */}
                  <div className="p-4 bg-gray-50/50">
                    <h3 className="font-semibold text-gray-700 mb-4">Limit Validation</h3>
                    <div className="space-y-4">
                      {monthlyData.totals.length > 0 ? (
                        monthlyData.totals.map(total => {
                          const isOverLimit = total.totalHours > total.limit;
                          return (
                            <div key={total.id} className="bg-white p-3 rounded-md border shadow-sm">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-medium text-gray-900">{total.name}</span>
                                {isOverLimit && <AlertTriangle className="w-4 h-4 text-red-500" />}
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Logged: <span className={`font-bold ${isOverLimit ? 'text-red-600' : 'text-gray-900'}`}>{total.totalHours.toFixed(1)}h</span></span>
                                <span className="text-gray-400">Limit: {total.limit}h</span>
                              </div>
                              <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                                <div 
                                  className={`h-1.5 rounded-full ${isOverLimit ? 'bg-red-500' : 'bg-green-500'}`} 
                                  style={{ width: `${Math.min((total.totalHours / total.limit) * 100, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <p className="text-sm text-gray-500 italic">No limit data to display.</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default TimesheetsPage;