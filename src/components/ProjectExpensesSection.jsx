import React, { useState, useMemo } from 'react';
import { useExpenses } from '@/context/ExpenseContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Trash2, FileSpreadsheet, Loader2 } from 'lucide-react';
import { exportProjectExpenses, exportProjectExpensesDetailed } from '@/lib/excelExporter';
import { useToast } from '@/components/ui/use-toast';

const ProjectExpensesSection = ({ projectId, projectName }) => {
  const { 
    getExpensesByProject, 
    getSubcontractsByProject, 
    getOtherCostsByProject,
    updateSubcontract,
    deleteSubcontract,
    updateOtherCost,
    deleteOtherCost
  } = useExpenses();
  const { toast } = useToast();

  // --- State for Dialogs and UI ---
  const [isSubDialogOpen, setIsSubDialogOpen] = useState(false);
  const [editingSub, setEditingSub] = useState(null); 
  
  const [isOtherDialogOpen, setIsOtherDialogOpen] = useState(false);
  const [editingOther, setEditingOther] = useState(null);

  const [deleteId, setDeleteId] = useState(null);
  const [deleteType, setDeleteType] = useState(null); // 'sub', 'other'
  
  const [isExporting, setIsExporting] = useState(false);

  // --- Data Fetching ---
  const consultantExpenses = getExpensesByProject(projectId) || [];
  const subcontracts = getSubcontractsByProject(projectId) || [];
  const otherCosts = getOtherCostsByProject(projectId) || [];

  // --- Totals ---
  const totals = useMemo(() => {
    const cons = consultantExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const subs = subcontracts.reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);
    const others = otherCosts.reduce((sum, o) => sum + parseFloat(o.amount || 0), 0);
    return {
      consultants: cons,
      subcontracts: subs,
      otherCosts: others,
      grandTotal: cons + subs + others
    };
  }, [consultantExpenses, subcontracts, otherCosts]);

  // --- Handlers ---
  const confirmDelete = () => {
    if (deleteId) {
      if (deleteType === 'sub') {
        deleteSubcontract(deleteId);
        toast({ title: "Subcontract deleted" });
      } else if (deleteType === 'other') {
        deleteOtherCost(deleteId);
        toast({ title: "Other cost deleted" });
      }
      setDeleteId(null);
      setDeleteType(null);
    }
  };

  const handleExport = () => {
    exportProjectExpenses({
      projectName,
      consultantExpenses,
      subcontracts,
      otherCosts,
      totals
    });
    toast({ title: "Download started", description: "Full report Excel file generated." });
  };

  const handleDetailedExport = () => {
    setIsExporting(true);
    try {
      setTimeout(() => { // Simulate processing time for better UX
        exportProjectExpensesDetailed({
          projectName,
          subcontracts,
          otherCosts
        });
        toast({ title: "Export Successful", description: "Detailed expenses downloaded." });
        setIsExporting(false);
      }, 500);
    } catch (error) {
      console.error(error);
      toast({ title: "Export Failed", description: "Could not generate the Excel file.", variant: "destructive" });
      setIsExporting(false);
    }
  };

  const handleEditSub = (sub) => {
    setEditingSub({ ...sub });
    setIsSubDialogOpen(true);
  };

  const saveSub = () => {
    if (editingSub) {
      updateSubcontract(editingSub.id, {
        providerName: editingSub.providerName,
        description: editingSub.description,
        amount: parseFloat(editingSub.amount)
      });
      setIsSubDialogOpen(false);
      setEditingSub(null);
      toast({ title: "Updated", description: "Subcontract updated" });
    }
  };

  const handleEditOther = (cost) => {
    setEditingOther({ ...cost });
    setIsOtherDialogOpen(true);
  };

  const saveOther = () => {
    if (editingOther) {
      updateOtherCost(editingOther.id, {
        description: editingOther.description,
        amount: parseFloat(editingOther.amount)
      });
      setIsOtherDialogOpen(false);
      setEditingOther(null);
      toast({ title: "Updated", description: "Other cost updated" });
    }
  };

  return (
    <Card className="mb-8 border-l-4 border-l-blue-600 shadow-sm overflow-hidden">
      <CardHeader className="bg-gray-50 flex flex-row items-center justify-between pb-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <CardTitle className="text-xl font-bold text-gray-800">{projectName}</CardTitle>
            <Button 
              onClick={handleDetailedExport} 
              disabled={isExporting}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm h-8 px-3"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4 mr-2" />
              )}
               Esporta in Excel
            </Button>
          </div>
          <div className="text-sm text-gray-500">Project ID: {projectId}</div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
              <span className="text-sm text-gray-500 font-medium uppercase tracking-wide">Consumed Total</span>
              <span className="text-2xl font-extrabold text-blue-700">€ {totals.grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-8 pt-6">
        
        {/* Subcontracts Section */}
        <section>
          <div className="flex items-center justify-between mb-3 border-b pb-2">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              Subcontracts
            </h3>
            <span className="font-bold text-gray-900">€ {totals.subcontracts.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
          </div>
          
          {subcontracts.length > 0 ? (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subcontracts.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{sub.providerName}</TableCell>
                      <TableCell>{sub.description}</TableCell>
                      <TableCell className="text-right font-medium">€ {parseFloat(sub.amount).toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => handleEditSub(sub)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => { setDeleteId(sub.id); setDeleteType('sub'); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic py-2">No subcontracts recorded.</p>
          )}
        </section>

        {/* Other Costs Section */}
        <section>
          <div className="flex items-center justify-between mb-3 border-b pb-2">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Other Costs
            </h3>
            <span className="font-bold text-gray-900">€ {totals.otherCosts.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
          </div>

          {otherCosts.length > 0 ? (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {otherCosts.map((cost) => (
                    <TableRow key={cost.id}>
                      <TableCell className="font-medium">{cost.description}</TableCell>
                      <TableCell className="text-right font-medium">€ {parseFloat(cost.amount).toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => handleEditOther(cost)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => { setDeleteId(cost.id); setDeleteType('other'); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
             <p className="text-sm text-gray-400 italic py-2">No other costs recorded.</p>
          )}
        </section>

        {/* Footer Actions */}
        <div className="pt-6 border-t flex justify-between items-center bg-gray-50/50 -mx-6 -mb-6 px-6 py-4 mt-4">
           <div className="text-sm text-gray-500">
             Export full report including Consultant Expenses
           </div>
           <Button onClick={handleExport} variant="outline" size="sm">
             <FileSpreadsheet className="w-4 h-4 mr-2" />
             Download Complete Project Report
           </Button>
        </div>

      </CardContent>

      {/* Inline Edit Dialogs */}
      <Dialog open={isSubDialogOpen} onOpenChange={setIsSubDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subcontract</DialogTitle>
          </DialogHeader>
          {editingSub && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                 <Label>Provider Name</Label>
                 <Input 
                    value={editingSub.providerName || ''} 
                    onChange={e => setEditingSub({...editingSub, providerName: e.target.value})} 
                 />
              </div>
              <div className="space-y-2">
                 <Label>Description</Label>
                 <Input 
                    value={editingSub.description || ''} 
                    onChange={e => setEditingSub({...editingSub, description: e.target.value})} 
                 />
              </div>
              <div className="space-y-2">
                 <Label>Amount (€)</Label>
                 <Input 
                    type="number"
                    value={editingSub.amount || 0} 
                    onChange={e => setEditingSub({...editingSub, amount: e.target.value})} 
                 />
              </div>
              <DialogFooter>
                 <Button variant="outline" onClick={() => setIsSubDialogOpen(false)}>Cancel</Button>
                 <Button onClick={saveSub}>Save Changes</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isOtherDialogOpen} onOpenChange={setIsOtherDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Other Cost</DialogTitle>
          </DialogHeader>
          {editingOther && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                 <Label>Description</Label>
                 <Input 
                    value={editingOther.description || ''} 
                    onChange={e => setEditingOther({...editingOther, description: e.target.value})} 
                 />
              </div>
              <div className="space-y-2">
                 <Label>Amount (€)</Label>
                 <Input 
                    type="number"
                    value={editingOther.amount || 0} 
                    onChange={e => setEditingOther({...editingOther, amount: e.target.value})} 
                 />
              </div>
              <DialogFooter>
                 <Button variant="outline" onClick={() => setIsOtherDialogOpen(false)}>Cancel</Button>
                 <Button onClick={saveOther}>Save Changes</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <div className="text-sm text-gray-500">
              This item will be permanently removed from the project.
            </div>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </Card>
  );
};

export default ProjectExpensesSection;