import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  LayoutGrid, 
  Clock, 
  Euro, 
  Wallet, 
  Database, 
  ShieldCheck, 
  BarChart3
} from 'lucide-react';
import { motion } from 'framer-motion';

const AdminHorizontalMenu = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'limits', label: 'Hours Limits', icon: Clock },
    { id: 'rates', label: '€ Tariffe', icon: Euro },
    { id: 'financials', label: 'Financials', icon: BarChart3 },
    { id: 'expenses', label: 'Spese', icon: Wallet },
    { id: 'recovery', label: 'Data Recovery', icon: Database },
    { id: 'security', label: 'Security', icon: ShieldCheck },
  ];

  return (
    <div className="w-full overflow-x-auto pb-1 pt-2">
      <div className="flex space-x-1 p-1 bg-white/50 rounded-lg border border-gray-200 backdrop-blur-sm min-w-max">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                isActive 
                  ? "text-blue-700 bg-blue-50 shadow-sm ring-1 ring-blue-200" 
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              )}
            >
              <Icon className={cn("w-4 h-4", isActive ? "text-blue-600" : "text-gray-500")} />
              <span className="relative z-10">{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-blue-50 rounded-md -z-0"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AdminHorizontalMenu;