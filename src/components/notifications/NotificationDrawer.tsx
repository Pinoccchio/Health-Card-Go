import { Drawer } from '@/components/ui';
import { Notification } from '@/hooks/useNotifications';
import { CheckCircle, XCircle, MessageSquare, Calendar, Info, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { useRouter } from 'next/navigation';

interface NotificationDrawerProps {
  notification: Notification | null;
  isOpen: boolean;
  onClose: () => void;
}

const typeConfig = {
  approval: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    label: 'Approval',
  },
  cancellation: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    label: 'Cancellation',
  },
  appointment_reminder: {
    icon: Calendar,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    label: 'Appointment Reminder',
  },
  feedback_request: {
    icon: MessageSquare,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    label: 'Feedback Request',
  },
  general: {
    icon: Info,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    label: 'General',
  },
};

export default function NotificationDrawer({ notification, isOpen, onClose }: NotificationDrawerProps) {
  const router = useRouter();

  if (!notification) return null;

  const config = typeConfig[notification.type] || typeConfig.general;
  const Icon = config.icon;
  const isUnread = !notification.read_at;

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleNavigate = () => {
    if (notification.link) {
      onClose();
      router.push(notification.link);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Notification Details"
      size="lg"
    >
      <div className="p-6 space-y-6">
        {/* Type Badge and Status */}
        <div className="flex items-center justify-between">
          <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${config.bgColor} border ${config.borderColor}`}>
            <Icon className={`w-5 h-5 ${config.color}`} />
            <span className={`font-medium ${config.color}`}>{config.label}</span>
          </div>

          {isUnread && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
              Unread
            </span>
          )}
        </div>

        {/* Title */}
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {notification.title}
          </h3>
          <p className="text-sm text-gray-500">
            {formatDate(notification.created_at)}
          </p>
        </div>

        {/* Message */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
            {notification.message}
          </p>
        </div>

        {/* Link Button */}
        {notification.link && (
          <div className="pt-4 border-t border-gray-200">
            <Button
              onClick={handleNavigate}
              className="w-full flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Go to Related Page
            </Button>
          </div>
        )}

        {/* Close Button */}
        <div className="pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full"
          >
            Close
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
