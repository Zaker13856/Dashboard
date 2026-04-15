import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const pctColor = (pct) => {
  if (pct > 100) return 'bg-red-100 text-red-800 font-bold';
  if (pct > 85)  return 'bg-orange-100 text-orange-700 font-semibold';
  if (pct > 60)  return 'bg-yellow-50 text-yellow-700';
  return 'text-green-700';
};

const ReportsPage = () => {
  const [loading, setLoading] = useState(true);
  const [consultants, setConsultants] = useState([]);
  const [matrix, setMatrix] = useState({});
  const [years, setYears] = useState([]);
  const curYear = new Date().getFullYear();

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);

    const [{ data: cons }, { data: allocs }, { data: rates }] = await Promise.all([
      supabase.from('consultants').select('id, name').order('name'),
      supabase.from('allocations').select('consultant_id, allocated_hours, project_periods(year, projects(is_lump_sum))'),
      supabase.from('consultant_rates').select('consultant_id, year, ore_max'),
    ]);

    const mat = {};

    for (const r of (rates || [])) {
      if (!r.ore_max) continue;
      if (!mat[r.year]) mat[r.year] = {};
      if (!mat[r.year][r.consultant_id]) mat[r.year][r.consultant_id] = { ore_allocate: 0, ore_max: 0 };
      mat[r.year][r.consultant_id].ore_max = r.ore_max;
    }

    for (const a of (allocs || [])) {
      const year = a.project_periods?.year;
      if (!year) continue;
      if (a.project_periods?.projects?.is_lump_sum) continue; // Lump Sum: ore escluse dai totali
      if (!mat[year]) mat[year] = {};
      if (!mat[year][a.consultant_id]) mat[year][a.consultant_id] = { ore_allocate: 0, ore_max: 0 };
      mat[year][a.consultant_id].ore_allocate += parseFloat(a.allocated_hours) || 0;
    }

    const filtered = (cons || []);

    const allYears = Object.keys(mat).map(Number).sort();

    setConsultants(filtered);
    setMatrix(mat);
    setYears(allYears);
    setLoading(false);
  };

  const METRICS = [
    { key: 'ore_allocate', label: 'Ore allocate' },
    { key: 'ore_max',      label: 'Ore max' },
    { key: 'disponibili',  label: 'Disponibili' },
    { key: 'utilizzo',     label: '% Utilizzo' },
  ];

  const getValue = (year, cId, key) => {
    const d = matrix[year]?.[cId] || {};
    const alloc = d.ore_allocate || 0;
    const max   = d.ore_max || 0;
    if (key === 'ore_allocate') return alloc;
    if (key === 'ore_max')      return max;
    if (key === 'disponibili')  return max - alloc;
    if (key === 'utilizzo')     return max > 0 ? Math.round((alloc / max) * 100) : null;
    return null;
  };

  const renderCell = (year, cId, key) => {
    const v = getValue(year, cId, key);
    const d = matrix[year]?.[cId];
    if (!d && key !== 'utilizzo') return <span className="text-gray-200">—</span>;

    if (key === 'utilizzo') {
      if (v === null) return <span className="text-gray-200">—</span>;
      return (
        <span className={cn('px-1.5 py-0.5 rounded text-[11px]', pctColor(v))}>
          {v}%
        </span>
      );
    }
    if (key === 'disponibili') {
      const color = v < 0 ? 'text-red-600 font-bold' : v === 0 ? 'text-gray-400' : 'text-gray-700';
      return <span className={color}>{Math.round(v)}</span>;
    }
    if (v === 0) return <span className="text-gray-200">—</span>;
    return <span>{Math.round(v)}</span>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6 pb-12">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Reports</h1>
          <p className="text-gray-500 mt-1">Controllo risorse per anno e consulente</p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Caricamento...</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="text-xs min-w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-300">
                  <th className="sticky left-0 z-20 bg-gray-100 px-3 py-2.5 text-left font-semibold text-gray-600 w-8">Anno</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600 w-28"></th>
                  {consultants.map(c => {
                    const parts = c.name.split(' ');
                    return (
                      <th key={c.id} className="px-2 py-2 text-center font-semibold text-gray-700 min-w-[80px]">
                        <div>{parts[0]}</div>
                        <div className="font-normal text-gray-400">{parts.slice(1).join(' ')}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {years.map((year, yi) => {
                  const isPast    = year < curYear;
                  const isCurrent = year === curYear;
                  const yearBg    = isPast ? 'bg-gray-50' : isCurrent ? 'bg-blue-50/40' : 'bg-white';
                  const borderTop = yi > 0 ? 'border-t-2 border-gray-200' : '';

                  return METRICS.map((m, mi) => (
                    <tr key={`${year}-${m.key}`}
                      className={cn(
                        yearBg,
                        mi === 0 ? borderTop : 'border-t border-gray-100',
                        m.key === 'utilizzo' ? 'pb-1' : ''
                      )}>

                      {/* Year cell — only on first metric row */}
                      {mi === 0 ? (
                        <td rowSpan={4}
                          className={cn(
                            'sticky left-0 z-10 px-3 text-center font-bold text-gray-900 border-r border-gray-200',
                            yearBg
                          )}>
                          {year}
                          {isCurrent && <div className="text-[10px] text-blue-400 font-normal">●</div>}
                        </td>
                      ) : null}

                      {/* Metric label */}
                      <td className={cn('px-3 py-1.5 text-gray-500 whitespace-nowrap', yearBg)}>
                        {m.label}
                      </td>

                      {/* Values */}
                      {consultants.map(c => (
                        <td key={c.id} className={cn('px-2 py-1.5 text-center', yearBg,
                          m.key === 'utilizzo' ? 'pb-2' : '')}>
                          {renderCell(year, c.id, m.key)}
                        </td>
                      ))}
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ReportsPage;
