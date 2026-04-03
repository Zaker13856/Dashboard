
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import '@/index.css';
import { migrateData } from '@/lib/migrateLocalStorageToSupabase';

const Root = () => {
  const [isMigrating, setIsMigrating] = useState(true);

  useEffect(() => {
    const runMigration = async () => {
      await migrateData();
      setIsMigrating(false);
    };
    runMigration();
  }, []);

  if (isMigrating) {
    return <div className="flex h-screen items-center justify-center">Migrating data...</div>;
  }

  return <App />;
};

ReactDOM.createRoot(document.getElementById('root')).render(<Root />);
