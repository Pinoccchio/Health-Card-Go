'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { ProfessionalCard } from '@/components/ui/ProfessionalCard';
import {
  Activity,
  TrendingUp,
  AlertTriangle,
  FileText,
  BarChart3,
  PlusCircle,
  Calendar,
  MapPin,
  ArrowRight,
} from 'lucide-react';
import { format } from 'date-fns';

interface DashboardStats {
  total_cases: number;
  this_month: number;
  active_outbreaks: number;
  affected_barangays: number;
}

interface RecentDiseaseEntry {
  id: string;
  disease_type: string;
  diagnosis_date: string;
  barangay_name: string;
  patient_name: string;
  severity?: string;
}

const DISEASE_LABELS: Record<string, string> = {
  dengue: 'Dengue',
  hiv_aids: 'HIV/AIDS',
  pregnancy_complications: 'Pregnancy Complications',
  malaria: 'Malaria',
  measles: 'Measles',
  rabies: 'Rabies',
};

export default function StaffDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    total_cases: 0,
    this_month: 0,
    active_outbreaks: 0,
    affected_barangays: 0,
  });
  const [recentEntries, setRecentEntries] = useState<RecentDiseaseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch disease statistics
      const statsRes = await fetch('/api/diseases?limit=1000');
      const statsData = await statsRes.json();

      if (statsData.success) {
        const diseases = statsData.data || [];

        // Calculate this month's cases
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonthCases = diseases.filter((d: any) =>
          new Date(d.diagnosis_date) >= firstDayOfMonth
        ).length;

        // Count unique barangays
        const uniqueBarangays = new Set(
          diseases.map((d: any) => d.barangay_id).filter(Boolean)
        );

        setStats({
          total_cases: diseases.length,
          this_month: thisMonthCases,
          active_outbreaks: 0, // Will be calculated from outbreak detection API
          affected_barangays: uniqueBarangays.size,
        });

        // Get recent entries (last 5)
        const recent = diseases
          .sort((a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
          .slice(0, 5)
          .map((d: any) => ({
            id: d.id,
            disease_type: d.disease_type,
            diagnosis_date: d.diagnosis_date,
            barangay_name: d.barangays?.name || 'Unknown',
            patient_name: d.patients?.profiles
              ? `${d.patients.profiles.first_name} ${d.patients.profiles.last_name}`
              : 'N/A',
            severity: d.severity,
          }));
        setRecentEntries(recent);

        // Fetch outbreak alerts
        const outbreaksRes = await fetch('/api/diseases/outbreak-detection');
        const outbreaksData = await outbreaksRes.json();
        if (outbreaksData.success && outbreaksData.data) {
          setStats(prev => ({
            ...prev,
            active_outbreaks: outbreaksData.data.length,
          }));
        }
      } else {
        setError('Failed to load dashboard data');
      }
    } catch (err) {
      console.error('Dashboard error:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity?.toLowerCase()) {
      case 'severe':
      case 'critical':
        return 'text-red-600';
      case 'moderate':
        return 'text-orange-600';
      case 'mild':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <DashboardLayout
      roleId={5}
      pageTitle="Disease Surveillance Dashboard"
      pageDescription="Monitor and record disease data across Panabo City"
    >
      <Container size="full">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-start">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-teal"></div>
            <p className="mt-2 text-sm text-gray-500">Loading dashboard...</p>
          </div>
        ) : (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <ProfessionalCard variant="flat" className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Cases</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.total_cases}</p>
                    <p className="text-xs text-gray-500 mt-1">All time</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                </div>
              </ProfessionalCard>

              <ProfessionalCard variant="flat" className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">This Month</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.this_month}</p>
                    <p className="text-xs text-gray-500 mt-1">New cases</p>
                  </div>
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                </div>
              </ProfessionalCard>

              <ProfessionalCard variant="flat" className="bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-orange-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Active Outbreaks</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.active_outbreaks}</p>
                    <p className="text-xs text-gray-500 mt-1">Requiring attention</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>
                </div>
              </ProfessionalCard>

              <ProfessionalCard variant="flat" className="bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-purple-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Affected Areas</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.affected_barangays}</p>
                    <p className="text-xs text-gray-500 mt-1">Barangays</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                </div>
              </ProfessionalCard>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link
                  href="/staff/disease-surveillance"
                  className="flex items-center gap-3 p-4 border-2 border-primary-teal rounded-lg hover:bg-primary-teal hover:text-white transition-all group"
                >
                  <PlusCircle className="w-8 h-8 text-primary-teal group-hover:text-white transition-colors" />
                  <div>
                    <p className="font-medium text-gray-900 group-hover:text-white">Record Disease Case</p>
                    <p className="text-xs text-gray-500 group-hover:text-white/90">Enter new disease data</p>
                  </div>
                </Link>

                <Link
                  href="/staff/reports"
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-primary-teal hover:bg-primary-teal/5 transition-all group"
                >
                  <FileText className="w-8 h-8 text-gray-600 group-hover:text-primary-teal transition-colors" />
                  <div>
                    <p className="font-medium text-gray-900">Generate Reports</p>
                    <p className="text-xs text-gray-500">Export disease data</p>
                  </div>
                </Link>

                <Link
                  href="/staff/analytics"
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-primary-teal hover:bg-primary-teal/5 transition-all group"
                >
                  <BarChart3 className="w-8 h-8 text-gray-600 group-hover:text-primary-teal transition-colors" />
                  <div>
                    <p className="font-medium text-gray-900">View Analytics</p>
                    <p className="text-xs text-gray-500">Trends and heatmaps</p>
                  </div>
                </Link>
              </div>
            </div>

            {/* Recent Disease Entries */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Recent Disease Entries</h3>
                  <p className="text-sm text-gray-500 mt-1">Latest recorded cases</p>
                </div>
                <Link
                  href="/staff/disease-surveillance"
                  className="flex items-center gap-1 text-sm text-primary-teal hover:text-primary-teal-dark font-medium"
                >
                  View All
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="divide-y divide-gray-200">
                {recentEntries.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <Activity className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p>No disease entries recorded yet</p>
                    <Link
                      href="/staff/disease-surveillance"
                      className="inline-flex items-center gap-1 mt-3 text-primary-teal hover:underline text-sm"
                    >
                      <PlusCircle className="w-4 h-4" />
                      Record your first case
                    </Link>
                  </div>
                ) : (
                  recentEntries.map((entry) => (
                    <div key={entry.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">
                              {DISEASE_LABELS[entry.disease_type] || entry.disease_type}
                            </span>
                            {entry.severity && (
                              <span className={`text-xs font-medium ${getSeverityColor(entry.severity)} capitalize`}>
                                • {entry.severity}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {entry.barangay_name}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(entry.diagnosis_date), 'MMM d, yyyy')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </Container>
    </DashboardLayout>
  );
}
