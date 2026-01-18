'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Megaphone, Calendar, User } from 'lucide-react';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
  target_audience: 'all' | 'patients' | 'healthcare_admin' | 'super_admin' | 'staff';
  is_new: boolean;
  profiles: {
    first_name: string;
    last_name: string;
    role: 'super_admin' | 'healthcare_admin' | 'staff' | 'patient';
  };
}

interface AnnouncementCardProps {
  announcement: Announcement;
  onClick?: () => void;
  index?: number;
}

export function AnnouncementCard({ announcement, onClick, index = 0 }: AnnouncementCardProps) {
  const getExcerpt = (content: string, maxLength: number = 150) => {
    const text = content.replace(/<[^>]*>/g, ''); // Strip HTML tags
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
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

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      onClick={onClick}
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1 group"
    >
      {/* Announcement Header with Icon */}
      <div className="h-32 bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center relative overflow-hidden">
        <Megaphone className="w-12 h-12 text-white opacity-40" />
        <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
        {announcement.is_new && (
          <div className="absolute top-4 right-4 bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
            NEW
          </div>
        )}
      </div>

      {/* Announcement Content */}
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-3 line-clamp-2 group-hover:text-emerald-600 transition-colors">
          {announcement.title}
        </h3>

        <p className="text-gray-600 mb-4 line-clamp-3">{getExcerpt(announcement.content)}</p>

        {/* Announcement Meta */}
        <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 min-w-0">
            <User className="w-4 h-4 flex-shrink-0" />
            <span className="line-clamp-1 truncate">
              {announcement.profiles.first_name} {announcement.profiles.last_name} (
              {getRoleLabel(announcement.profiles.role)})
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Calendar className="w-4 h-4" />
            <span className="whitespace-nowrap">
              {new Date(announcement.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* Read More Indicator */}
        <div className="mt-4 text-sm font-medium text-emerald-600 flex items-center gap-1">
          <span>Read More</span>
          <span className="transform group-hover:translate-x-1 transition-transform">→</span>
        </div>
      </div>
    </motion.article>
  );
}
