import { useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useTimesheet } from '@/context/TimesheetContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';

export const useTimesheetExport = () => {
  const { entries, projects } = useTimesheet();
  const { consultants } = useAuth();
  const { toast } = useToast();

  const exportTimesheetData = useCallback((year) => {
    try {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      
      // Filter entries for the selected year
      const yearEntries = entries.filter(e => {
        try {
          return new Date(e.date).getFullYear() === parseInt(year);
        } catch {
          return false;
        }
      });

      // Group by consultant and project
      const groupedData = {};

      yearEntries.forEach(entry => {
        const consultant = consultants?.find(c => c.id === entry.consultantId);
        const project = projects?.find(p => p.id === entry.projectId);
        
        if (!consultant || !project) return;
        
        const key = `${entry.consultantId}_${entry.projectId}`;
        
        if (!groupedData[key]) {
          groupedData[key] = {
            consultantName: consultant.name,
            projectName: project.name,
            months: Array(12).fill(0),
            totalHours: 0
          };
        }
        
        const month = new Date(entry.date).getMonth();
        const hours = parseFloat(entry.hours || 0);
        
        groupedData[key].months[month] += hours;
        groupedData[key].totalHours += hours;
      });

      const exportRows = Object.values(groupedData).map(row => {
        const rowData = {
          "Consultant Name": row.consultantName,
          "Project Name": row.projectName,
        };
        
        monthNames.forEach((month, index) => {
          rowData[month] = row.months[index] > 0 ? row.months[index] : "";
        });
        
        rowData["Total Hours"] = row.totalHours;
        return rowData;
      });

      // Sort by consultant name, then project name
      exportRows.sort((a, b) => {
        if (a["Consultant Name"] === b["Consultant Name"]) {
          return a["Project Name"].localeCompare(b["Project Name"]);
        }
        return a["Consultant Name"].localeCompare(b["Consultant Name"]);
      });

      // Calculate totals per consultant
      let currentConsultant = "";
      let consultantTotal = 0;
      const finalExportData = [];

      exportRows.forEach((row, index) => {
        if (currentConsultant !== row["Consultant Name"]) {
          if (currentConsultant !== "") {
            // Add subtotal row
            finalExportData.push({
              "Consultant Name": `${currentConsultant} Total`,
              "Project Name": "",
              "Jan": "", "Feb": "", "Mar": "", "Apr": "", "May": "", "Jun": "",
              "Jul": "", "Aug": "", "Sep": "", "Oct": "", "Nov": "", "Dec": "",
              "Total Hours": consultantTotal
            });
          }
          currentConsultant = row["Consultant Name"];
          consultantTotal = 0;
        }
        
        consultantTotal += row["Total Hours"];
        finalExportData.push(row);
        
        // Add final subtotal
        if (index === exportRows.length - 1) {
          finalExportData.push({
            "Consultant Name": `${currentConsultant} Total`,
            "Project Name": "",
            "Jan": "", "Feb": "", "Mar": "", "Apr": "", "May": "", "Jun": "",
            "Jul": "", "Aug": "", "Sep": "", "Oct": "", "Nov": "", "Dec": "",
            "Total Hours": consultantTotal
          });
        }
      });

      if (finalExportData.length === 0) {
        toast({
          title: "No Data",
          description: `No timesheet entries found for year ${year}.`,
          variant: "destructive"
        });
        return;
      }

      // Create Excel workbook
      const ws = XLSX.utils.json_to_sheet(finalExportData);
      
      // Auto-size columns
      const wscols = [
        { wch: 25 }, // Consultant Name
        { wch: 30 }, // Project Name
        ...Array(12).fill({ wch: 8 }), // Months
        { wch: 12 }  // Total Hours
      ];
      ws['!cols'] = wscols;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Timesheets ${year}`);
      
      XLSX.writeFile(wb, `Timesheet_Report_${year}.xlsx`);
      
      toast({
        title: "Export Successful",
        description: `Timesheet report for ${year} has been downloaded.`,
      });

    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "An error occurred while generating the Excel file.",
        variant: "destructive"
      });
    }
  }, [entries, projects, consultants, toast]);

  return { exportTimesheetData };
};