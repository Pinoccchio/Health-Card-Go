import { Bell } from 'lucide-react';
import NotificationItem from './NotificationItem';
import { Notification } from '@/hooks/useNotifications';

interface NotificationListProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onViewDetails?: (notification: Notification) => void;
  loading?: boolean;
}

function EmptyNotificationsState() {
  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
        <Bell className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        No notifications yet
      </h3>
      <p className="text-gray-600">
        You'll receive notifications for appointments, account updates, and other important information.
      </p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border rounded-lg p-4 animate-pulse">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-gray-200"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function NotificationList({ notifications, onMarkAsRead, onViewDetails, loading }: NotificationListProps) {
  if (loading) {
    return <LoadingSkeleton />;
  }

  if (notifications.length === 0) {
    return <EmptyNotificationsState />;
  }

  return (
    <div className="space-y-3">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onMarkAsRead={onMarkAsRead}
          onViewDetails={onViewDetails}
        />
      ))}
    </div>
  );
}
