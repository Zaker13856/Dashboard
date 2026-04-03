import React, { useState } from 'react';
import { useTimesheet } from '@/context/TimesheetContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { Trash2, FolderOpen, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const ProjectCard = ({ project }) => {
  const { deleteProject, getProjectHours, getProjectMonthlyBreakdown } = useTimesheet();
  const { toast } = useToast();
  
  const totalHours = getProjectHours(project.id);
  const currentDate = new Date();
  const currentMonthHours = getProjectMonthlyBreakdown(
    project.id, 
    currentDate.getFullYear(), 
    currentDate.getMonth()
  );

  const handleDelete = () => {
    deleteProject(project.id);
    toast({
      title: "Project Deleted",
      description: `"${project.name}" and all its entries have been removed.`,
      variant: "default"
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
    >
      <Card className="bg-gradient-to-br from-white to-purple-50 border-purple-200 shadow-md hover:shadow-lg transition-all duration-300">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-lg">
              <FolderOpen className="w-5 h-5 text-purple-600" />
              {project.name}
            </span>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete "{project.name}" and all associated time entries. 
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Total Hours:
            </span>
            <span className="font-semibold text-purple-600">{totalHours.toFixed(2)}h</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">This Month:</span>
            <span className="font-semibold text-blue-600">{currentMonthHours.toFixed(2)}h</span>
          </div>
          <div className="pt-2 border-t border-purple-100">
            <p className="text-xs text-gray-500">
              Created {new Date(project.createdAt).toLocaleDateString()}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ProjectCard;