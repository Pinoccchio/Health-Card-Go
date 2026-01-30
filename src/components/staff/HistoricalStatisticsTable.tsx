'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { MoreVertical, Edit2, Trash2, MapPin, FileText } from 'lucide-react';
import { DISEASE_TYPE_LABELS, getDiseaseColor, getDiseaseDisplayName } from '@/lib/constants/diseaseConstants';

interface HistoricalStatistic {
  id: string;
  disease_type: string;
  custom_disease_name: string | null;
  record_date: string;
  case_count: number;
  barangay_id: number | null;
  source: string | null;
  notes: string | null;
  created_at: string;
  barangays?: {
    id: number;
    name: string;
    code: string;
  } | null;
  created_by?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

interface HistoricalStatisticsTableProps {
  statistics: HistoricalStatistic[];
  onEdit?: (record: HistoricalStatistic) => void;
  onDelete?: (record: HistoricalStatistic) => void;
  readOnly?: boolean;
}

export function HistoricalStatisticsTable({
  statistics,
  onEdit,
  onDelete,
  readOnly = false,
}: HistoricalStatisticsTableProps) {
  const showActions = !readOnly && (!!onEdit || !!onDelete);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  const toggleMenu = (id: string, event: React.MouseEvent<HTMLButtonElement>) => {
    if (openMenuId === id) {
      setOpenMenuId(null);
    } else {
      const rect = event.currentTarget.getBoundingClientRect();
      setMenuPosition({
        top: rect.top,
        left: rect.left - 224 - 8, // 224px menu width + 8px spacing
      });
      setOpenMenuId(id);
    }
  };

  if (statistics.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Historical Data Yet</h3>
          <p className="text-sm text-gray-600 max-w-md">
            No historical disease statistics have been imported. Use the &quot;Import Historical Data&quot; button to add aggregate data from past records.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Record Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Disease Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Barangay
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Case Count
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Source
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Imported By
              </th>
              {showActions && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {statistics.map((stat) => (
              <tr key={stat.id} className="hover:bg-gray-50 transition-colors">
                {/* Record Date */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {format(new Date(stat.record_date), 'MMM d, yyyy')}
                  </div>
                  <div className="text-xs text-gray-500">
                    Imported {format(new Date(stat.created_at), 'MMM d, yyyy')}
                  </div>
                </td>

                {/* Disease Type */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${getDiseaseColor(stat.disease_type)}-100 text-${getDiseaseColor(stat.disease_type)}-800`}>
                    {getDiseaseDisplayName(stat.disease_type, stat.custom_disease_name)}
                  </span>
                </td>

                {/* Barangay */}
                <td className="px-6 py-4 whitespace-nowrap">
                  {stat.barangays ? (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-sm text-gray-900">{stat.barangays.name}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400 italic">All Barangays</span>
                  )}
                </td>

                {/* Case Count */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-semibold text-gray-900">{stat.case_count}</div>
                  <div className="text-xs text-gray-500">cases</div>
                </td>

                {/* Source */}
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 max-w-xs truncate">
                    {stat.source || <span className="text-gray-400 italic">No source provided</span>}
                  </div>
                  {stat.notes && (
                    <div className="text-xs text-gray-500 mt-1 max-w-xs truncate" title={stat.notes}>
                      {stat.notes}
                    </div>
                  )}
                </td>

                {/* Imported By */}
                <td className="px-6 py-4 whitespace-nowrap">
                  {stat.created_by ? (
                    <div>
                      <div className="text-sm text-gray-900">
                        {stat.created_by.first_name} {stat.created_by.last_name}
                      </div>
                      <div className="text-xs text-gray-500">{stat.created_by.email}</div>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400 italic">Unknown</span>
                  )}
                </td>

                {/* Actions */}
                {showActions && (
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="relative inline-block text-left">
                    <button
                      onClick={(e) => toggleMenu(stat.id, e)}
                      className="inline-flex items-center p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
                      aria-label="More actions"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>

                    {openMenuId === stat.id && (
                      <>
                        {/* Backdrop */}
                        <div
                          className="fixed inset-0 z-[9998]"
                          onClick={() => setOpenMenuId(null)}
                          aria-hidden="true"
                        />

                        {/* Dropdown Menu - fixed positioning to escape overflow container */}
                        <div
                          className="fixed z-[9999] w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5"
                          style={{
                            top: `${menuPosition.top}px`,
                            left: `${menuPosition.left}px`,
                          }}
                        >
                          <div className="py-1">
                            {onEdit && (
                            <button
                              onClick={() => {
                                onEdit(stat);
                                setOpenMenuId(null);
                              }}
                              className="group flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left transition-colors"
                            >
                              <Edit2 className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                              Edit Source/Notes
                            </button>
                            )}
                            {onDelete && (
                            <button
                              onClick={() => {
                                onDelete(stat);
                                setOpenMenuId(null);
                              }}
                              className="group flex items-center gap-2 px-4 py-2 text-sm text-red-700 hover:bg-red-50 w-full text-left transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-400 group-hover:text-red-600" />
                              Delete Record
                            </button>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
