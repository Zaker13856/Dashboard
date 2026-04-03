import React, { useState } from 'react';
import { useTimesheet } from '@/context/TimesheetContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/components/ui/use-toast';
import { Plus, Calendar, Euro, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';

const ProjectForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    expensesBudget: '',
    subcontractsBudget: '',
    allocatedMonths: '',
    monthlyRate: '',
    status: 'In Progress',
    startDate: '',
    endDate: ''
  });
  
  const { addProject } = useTimesheet();
  const { toast } = useToast();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value) => {
    setFormData(prev => ({ ...prev, status: value }));
  };

  const calculateDurationMonths = (start, end) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    return (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Basic Validation
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Project name cannot be empty.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      toast({
        title: "Validation Error",
        description: "Please select both start and end dates.",
        variant: "destructive"
      });
      return;
    }

    // Numerical Conversions
    const expensesBudget = parseFloat(formData.expensesBudget) || 0;
    const subcontractsBudget = parseFloat(formData.subcontractsBudget) || 0;
    const allocatedMonths = parseFloat(formData.allocatedMonths) || 0;
    const monthlyRate = parseFloat(formData.monthlyRate) || 0;

    if (expensesBudget < 0 || subcontractsBudget < 0 || allocatedMonths < 0 || monthlyRate < 0) {
       toast({
        title: "Validation Error",
        description: "Budget and rate values cannot be negative.",
        variant: "destructive"
      });
      return;
    }

    // Calculated Fields
    const estimatedHours = allocatedMonths * 143.33;
    const totalValue = allocatedMonths * monthlyRate;
    const durationMonths = calculateDurationMonths(formData.startDate, formData.endDate);

    const newProject = {
        name: formData.name.trim(),
        expensesBudget,
        subcontractsBudget,
        allocatedMonths,
        monthlyRate,
        status: formData.status,
        startDate: formData.startDate,
        endDate: formData.endDate,
        estimatedHours, // Derived automatically
        totalValue,     // Derived automatically
        durationMonths  // Derived automatically
    };

    addProject(newProject);
    
    toast({
      title: "Success!",
      description: `Project "${formData.name}" has been created.`,
      variant: "default"
    });
    
    // Reset Form
    setFormData({
      name: '',
      expensesBudget: '',
      subcontractsBudget: '',
      allocatedMonths: '',
      monthlyRate: '',
      status: 'In Progress',
      startDate: '',
      endDate: ''
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="bg-gradient-to-br from-white to-gray-50 border-gray-200 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-600" />
            Create New Project
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Project Name */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Project Name</Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Enter project name..."
                  value={formData.name}
                  onChange={handleChange}
                  className="pl-9 transition-all duration-200 hover:border-blue-400 focus:border-blue-500"
                />
              </div>
            </div>
            
            {/* Budgets Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="expensesBudget">Expenses Budget (€)</Label>
                <div className="relative">
                  <Euro className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    id="expensesBudget"
                    name="expensesBudget"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.expensesBudget}
                    onChange={handleChange}
                    className="pl-9 transition-all duration-200 hover:border-blue-400 focus:border-blue-500"
                  />
                </div>
                <p className="text-[10px] text-gray-500">Travel, Mission, Meals, etc.</p>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="subcontractsBudget">Subcontracts Budget (€)</Label>
                <div className="relative">
                  <Euro className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    id="subcontractsBudget"
                    name="subcontractsBudget"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="es. 5000"
                    value={formData.subcontractsBudget}
                    onChange={handleChange}
                    className="pl-9 transition-all duration-200 hover:border-blue-400 focus:border-blue-500"
                  />
                </div>
                <p className="text-[10px] text-gray-500">Subcontracted services (Optional)</p>
              </div>
            </div>

            {/* Allocation & Rate Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="allocatedMonths">Allocated Months</Label>
                <Input
                  id="allocatedMonths"
                  name="allocatedMonths"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="e.g. 24"
                  value={formData.allocatedMonths}
                  onChange={handleChange}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="monthlyRate">Monthly Rate (€)</Label>
                <div className="relative">
                  <Euro className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    id="monthlyRate"
                    name="monthlyRate"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.monthlyRate}
                    onChange={handleChange}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={handleSelectChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="On Hold">On Hold</SelectItem>
                  <SelectItem value="Planned">Planned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dates Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="startDate">Start Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    id="startDate"
                    name="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={handleChange}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="endDate">End Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    id="endDate"
                    name="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={handleChange}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-2 transition-all duration-200 hover:shadow-md"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ProjectForm;