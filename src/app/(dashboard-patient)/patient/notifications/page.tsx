'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { DashboardLayout } from '@/components/dashboard';
import { Container, Button } from '@/components/ui';
import { ProfessionalCard } from '@/components/ui/ProfessionalCard';
import { CheckCheck, Bell, CheckCircle, XCircle, MessageSquare, Calendar, Info } from 'lucide-react';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { useNotificationContext } from '@/lib/contexts/NotificationContext';
import NotificationList from '@/components/notifications/NotificationList';
import NotificationDrawer from '@/components/notifications/NotificationDrawer';

type FilterType = 'all' | 'unread' | 'approval' | 'appointment_reminder' | 'cancellation' | 'feedback_request' | 'general';

export default function PatientNotificationsPage() {
  const t = useTranslations('notifications');
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { notifications, loading, error, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  // Get refreshCount from NotificationContext to sync sidebar badge
  const { refreshCount } = useNotificationContext();

  // Refresh sidebar badge count when page loads
  // This ensures badge is accurate when patient visits notifications page
  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  // Calculate statistics
  const statistics = useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter(n => !n.read_at).length;
    const approvals = notifications.filter(n => n.type === 'approval').length;
    const reminders = notifications.filter(n => n.type === 'appointment_reminder').length;
    const cancellations = notifications.filter(n => n.type === 'cancellation').length;
    const feedbacks = notifications.filter(n => n.type === 'feedback_request').length;
    const general = notifications.filter(n => n.type === 'general').length;

    return { total, unread, approvals, reminders, cancellations, feedbacks, general };
  }, [notifications]);

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    if (filter === 'all') return notifications;
    if (filter === 'unread') return notifications.filter(n => !n.read_at);
    return notifications.filter(n => n.type === filter);
  }, [notifications, filter]);

  const handleViewDetails = (notification: Notification) => {
    setSelectedNotification(notification);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedNotification(null);
  };

  return (
    <DashboardLayout
      roleId={4}
      pageTitle={t('title')}
      pageDescription={t('description')}
    >
      <Container size="full">
        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {!loading && (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
              <ProfessionalCard variant="flat" className="bg-gradient-to-br from-teal-50 to-teal-100 border-l-4 border-teal-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{t('statistics.total')}</p>
                    <p className="text-3xl font-bold text-gray-900">{statistics.total}</p>
                  </div>
                  <div className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Bell className="w-6 h-6 text-white" />
                  </div>
                </div>
              </ProfessionalCard>

              <ProfessionalCard variant="flat" className="bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-orange-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{t('statistics.unread')}</p>
                    <p className="text-3xl font-bold text-gray-900">{statistics.unread}</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Bell className="w-6 h-6 text-white" />
                  </div>
                </div>
              </ProfessionalCard>

              <ProfessionalCard variant="flat" className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{t('statistics.approvals')}</p>
                    <p className="text-3xl font-bold text-gray-900">{statistics.approvals}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
              </ProfessionalCard>

              <ProfessionalCard variant="flat" className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{t('statistics.reminders')}</p>
                    <p className="text-3xl font-bold text-gray-900">{statistics.reminders}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                </div>
              </ProfessionalCard>

              <ProfessionalCard variant="flat" className="bg-gradient-to-br from-red-50 to-red-100 border-l-4 border-red-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{t('statistics.cancellations')}</p>
                    <p className="text-3xl font-bold text-gray-900">{statistics.cancellations}</p>
                  </div>
                  <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center shadow-lg">
                    <XCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
              </ProfessionalCard>

              <ProfessionalCard variant="flat" className="bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-purple-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{t('statistics.feedback')}</p>
                    <p className="text-3xl font-bold text-gray-900">{statistics.feedbacks}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                    <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                </div>
              </ProfessionalCard>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap gap-2 mb-6">
              {[
                { id: 'all', label: t('filters.all'), count: statistics.total, color: 'teal', icon: Bell },
                { id: 'unread', label: t('filters.unread'), count: statistics.unread, color: 'orange', icon: Bell },
                { id: 'approval', label: t('filters.approval'), count: statistics.approvals, color: 'green', icon: CheckCircle },
                { id: 'appointment_reminder', label: t('filters.appointment_reminder'), count: statistics.reminders, color: 'blue', icon: Calendar },
                { id: 'cancellation', label: t('filters.cancellation'), count: statistics.cancellations, color: 'red', icon: XCircle },
                { id: 'feedback_request', label: t('filters.feedback_request'), count: statistics.feedbacks, color: 'purple', icon: MessageSquare },
                { id: 'general', label: t('filters.general'), count: statistics.general, color: 'gray', icon: Info },
              ].map((filterOption) => {
                const Icon = filterOption.icon;
                const isActive = filter === filterOption.id;
                const colorClasses = {
                  teal: { bg: 'bg-teal-100 hover:bg-teal-200', text: 'text-teal-700', ring: 'ring-teal-500', activeBg: 'bg-teal-200' },
                  orange: { bg: 'bg-orange-100 hover:bg-orange-200', text: 'text-orange-700', ring: 'ring-orange-500', activeBg: 'bg-orange-200' },
                  green: { bg: 'bg-green-100 hover:bg-green-200', text: 'text-green-700', ring: 'ring-green-500', activeBg: 'bg-green-200' },
                  blue: { bg: 'bg-blue-100 hover:bg-blue-200', text: 'text-blue-700', ring: 'ring-blue-500', activeBg: 'bg-blue-200' },
                  red: { bg: 'bg-red-100 hover:bg-red-200', text: 'text-red-700', ring: 'ring-red-500', activeBg: 'bg-red-200' },
                  purple: { bg: 'bg-purple-100 hover:bg-purple-200', text: 'text-purple-700', ring: 'ring-purple-500', activeBg: 'bg-purple-200' },
                  gray: { bg: 'bg-gray-100 hover:bg-gray-200', text: 'text-gray-700', ring: 'ring-gray-500', activeBg: 'bg-gray-200' },
                };
                const colors = colorClasses[filterOption.color as keyof typeof colorClasses];

                return (
                  <button
                    key={filterOption.id}
                    onClick={() => setFilter(filterOption.id as FilterType)}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all
                      ${isActive ? `${colors.activeBg} ${colors.text} ring-2 ${colors.ring} shadow-md` : `${colors.bg} ${colors.text}`}
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{filterOption.label}</span>
                    <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${isActive ? 'bg-white/80' : 'bg-white/60'}`}>
                      {filterOption.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end mb-4">
              <Button
                variant="outline"
                onClick={markAllAsRead}
                disabled={statistics.unread === 0}
                className="flex items-center gap-2"
              >
                <CheckCheck className="w-4 h-4" />
                {t('mark_all_read')}
              </Button>
            </div>

            {/* Notifications List */}
            <div className="bg-white rounded-lg shadow p-6">
              <NotificationList
                notifications={filteredNotifications}
                onMarkAsRead={markAsRead}
                onViewDetails={handleViewDetails}
                loading={loading}
              />
            </div>
          </>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        )}

        {/* Notification Details Drawer */}
        <NotificationDrawer
          notification={selectedNotification}
          isOpen={isDrawerOpen}
          onClose={handleCloseDrawer}
        />
      </Container>
    </DashboardLayout>
  );
}
