'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { MedicalRecord } from '@/types/medical-records';
import MedicalRecordViewer from '@/components/medical-records/MedicalRecordViewer';
import { getTemplate } from '@/lib/config/medicalRecordTemplates';

export default function PatientMedicalRecordsPage() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Fetch medical records
  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const response = await fetch('/api/medical-records');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch medical records');
        }

        setRecords(data.data || []);
      } catch (err: any) {
        console.error('Error fetching records:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, []);

  // Filter records by category
  const filteredRecords = filterCategory === 'all'
    ? records
    : records.filter(r => r.category === filterCategory);

  // Get unique categories
  const categories = Array.from(new Set(records.map(r => r.category)));

  return (
    <DashboardLayout
      roleId={4}
      pageTitle="Medical Records"
      pageDescription="View your complete medical history"
    >
      <Container size="full">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary-teal border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your medical records...</p>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            )}

            {records.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Medical Records Yet</h3>
                <p className="text-gray-600">Your medical records will appear here after your appointments.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Records List Sidebar */}
                <div className="lg:col-span-1">
                  <div className="bg-white border border-gray-200 rounded-lg shadow-sm sticky top-6">
                    {/* Filter */}
                    <div className="p-4 border-b border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Category</label>
                      <select
                        value={filterCategory}
                        onChange={(e) => {
                          setFilterCategory(e.target.value);
                          setSelectedRecord(null);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-teal focus:border-primary-teal"
                      >
                        <option value="all">All Categories ({records.length})</option>
                        {categories.map(cat => (
                          <option key={cat} value={cat}>
                            {cat.charAt(0).toUpperCase() + cat.slice(1)} ({records.filter(r => r.category === cat).length})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Records List */}
                    <div className="max-h-[600px] overflow-y-auto">
                      {filteredRecords.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          No records in this category
                        </div>
                      ) : (
                        filteredRecords.map((record) => {
                          const template = getTemplate(record.template_type as any);
                          const isSelected = selectedRecord?.id === record.id;

                          return (
                            <button
                              key={record.id}
                              onClick={() => setSelectedRecord(record)}
                              className={`w-full text-left p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                                isSelected ? 'bg-primary-teal/10 border-l-4 border-l-primary-teal' : ''
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-semibold text-gray-900 text-sm">{template.name}</h4>
                                {template.requiresEncryption && (
                                  <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <p className="text-xs text-gray-600 mb-1">
                                {new Date(record.created_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </p>
                              {record.doctors && (
                                <p className="text-xs text-gray-500">
                                  Dr. {record.doctors.profiles.first_name} {record.doctors.profiles.last_name}
                                </p>
                              )}
                              <div className="mt-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                  {record.category}
                                </span>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Record Detail View */}
                <div className="lg:col-span-2">
                  {selectedRecord ? (
                    <MedicalRecordViewer record={selectedRecord} />
                  ) : (
                    <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                      <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                      </svg>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Record</h3>
                      <p className="text-gray-600">Click on any record from the list to view its details</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </Container>
    </DashboardLayout>
  );
}
