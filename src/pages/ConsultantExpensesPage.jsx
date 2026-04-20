import React from 'react';
import ConsultantLayout from '@/components/ConsultantLayout';
import ConsultantExpensesSection from '@/components/ConsultantExpensesSection';

const ConsultantExpensesPage = () => {
  return (
    <ConsultantLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Le Mie Spese</h1>
          <p className="text-gray-500 mt-1">Rimborsi spese e note spese</p>
        </div>
        <ConsultantExpensesSection />
      </div>
    </ConsultantLayout>
  );
};

export default ConsultantExpensesPage;
