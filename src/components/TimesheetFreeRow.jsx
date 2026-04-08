import React from 'react';
import { X } from 'lucide-react';

const CATEGORIES = [
  { value: 'tender_sub', label: 'Tender-Sub' },
  { value: 'proposta', label: 'Proposta' },
  { value: 'consulenza', label: 'Consulenza' },
  { value: 'altro', label: 'Altro' },
];

// Props:
//   row: { localId, activity_type, activity_note, hours }
//   onChange: (localId, field, value) => void
//   onDelete: (localId) => void
const TimesheetFreeRow = ({ row, onChange, onDelete }) => {
  return (
    <div className="flex items-center gap-2">
      <select
        className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm bg-white"
        value={row.activity_type}
        onChange={e => onChange(row.localId, 'activity_type', e.target.value)}
      >
        {CATEGORIES.map(c => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </select>
      <input
        type="text"
        placeholder="Nota (obbligatoria)"
        className="flex-[2] rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        value={row.activity_note || ''}
        onChange={e => onChange(row.localId, 'activity_note', e.target.value)}
      />
      <input
        type="number"
        min="0"
        step="0.5"
        className="w-20 rounded-md border border-gray-300 px-2 py-1.5 text-sm text-right"
        value={row.hours}
        onChange={e => onChange(row.localId, 'hours', parseFloat(e.target.value) || 0)}
      />
      <button
        onClick={() => onDelete(row.localId)}
        className="text-gray-400 hover:text-red-500 transition-colors p-1"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default TimesheetFreeRow;
