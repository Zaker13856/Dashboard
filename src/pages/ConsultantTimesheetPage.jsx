import React from 'react';
import ConsultantLayout from '@/components/ConsultantLayout';
import { Clock } from 'lucide-react';

const ConsultantTimesheetPage = () => {
  return (
    <ConsultantLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Timesheet</h1>
          <p className="text-gray-500 mt-1">Inserimento ore lavorate</p>
        </div>
        <div className="flex items-center justify-center h-64 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
          <div className="text-center space-y-2">
            <Clock className="w-10 h-10 mx-auto opacity-30" />
            <p className="text-sm">In costruzione</p>
          </div>
        </div>
      </div>
    </ConsultantLayout>
  );
};

export default ConsultantTimesheetPage;
