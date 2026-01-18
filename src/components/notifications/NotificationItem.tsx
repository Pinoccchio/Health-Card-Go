import { Bell, CheckCircle, XCircle, MessageSquare, Calendar, Info, Eye } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Notification } from '@/hooks/useNotifications';
import { useNotificationContext } from '@/lib/contexts/NotificationContext';
import { translateNotification } from '@/lib/notifications/translateNotification';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onViewDetails?: (notification: Notification) => void;
}

const typeConfig = {
  cancellation: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  appointment_reminder: {
    icon: Calendar,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  feedback_request: {
    icon: MessageSquare,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  general: {
    icon: Info,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
  },
};

export default function NotificationItem({ notification, onMarkAsRead, onViewDetails }: NotificationItemProps) {
  const t = useTranslations();
  const tNotifications = useTranslations('notifications');
  const { markAsRead } = useNotificationContext();
  const isUnread = !notification.read_at;
  const config = typeConfig[notification.type] || typeConfig.general;
  const Icon = config.icon;

  // Translate notification content
  const translatedNotification = translateNotification(notification, t);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return tNotifications('time.just_now');
    if (diffMins < 60) return `${diffMins} ${tNotifications('time.minutes_ago')}`;
    if (diffHours < 24) return `${diffHours} ${tNotifications('time.hours_ago')}`;
    if (diffDays < 7) return `${diffDays} ${tNotifications('time.days_ago')}`;
    return date.toLocaleDateString();
  };

  const handleClick = async () => {
    // Mark as read if unread - uses OPTIMISTIC update from context
    if (isUnread) {
      try {
        await markAsRead(notification.id); // Badge updates INSTANTLY
        onMarkAsRead(notification.id); // Update local notification list
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
        // Badge already rolled back in context
      }
    }
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onViewDetails) {
      onViewDetails(notification);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`
        relative border rounded-lg p-4 transition-all cursor-pointer overflow-hidden
        ${isUnread ? 'bg-blue-50/50 border-blue-200' : 'bg-white border-gray-200'}
        hover:shadow-md hover:border-primary-teal
      `}
    >
      {/* Unread indicator */}
      {isUnread && (
        <div className="absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full"></div>
      )}

      <div className="flex gap-4">
        {/* Icon */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${config.color}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className={`font-semibold ${isUnread ? 'text-gray-900' : 'text-gray-700'}`}>
              {translatedNotification.title}
            </h3>
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {formatTimestamp(notification.created_at)}
            </span>
          </div>

          <p className="text-sm text-gray-600 line-clamp-2">
            {translatedNotification.message}
          </p>

          {/* Type badge and actions */}
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color} border ${config.borderColor}`}>
              {tNotifications(`types.${notification.type}`, { defaultValue: notification.type.replace(/_/g, ' ') })}
            </span>

            {/* View Details Button */}
            {onViewDetails && (
              <button
                onClick={handleViewDetails}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-teal hover:bg-primary-teal hover:text-white border border-primary-teal rounded-lg transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                {tNotifications('view_details')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
