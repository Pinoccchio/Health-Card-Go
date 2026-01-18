'use client';

import React from 'react';
import { Drawer } from '@/components/ui';
import { Calendar, User, Megaphone, Tag } from 'lucide-react';
import { Announcement } from './AnnouncementCard';

interface AnnouncementDetailModalProps {
  announcement: Announcement | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AnnouncementDetailModal({
  announcement,
  isOpen,
  onClose,
}: AnnouncementDetailModalProps) {
  if (!announcement) return null;

  const getTargetAudienceLabel = (audience: string) => {
    const labels: Record<string, string> = {
      all: 'Everyone',
      patients: 'Patients',
      healthcare_admin: 'Healthcare Administrators',
      super_admin: 'Super Administrators',
      staff: 'Staff',
    };
    return labels[audience] || audience;
  };

  const getTargetAudienceColor = (audience: string) => {
    const colors: Record<string, string> = {
      all: '#10B981', // emerald-500
      patients: '#3B82F6', // blue-500
      healthcare_admin: '#8B5CF6', // violet-500
      super_admin: '#EF4444', // red-500
      staff: '#F59E0B', // amber-500
    };
    return colors[audience] || '#6B7280'; // gray-500
  };

  const getRoleLabel = (role: string) => {
    const roleLabels: Record<string, string> = {
      super_admin: 'Super Admin',
      healthcare_admin: 'Healthcare Admin',
      staff: 'Staff',
      patient: 'Patient',
    };
    return roleLabels[role] || role;
  };

  const audienceColor = getTargetAudienceColor(announcement.target_audience);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={announcement.title}
      subtitle="Health Office Announcement"
      size="xl"
    >
      {/* Header with metadata */}
      <div className="flex flex-wrap gap-4 mb-6 pb-6 border-b border-gray-200">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <User className="w-4 h-4 flex-shrink-0" />
          <div>
            <span className="font-medium">
              {announcement.profiles.first_name} {announcement.profiles.last_name}
            </span>
            <span className="text-gray-400 ml-1">
              ({getRoleLabel(announcement.profiles.role)})
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4 flex-shrink-0" />
          <span>
            {new Date(announcement.created_at).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 flex-shrink-0" style={{ color: audienceColor }} />
          <span
            className="text-sm font-semibold px-3 py-1 rounded-full"
            style={{
              backgroundColor: `${audienceColor}15`,
              color: audienceColor,
            }}
          >
            {getTargetAudienceLabel(announcement.target_audience)}
          </span>
        </div>
        {announcement.is_new && (
          <div className="flex items-center">
            <span className="text-sm font-bold px-3 py-1 rounded-full bg-emerald-600 text-white">
              NEW
            </span>
          </div>
        )}
      </div>

      {/* Featured Icon */}
      <div className="mb-8 rounded-lg overflow-hidden bg-gradient-to-br from-emerald-400 to-emerald-600 h-64 flex items-center justify-center">
        <Megaphone className="w-24 h-24 text-white opacity-30" />
      </div>

      {/* Announcement Content */}
      <div
        className="prose prose-gray max-w-none mb-8"
        dangerouslySetInnerHTML={{ __html: announcement.content }}
      />

      {/* Footer Info */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded">
          <p className="text-sm text-emerald-800">
            <strong>Panabo City Health Office</strong> - For more information or to book an
            appointment, visit our services page or contact us directly.
          </p>
        </div>
      </div>
    </Drawer>
  );
}
