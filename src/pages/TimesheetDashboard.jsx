import React from 'react';
import { Helmet } from 'react-helmet';
import { TimesheetProvider, useTimesheet } from '@/context/TimesheetContext';
import ProjectForm from '@/components/ProjectForm';
import DailyEntryForm from '@/components/DailyEntryForm';
import ProjectCard from '@/components/ProjectCard';
import MonthlyStats from '@/components/MonthlyStats';
import AnnualStats from '@/components/AnnualStats';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';

const DashboardContent = () => {
  const { projects } = useTimesheet();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 p-4 md:p-8">
      <Helmet>
        <title>Timesheet Tracker - Manage Your Work Hours</title>
        <meta 
          name="description" 
          content="Track your work hours efficiently with our timesheet tracker. Manage projects, log daily entries, and monitor monthly and annual hour limits."
        />
      </Helmet>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-7xl mx-auto mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg shadow-lg">
            <Clock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Timesheet Tracker
          </h1>
        </div>
        <p className="text-gray-600 ml-16">
          Track your work hours and manage projects efficiently
        </p>
      </motion.div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Stats Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MonthlyStats />
          <AnnualStats />
        </div>

        {/* Forms Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProjectForm />
          <DailyEntryForm />
        </div>

        {/* Projects Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></span>
            Your Projects
          </h2>
          
          {projects.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
              <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-2">No projects yet</p>
              <p className="text-gray-400 text-sm">Create your first project to start tracking time</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <ProjectCard project={project} />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

const TimesheetDashboard = () => {
  return (
    <TimesheetProvider>
      <DashboardContent />
    </TimesheetProvider>
  );
};

export default TimesheetDashboard;