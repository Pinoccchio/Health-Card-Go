'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Container } from '@/components/ui';
import { Megaphone, ArrowRight, Calendar, User, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
  target_audience: 'all' | 'patients' | 'healthcare_admin' | 'super_admin' | 'staff';
  is_new: boolean;
  profiles: {
    first_name: string;
    last_name: string;
    role: 'super_admin' | 'healthcare_admin' | 'staff' | 'patient' | 'education_admin';
  };
}

export function AnnouncementsSection() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          limit: '10', // Fetch more to filter client-side
          include_inactive: 'false',
        });

        const response = await fetch(`/api/announcements?${params.toString()}`);

        if (!response.ok) {
          const errorData = await response.json();
          console.error('API Error:', errorData);
          throw new Error(errorData.error || 'Failed to fetch announcements');
        }

        const result = await response.json();

        // Filter client-side for 'all' or 'patients' target_audience
        const publicAnnouncements = (result.data || []).filter(
          (ann: Announcement) =>
            ann.target_audience === 'all' || ann.target_audience === 'patients'
        );

        // Take only 3 latest
        setAnnouncements(publicAnnouncements.slice(0, 3));
        setError(null);
      } catch (err) {
        console.error('Error fetching announcements:', err);
        setError('Unable to load announcements at this time');
        setAnnouncements([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

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
      education_admin: 'Education Admin (HEPA)',
    };
    return roleLabels[role] || role;
  };

  return (
    <section id="announcements" className="py-20 bg-gray-50">
      <Container>
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center mb-4">
            <Megaphone className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            Latest Announcements
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Stay updated with important health information and announcements from Panabo City
            Health Office
          </p>
        </motion.div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-2xl mx-auto"
          >
            <div className="flex items-center gap-3 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {!loading && !error && announcements.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm p-8 max-w-2xl mx-auto text-center"
          >
            <Megaphone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No Announcements at This Time
            </h3>
            <p className="text-gray-500">
              Check back later for important health information and updates from the Panabo City
              Health Office.
            </p>
          </motion.div>
        )}

        {/* Announcements Grid */}
        {!loading && !error && announcements.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {announcements.map((announcement, index) => (
                <motion.article
                  key={announcement.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="group"
                >
                  <Link
                    href="/announcements"
                    className="block bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
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

                      <p className="text-gray-600 mb-4 line-clamp-3">
                        {getExcerpt(announcement.content)}
                      </p>

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
                        <span className="transform group-hover:translate-x-1 transition-transform">
                          →
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.article>
              ))}
            </div>

            {/* View All Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-center mt-12"
            >
              <Link
                href="/announcements"
                className="inline-flex items-center gap-2 bg-emerald-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                <span>View All Announcements</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>
          </>
        )}
      </Container>
    </section>
  );
}
