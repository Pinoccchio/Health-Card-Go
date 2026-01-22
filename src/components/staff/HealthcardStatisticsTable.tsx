'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { MoreVertical, Edit2, Trash2, MapPin, CreditCard } from 'lucide-react';

interface HealthcardStatistic {
  id: string;
  healthcard_type: 'food_handler' | 'non_food' | 'pink';
  record_date: string;
  cards_issued: number;
  barangay_id: number | null;
  source: string | null;
  notes: string | null;
  created_at: string;
  barangays?: {
    id: number;
    name: string;
    code: string;
  } | null;
  profiles?: {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
  } | null;
}

interface HealthcardStatisticsTableProps {
  statistics: HealthcardStatistic[];
  onEdit: (record: HealthcardStatistic) => void;
  onDelete: (record: HealthcardStatistic) => void;
}

const HEALTHCARD_TYPE_LABELS: Record<string, string> = {
  food_handler: 'Yellow Card',
  non_food: 'Green Card',
  pink: 'Pink Card',
};

const HEALTHCARD_TYPE_COLORS: Record<string, string> = {
  food_handler: 'bg-yellow-100 text-yellow-800',
  non_food: 'bg-green-100 text-green-800',
  pink: 'bg-pink-100 text-pink-800',
};

export function HealthcardStatisticsTable({
  statistics,
  onEdit,
  onDelete,
}: HealthcardStatisticsTableProps) {
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

  if (!statistics || statistics.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <CreditCard className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Historical Data Yet</h3>
          <p className="text-sm text-gray-600 max-w-md">
            No historical healthcard statistics have been imported. Use the &quot;Import Excel&quot; button to add aggregate data from past records.
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
                HealthCard Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cards Issued
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Barangay
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Source
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Imported By
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {statistics.map((stat) => (
              <tr key={stat.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {format(new Date(stat.record_date), 'MMM d, yyyy')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      HEALTHCARD_TYPE_COLORS[stat.healthcard_type]
                    }`}
                  >
                    {HEALTHCARD_TYPE_LABELS[stat.healthcard_type]}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                  {stat.cards_issued.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {stat.barangays ? (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      {stat.barangays.name}
                    </div>
                  ) : (
                    <span className="text-gray-400 italic">System-wide</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {stat.source || (
                    <span className="text-gray-400 italic">Not specified</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {stat.profiles ? (
                    `${stat.profiles.first_name} ${stat.profiles.last_name}`
                  ) : (
                    <span className="text-gray-400 italic">Unknown</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
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

                        {/* Dropdown Menu */}
                        <div
                          className="fixed z-[9999] w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5"
                          style={{
                            top: `${menuPosition.top}px`,
                            left: `${menuPosition.left}px`,
                          }}
                        >
                          <div className="py-1">
                            <button
                              onClick={() => {
                                onEdit(stat);
                                setOpenMenuId(null);
                              }}
                              className="group flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left transition-colors"
                            >
                              <Edit2 className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                              Edit Record
                            </button>
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
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination info */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          Showing <span className="font-medium">{statistics.length}</span> record(s)
        </p>
      </div>
    </div>
  );
}
