import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTimesheet } from '@/context/TimesheetContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Database, Activity, AlertTriangle, RotateCcw, ShieldCheck } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const AdminDataRecovery = () => {
  const { consultants } = useAuth();
  const { 
    projects = [], 
    timesheets = [], 
    getConsultantAllocatedHours, 
    getAnnualHours, 
    getAssignmentsByYear, 
    restoreDefaultAllocations,
    recoverDiamondConsultants 
  } = useTimesheet();
  
  const { toast } = useToast();
  
  const [reportData, setReportData] = useState([]);
  const [lastDiag, setLastDiag] = useState(null);
  const [recoveryStatus, setRecoveryStatus] = useState(null);
  
  const currentYear = 2026;

  // Memoize the diagnostic function to prevent recreation on every render
  const runDataDiagnostics = useCallback(() => {
    const safeProjects = projects || [];
    
    let totalAssignments = 0;
    let projectsWithAssignments = 0;

    safeProjects.forEach(p => {
      if (p.consultants && Array.isArray(p.consultants) && p.consultants.length > 0) {
        projectsWithAssignments++;
        totalAssignments += p.consultants.length;
      }
    });

    return {
      projectsCount: safeProjects.length,
      projectsWithAssignments,
      totalAssignments,
      limitsEntries: 0
    };
  }, [projects]);

  // Memoize refreshReport to be stable
  const refreshReport = useCallback(() => {
    const data = consultants.map(c => {
      const allocated = getConsultantAllocatedHours(c.id, currentYear);
      const worked = getAnnualHours(currentYear, c.id);
      const assignments = getAssignmentsByYear(currentYear, c.id);
      
      return {
        id: c.id,
        name: c.name,
        allocated,
        worked,
        assignmentsCount: assignments.length,
        hasIssues: allocated === 0 && assignments.length > 0
      };
    });
    setReportData(data);
    
    const diag = runDataDiagnostics();
    setLastDiag(diag);
  }, [consultants, currentYear, getConsultantAllocatedHours, getAnnualHours, getAssignmentsByYear, runDataDiagnostics]);

  // Use stringified versions of complex objects to prevent infinite loops 
  // caused by unstable object references from Context
  const consultantsStr = JSON.stringify(consultants);
  const projectsStr = JSON.stringify(projects);
  const timesheetsStr = JSON.stringify(timesheets);

  useEffect(() => {
    refreshReport();
    // We depend on the stringified values to ensure we only update when CONTENT changes,
    // not just when the array reference changes (which happens often with Context).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultantsStr, projectsStr, timesheetsStr]);

  const handleForceSync = () => {
    if (restoreDefaultAllocations) {
        restoreDefaultAllocations();
        toast({
            title: "Sync Triggered",
            description: "Forced a re-save of current context data to storage.",
            variant: "default"
        });
        refreshReport();
    } else {
        toast({
            title: "Sync Unavailable",
            description: "The restore function is not available in the current context.",
            variant: "destructive"
        });
    }
  };

  const handleDiamondRecovery = () => {
    if (recoverDiamondConsultants) {
        const result = recoverDiamondConsultants();
        setRecoveryStatus({
            timestamp: new Date().toLocaleTimeString(),
            count: result.count,
            source: result.source
        });
        
        toast({
            title: "Recovery Successful",
            description: `Restored ${result.count} consultant assignments for DIAMOND project from ${result.source}.`,
            className: "bg-green-50 border-green-200 text-green-900",
        });
        
        refreshReport();
    } else {
        toast({
            title: "Recovery Error",
            description: "Recovery function not found in context.",
            variant: "destructive"
        });
    }
  };

  return (
    <div className="space-y-6">
       
       {/* Recovery Actions Panel */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <Card className="border-l-4 border-l-blue-500 shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-blue-600" />
                    Project Allocation Recovery
                </CardTitle>
                <CardDescription>
                    Restore deleted consultant assignments for specific projects.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 mb-4">
                    <h4 className="font-semibold text-sm text-blue-900 mb-1">DIAMOND Project</h4>
                    <p className="text-xs text-blue-700 mb-3">
                        Use this to recover lost consultant allocations (e.g., Daniel Cassola) if they were accidentally cleared.
                    </p>
                    <Button 
                        onClick={handleDiamondRecovery} 
                        size="sm" 
                        className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                        <RotateCcw className="w-4 h-4 mr-2" /> Recover Deleted Consultants
                    </Button>
                </div>
                {recoveryStatus && (
                    <div className="text-xs text-green-600 flex items-center justify-between p-2 bg-green-50 rounded border border-green-100">
                        <span>Restored {recoveryStatus.count} items</span>
                        <span className="font-mono">{recoveryStatus.timestamp}</span>
                    </div>
                )}
            </CardContent>
         </Card>

         <Card className="border-l-4 border-l-amber-500 shadow-sm">
            <CardHeader className="pb-2">
               <div className="flex justify-between items-start">
                  <div>
                      <CardTitle className="flex items-center gap-2 text-base">
                          <Database className="w-5 h-5 text-amber-600" />
                          Global Diagnostics ({currentYear})
                      </CardTitle>
                      <CardDescription>
                          Monitor data integrity and sync status.
                      </CardDescription>
                  </div>
               </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                   {lastDiag && (
                       <div className="p-3 bg-gray-50 border rounded text-xs font-mono text-gray-600 grid grid-cols-2 gap-2">
                          <div>Projects: <span className="font-bold">{lastDiag.projectsCount}</span></div>
                          <div>Assigned: <span className="font-bold">{lastDiag.projectsWithAssignments}</span></div>
                          <div>Allocations: <span className="font-bold">{lastDiag.totalAssignments}</span></div>
                       </div>
                   )}
                   <div className="flex gap-2">
                      <Button variant="outline" onClick={refreshReport} size="sm" className="flex-1">
                          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                      </Button>
                      <Button variant="default" onClick={handleForceSync} size="sm" className="flex-1 bg-amber-600 hover:bg-amber-700">
                          <Activity className="w-4 h-4 mr-2" /> Force Save
                      </Button>
                   </div>
                </div>
            </CardContent>
         </Card>
       </div>

       {/* Detailed Report Table */}
       <Card>
          <CardHeader className="py-4">
              <CardTitle className="text-sm font-semibold">Consultant Allocation Status</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
             <Table>
                <TableHeader className="bg-gray-50">
                    <TableRow>
                        <TableHead>Consultant</TableHead>
                        <TableHead className="text-center">Allocated ({currentYear})</TableHead>
                        <TableHead className="text-center">Worked ({currentYear})</TableHead>
                        <TableHead className="text-center">Assignments</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {reportData.map(row => (
                        <TableRow key={row.id}>
                            <TableCell className="font-medium">
                                {row.name}
                                <div className="text-[10px] text-gray-400">{row.id}</div>
                            </TableCell>
                            <TableCell className="text-center font-mono">
                                {row.allocated.toFixed(1)} h
                            </TableCell>
                            <TableCell className="text-center font-mono">
                                {row.worked.toFixed(1)} h
                            </TableCell>
                            <TableCell className="text-center">
                                <Badge variant="outline">{row.assignmentsCount}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                {row.hasIssues ? (
                                    <Badge variant="destructive" className="text-[10px]">Mismatch</Badge>
                                ) : row.allocated > 0 ? (
                                    <Badge variant="secondary" className="bg-green-100 text-green-800 text-[10px]">Active</Badge>
                                ) : (
                                    <Badge variant="secondary" className="text-[10px] text-gray-500">Idle</Badge>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
             
             <div className="m-4 p-3 bg-amber-50 rounded-md border border-amber-100 text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> 
                <p>
                    <strong>Note:</strong> Allocations are stored within Project records. "Force Save" ensures the current memory state is written to browser storage. Use "Recover" above to restore specific project data.
                </p>
             </div>
          </CardContent>
       </Card>
    </div>
  );
};

export default AdminDataRecovery;