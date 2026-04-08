import React from 'react';
import ConsultantLayout from '@/components/ConsultantLayout';
import TimesheetMonthForm from '@/components/TimesheetMonthForm';

const ConsultantTimesheetPage = () => {
  return (
    <ConsultantLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Timesheet</h1>
          <p className="text-gray-500 mt-1">Inserimento ore lavorate mensili</p>
        </div>
        <TimesheetMonthForm />
      </div>
    </ConsultantLayout>
  );
};

export default ConsultantTimesheetPage;
