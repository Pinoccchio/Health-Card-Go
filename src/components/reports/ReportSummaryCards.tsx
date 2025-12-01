'use client';

import { ProfessionalCard } from '@/components/ui';
import {
  Calendar,
  CheckCircle,
  XCircle,
  UserX,
  Users,
  Activity,
  TrendingUp,
  AlertTriangle,
  Star,
  ThumbsUp,
  FileText,
  Clock,
} from 'lucide-react';

interface SummaryCardsProps {
  reportType: 'appointments' | 'disease_surveillance' | 'patients' | 'feedback' | 'system_overview';
  data: any;
}

export function ReportSummaryCards({ reportType, data }: SummaryCardsProps) {
  if (!data?.summary) return null;

  const renderAppointmentCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <ProfessionalCard className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">Total Appointments</p>
            <p className="text-3xl font-bold text-blue-900 mt-2">
              {data.summary.total_appointments?.toLocaleString() || 0}
            </p>
          </div>
          <Calendar className="w-10 h-10 text-blue-500 opacity-80" />
        </div>
      </ProfessionalCard>

      <ProfessionalCard className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-green-600">Completed</p>
            <p className="text-3xl font-bold text-green-900 mt-2">
              {data.summary.completed?.toLocaleString() || 0}
            </p>
            {data.summary.completion_rate !== undefined && (
              <p className="text-xs text-green-700 mt-1">
                {data.summary.completion_rate.toFixed(1)}% rate
              </p>
            )}
          </div>
          <CheckCircle className="w-10 h-10 text-green-500 opacity-80" />
        </div>
      </ProfessionalCard>

      <ProfessionalCard className="bg-gradient-to-br from-red-50 to-red-100 border-l-4 border-red-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-red-600">Cancelled</p>
            <p className="text-3xl font-bold text-red-900 mt-2">
              {data.summary.cancelled?.toLocaleString() || 0}
            </p>
          </div>
          <XCircle className="w-10 h-10 text-red-500 opacity-80" />
        </div>
      </ProfessionalCard>

      <ProfessionalCard className="bg-gradient-to-br from-amber-50 to-amber-100 border-l-4 border-amber-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-amber-600">No Show</p>
            <p className="text-3xl font-bold text-amber-900 mt-2">
              {data.summary.no_show?.toLocaleString() || 0}
            </p>
          </div>
          <UserX className="w-10 h-10 text-amber-500 opacity-80" />
        </div>
      </ProfessionalCard>
    </div>
  );

  const renderDiseaseCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <ProfessionalCard className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">Total Cases</p>
            <p className="text-3xl font-bold text-blue-900 mt-2">
              {data.summary.total_cases?.toLocaleString() || 0}
            </p>
          </div>
          <Activity className="w-10 h-10 text-blue-500 opacity-80" />
        </div>
      </ProfessionalCard>

      <ProfessionalCard className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-green-600">Recovered</p>
            <p className="text-3xl font-bold text-green-900 mt-2">
              {data.summary.recovered?.toLocaleString() || 0}
            </p>
          </div>
          <CheckCircle className="w-10 h-10 text-green-500 opacity-80" />
        </div>
      </ProfessionalCard>

      <ProfessionalCard className="bg-gradient-to-br from-amber-50 to-amber-100 border-l-4 border-amber-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-amber-600">Active Cases</p>
            <p className="text-3xl font-bold text-amber-900 mt-2">
              {data.summary.active?.toLocaleString() || 0}
            </p>
          </div>
          <AlertTriangle className="w-10 h-10 text-amber-500 opacity-80" />
        </div>
      </ProfessionalCard>

      <ProfessionalCard className="bg-gradient-to-br from-red-50 to-red-100 border-l-4 border-red-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-red-600">Critical</p>
            <p className="text-3xl font-bold text-red-900 mt-2">
              {data.summary.critical?.toLocaleString() || 0}
            </p>
          </div>
          <Activity className="w-10 h-10 text-red-500 opacity-80" />
        </div>
      </ProfessionalCard>
    </div>
  );

  const renderPatientCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <ProfessionalCard className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">Total Patients</p>
            <p className="text-3xl font-bold text-blue-900 mt-2">
              {data.summary.total_patients?.toLocaleString() || 0}
            </p>
          </div>
          <Users className="w-10 h-10 text-blue-500 opacity-80" />
        </div>
      </ProfessionalCard>

      <ProfessionalCard className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-green-600">Active</p>
            <p className="text-3xl font-bold text-green-900 mt-2">
              {data.summary.active?.toLocaleString() || 0}
            </p>
            {data.summary.approval_rate !== undefined && (
              <p className="text-xs text-green-700 mt-1">
                {data.summary.approval_rate.toFixed(1)}% approved
              </p>
            )}
          </div>
          <CheckCircle className="w-10 h-10 text-green-500 opacity-80" />
        </div>
      </ProfessionalCard>

      <ProfessionalCard className="bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-orange-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-orange-600">Pending</p>
            <p className="text-3xl font-bold text-orange-900 mt-2">
              {data.summary.pending?.toLocaleString() || 0}
            </p>
          </div>
          <Clock className="w-10 h-10 text-orange-500 opacity-80" />
        </div>
      </ProfessionalCard>

      <ProfessionalCard className="bg-gradient-to-br from-red-50 to-red-100 border-l-4 border-red-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-red-600">Rejected</p>
            <p className="text-3xl font-bold text-red-900 mt-2">
              {data.summary.rejected?.toLocaleString() || 0}
            </p>
          </div>
          <XCircle className="w-10 h-10 text-red-500 opacity-80" />
        </div>
      </ProfessionalCard>
    </div>
  );

  const renderFeedbackCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <ProfessionalCard className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">Total Feedback</p>
            <p className="text-3xl font-bold text-blue-900 mt-2">
              {data.summary.total_feedback?.toLocaleString() || 0}
            </p>
          </div>
          <FileText className="w-10 h-10 text-blue-500 opacity-80" />
        </div>
      </ProfessionalCard>

      <ProfessionalCard className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-l-4 border-yellow-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-yellow-600">Average Rating</p>
            <p className="text-3xl font-bold text-yellow-900 mt-2 flex items-center gap-1">
              {data.summary.average_overall_rating?.toFixed(1) || '0.0'}
              <Star className="w-6 h-6 fill-yellow-500 text-yellow-500" />
            </p>
          </div>
          <Star className="w-10 h-10 text-yellow-500 opacity-80" />
        </div>
      </ProfessionalCard>

      <ProfessionalCard className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-green-600">Would Recommend</p>
            <p className="text-3xl font-bold text-green-900 mt-2">
              {data.summary.recommendation_percentage?.toFixed(0) || 0}%
            </p>
          </div>
          <ThumbsUp className="w-10 h-10 text-green-500 opacity-80" />
        </div>
      </ProfessionalCard>

      <ProfessionalCard className="bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-purple-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-purple-600">Doctor Rating</p>
            <p className="text-3xl font-bold text-purple-900 mt-2 flex items-center gap-1">
              {data.summary.average_doctor_rating?.toFixed(1) || '0.0'}
              <Star className="w-6 h-6 fill-purple-500 text-purple-500" />
            </p>
          </div>
          <Users className="w-10 h-10 text-purple-500 opacity-80" />
        </div>
      </ProfessionalCard>
    </div>
  );

  const renderOverviewCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <ProfessionalCard className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">Total Patients</p>
            <p className="text-3xl font-bold text-blue-900 mt-2">
              {data.summary.total_patients?.toLocaleString() || 0}
            </p>
          </div>
          <Users className="w-10 h-10 text-blue-500 opacity-80" />
        </div>
      </ProfessionalCard>

      <ProfessionalCard className="bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-purple-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-purple-600">Appointments</p>
            <p className="text-3xl font-bold text-purple-900 mt-2">
              {data.summary.total_appointments?.toLocaleString() || 0}
            </p>
          </div>
          <Calendar className="w-10 h-10 text-purple-500 opacity-80" />
        </div>
      </ProfessionalCard>

      <ProfessionalCard className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-green-600">Completion Rate</p>
            <p className="text-3xl font-bold text-green-900 mt-2">
              {data.summary.completion_rate?.toFixed(0) || 0}%
            </p>
          </div>
          <TrendingUp className="w-10 h-10 text-green-500 opacity-80" />
        </div>
      </ProfessionalCard>

      <ProfessionalCard className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-l-4 border-yellow-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-yellow-600">Satisfaction</p>
            <p className="text-3xl font-bold text-yellow-900 mt-2 flex items-center gap-1">
              {data.summary.average_rating?.toFixed(1) || '0.0'}
              <Star className="w-6 h-6 fill-yellow-500 text-yellow-500" />
            </p>
          </div>
          <Star className="w-10 h-10 text-yellow-500 opacity-80" />
        </div>
      </ProfessionalCard>
    </div>
  );

  switch (reportType) {
    case 'appointments':
      return renderAppointmentCards();
    case 'disease_surveillance':
      return renderDiseaseCards();
    case 'patients':
      return renderPatientCards();
    case 'feedback':
      return renderFeedbackCards();
    case 'system_overview':
      return renderOverviewCards();
    default:
      return null;
  }
}
