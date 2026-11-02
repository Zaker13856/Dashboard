import React from 'react';
import { Badge } from '@/components/ui/badge';
import { MapPin, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

// Tabella spese di un progetto in sola lettura (la stessa dell'admin, senza modifica/elimina).
// Sulle note spese di chi guarda (ownConsultantId) c'è la penna: onEditMission apre la nota sotto.

const fmt = n => new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

const TYPE_CONFIG = {
  travel:        { label: 'Travel',      color: 'bg-blue-100 text-blue-700 border-blue-200' },
  other_cost:    { label: 'Other Cost',  color: 'bg-amber-100 text-amber-700 border-amber-200' },
  subcontract:   { label: 'Subcontract', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  third_parties: { label: '3rd Parties', color: 'bg-pink-100 text-pink-700 border-pink-200' },
};

const ProjectExpensesTable = ({ name, items, displayItems, ownConsultantId = null, onEditMission = null }) => {
  const sum = (k) => items.reduce((s, e) => s + (parseFloat(e[k]) || 0), 0);
  const eligible = items
    .filter(e => e.type === 'travel' || e.type === 'other_cost')
    .reduce((s, e) => s + (parseFloat(e.eligible_amount) || 0), 0);

  if (items.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-4">Nessuna spesa registrata sul progetto.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wide text-[10px]">
            <th className="px-3 py-2 text-left font-medium">Data</th>
            <th className="px-3 py-2 text-left font-medium">Luogo</th>
            <th className="px-3 py-2 text-center font-medium">Gg</th>
            <th className="px-3 py-2 text-left font-medium">Descrizione</th>
            <th className="px-3 py-2 text-left font-medium">Tipo</th>
            <th className="px-3 py-2 text-left font-medium">Consulente</th>
            <th className="px-3 py-2 text-right font-medium">Importo €</th>
            <th className="px-3 py-2 text-right font-medium">IVA €</th>
            <th className="px-3 py-2 text-right font-medium">Ammissibile €</th>
            <th className="px-3 py-2 w-10"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {displayItems.map(e => {
            const cfg = TYPE_CONFIG[e.type] || TYPE_CONFIG.other_cost;
            if (e._isMission) {
              return (
                <tr key={e.id} className="bg-blue-50/20">
                  <td className="px-3 py-2 text-gray-900 font-semibold whitespace-nowrap">{e.date_label}</td>
                  <td className="px-3 py-2 text-gray-900 font-semibold">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-blue-500" />
                      {e.place}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">{e.days}</span>
                  </td>
                  <td className="px-3 py-2 text-gray-700 font-medium">
                    Nota spese · {e._voci.length} voci
                    {e.mission?.travelling_with ? <span className="text-gray-400 font-normal"> — con {e.mission.travelling_with}</span> : null}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="outline" className={cn("text-[10px] font-medium", TYPE_CONFIG.travel.color)}>Travel</Badge>
                  </td>
                  <td className="px-3 py-2 text-gray-700 text-[11px]">{e.consultant_name || '—'}</td>
                  <td className="px-3 py-2 text-right font-bold text-gray-900">{fmt(e.amount)}</td>
                  <td className="px-3 py-2 text-right text-red-600">{e.iva ? fmt(e.iva) : '—'}</td>
                  <td className="px-3 py-2 text-right font-bold text-green-700">{fmt(e.eligible_amount)}</td>
                  <td className="px-3 py-1">
                    {onEditMission && ownConsultantId && e.mission?.consultant_id === ownConsultantId ? (
                      <button
                        onClick={() => onEditMission(e.mission.id)}
                        className="text-blue-400 hover:text-blue-600 p-1 rounded"
                        title="Modifica la tua nota spese (aggiungi o correggi voci)"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            }
            return (
              <tr key={e.id}>
                <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                  {e.date_label || (e.date ? new Date(e.date).toLocaleDateString('it-IT') : '—')}
                </td>
                <td className="px-3 py-2 text-gray-700">
                  {e.place ? (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      {e.place}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-3 py-2 text-center text-gray-700">
                  {e.type === 'travel' && e.days ? (
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">{e.days}</span>
                  ) : '—'}
                </td>
                <td className="px-3 py-2 text-gray-900 font-medium max-w-[200px] truncate" title={e.description}>
                  {e.description}
                </td>
                <td className="px-3 py-2">
                  <Badge variant="outline" className={cn("text-[10px] font-medium", cfg.color)}>{cfg.label}</Badge>
                </td>
                <td className="px-3 py-2 text-gray-700 text-[11px]">{e.consultant_name || '—'}</td>
                <td className="px-3 py-2 text-right font-semibold text-gray-900">{fmt(e.amount)}</td>
                <td className="px-3 py-2 text-right text-red-600">{e.iva ? fmt(e.iva) : '—'}</td>
                <td className="px-3 py-2 text-right font-semibold text-green-700">
                  {e.eligible_amount ? fmt(e.eligible_amount) : '—'}
                </td>
                <td></td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 border-t-2 border-gray-300 font-bold text-xs">
            <td colSpan={6} className="px-3 py-2 text-gray-700 uppercase tracking-wide">Totale {name}</td>
            <td className="px-3 py-2 text-right text-gray-900">{fmt(sum('amount'))}</td>
            <td className="px-3 py-2 text-right text-red-600">{fmt(sum('iva'))}</td>
            <td className="px-3 py-2 text-right text-green-700">{fmt(eligible)}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default ProjectExpensesTable;
