'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { StatCard } from '@/components/ui/StatCard';
import {
  Megaphone,
  Plus,
  Eye,
  CheckCircle,
  Activity,
  Users,
  Calendar,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';

interface Announcement {
  id: string;
  title: string;
  content: string;
  target_audience: string;
  target_patient_type?: string | null;
  is_active: boolean;
  created_at: string;
}

interface DashboardStats {
  total_announcements: number;
  active_announcements: number;
  this_month: number;
  for_all_users: number;
}

export default function EducationAdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    total_announcements: 0,
    active_announcements: 0,
    this_month: 0,
    for_all_users: 0,
  });
  const [recentAnnouncements, setRecentAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch all announcements
      const response = await fetch('/api/announcements?limit=1000&include_inactive=true');
      const data = await response.json();

      if (data.success) {
        const announcements: Announcement[] = data.data || [];

        // Calculate statistics
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const thisMonthCount = announcements.filter(a =>
          new Date(a.created_at) >= firstDayOfMonth
        ).length;

        const activeCount = announcements.filter(a => a.is_active).length;
        const forAllCount = announcements.filter(a => a.target_audience === 'all').length;

        setStats({
          total_announcements: announcements.length,
          active_announcements: activeCount,
          this_month: thisMonthCount,
          for_all_users: forAllCount,
        });

        // Get recent announcements (last 5)
        const recent = announcements
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5);
        setRecentAnnouncements(recent);
      } else {
        setError('Failed to load dashboard data');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('An error occurred while loading the dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getAudienceLabel = (targetAudience: string, targetPatientType?: string | null) => {
    switch (targetAudience) {
      case 'all':
        return 'All Users';
      case 'super_admin':
        return 'Super Admin';
      case 'healthcare_admin':
        return 'Healthcare Admins';
      case 'staff':
        return 'Staff';
      case 'education_admin':
        return 'Education Admin';
      case 'patients':
        if (targetPatientType) {
          const patientTypeLabels: Record<string, string> = {
            healthcard: 'Health Card Patients',
            hiv: 'HIV Patients',
            prenatal: 'Prenatal Patients',
          };
          return patientTypeLabels[targetPatientType] || 'Patients';
        }
        return 'All Patients';
      default:
        return targetAudience;
    }
  };

  return (
    <DashboardLayout
      roleId={6}
      pageTitle="HEPA Dashboard"
      pageDescription="Health Education Promotion Assistant - Announcement Management"
    >
      <Container size="full">
        {/* Welcome Section */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {user?.first_name || 'HEPA'}!
          </h1>
          <p className="text-gray-600 mt-1">
            Manage announcements and communications for the City Health Office
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Total Announcements"
            value={loading ? '...' : stats.total_announcements}
            icon={Megaphone}
            iconBgColor="bg-blue-100"
            iconColor="text-blue-600"
          />
          <StatCard
            title="Active"
            value={loading ? '...' : stats.active_announcements}
            icon={CheckCircle}
            iconBgColor="bg-green-100"
            iconColor="text-green-600"
          />
          <StatCard
            title="This Month"
            value={loading ? '...' : stats.this_month}
            icon={Calendar}
            iconBgColor="bg-purple-100"
            iconColor="text-purple-600"
          />
          <StatCard
            title="For All Users"
            value={loading ? '...' : stats.for_all_users}
            icon={Users}
            iconBgColor="bg-teal-100"
            iconColor="text-teal-600"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Create Announcement Card */}
          <Link
            href="/education-admin/announcements/manage"
            className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary-teal/10 rounded-lg">
                  <Plus className="w-6 h-6 text-primary-teal" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Create Announcement</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Create new announcements for users
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </div>
          </Link>

          {/* View All Announcements Card */}
          <Link
            href="/education-admin/announcements"
            className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Eye className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">View Announcements</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    View all system announcements
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </div>
          </Link>
        </div>

        {/* Recent Announcements */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Recent Announcements</h2>
              <Link
                href="/education-admin/announcements/manage"
                className="text-sm text-primary-teal hover:text-primary-teal-dark font-medium flex items-center gap-1"
              >
                Manage All
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="p-6 text-center text-gray-500">Loading announcements...</div>
            ) : recentAnnouncements.length === 0 ? (
              <div className="p-6 text-center">
                <Megaphone className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-4">No announcements created yet</p>
                <Link
                  href="/education-admin/announcements/manage"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-teal text-white rounded-md hover:bg-primary-teal-dark transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create Your First Announcement
                </Link>
              </div>
            ) : (
              recentAnnouncements.map((announcement) => (
                <div key={announcement.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{announcement.title}</h3>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                            announcement.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {announcement.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                        {announcement.content}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{format(new Date(announcement.created_at), 'MMM d, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>{getAudienceLabel(announcement.target_audience, announcement.target_patient_type)}</span>
                        </div>
                      </div>
                    </div>
                    <Link
                      href="/education-admin/announcements/manage"
                      className="flex-shrink-0 p-2 text-primary-teal hover:bg-primary-teal/10 rounded transition-colors"
                      title="Manage"
                    >
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-6 bg-teal-50 border border-teal-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-teal-100 rounded-lg flex-shrink-0">
              <Activity className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h3 className="font-semibold text-teal-900 mb-2">HEPA Role Information</h3>
              <p className="text-sm text-teal-800 mb-3">
                As Health Education Promotion Assistant, you are responsible for creating and managing
                announcements for the City Health Office. You can target specific audiences including:
              </p>
              <ul className="text-sm text-teal-800 space-y-1 list-disc list-inside">
                <li>All Users - System-wide announcements</li>
                <li>Super Admin - Administrative notices</li>
                <li>Healthcare Admins - Service-specific updates</li>
                <li>Staff - Disease surveillance alerts</li>
                <li>Patients - Health advisories and reminders</li>
                <li>Specific Patient Groups - Health Card, HIV, or Prenatal patients</li>
              </ul>
            </div>
          </div>
        </div>
      </Container>
    </DashboardLayout>
  );
}
