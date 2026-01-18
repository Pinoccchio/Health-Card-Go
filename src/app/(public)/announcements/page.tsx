'use client';

import React, { useState, useEffect } from 'react';
import { Container } from '@/components/ui';
import { motion } from 'framer-motion';
import { Megaphone, AlertCircle } from 'lucide-react';
import { AnnouncementCard, Announcement } from '@/components/announcements/AnnouncementCard';
import { AnnouncementDetailModal } from '@/components/announcements/AnnouncementDetailModal';

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          limit: '50', // Fetch more for full page
          include_inactive: 'false',
        });

        const response = await fetch(`/api/announcements?${params.toString()}`);

        if (!response.ok) {
          throw new Error('Failed to fetch announcements');
        }

        const result = await response.json();

        // Filter client-side for 'all' or 'patients' target_audience
        const publicAnnouncements = (result.data || []).filter(
          (ann: Announcement) =>
            ann.target_audience === 'all' || ann.target_audience === 'patients'
        );

        setAnnouncements(publicAnnouncements);
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

  const handleAnnouncementClick = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedAnnouncement(null), 300); // Clear after animation
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-16 md:pt-20">
      {/* Header Section */}
      <section className="bg-gradient-to-r from-emerald-500 to-emerald-600 py-16">
        <Container>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center text-white"
          >
            <div className="flex items-center justify-center mb-4">
              <Megaphone className="w-12 h-12" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Health Announcements</h1>
            <p className="text-lg md:text-xl text-emerald-50 max-w-2xl mx-auto">
              Stay informed with important health information and updates from Panabo City Health
              Office
            </p>
          </motion.div>
        </Container>
      </section>

      {/* Announcements Content */}
      <section className="py-16">
        <Container>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {announcements.map((announcement, index) => (
                <AnnouncementCard
                  key={announcement.id}
                  announcement={announcement}
                  onClick={() => handleAnnouncementClick(announcement)}
                  index={index}
                />
              ))}
            </div>
          )}
        </Container>
      </section>

      {/* Announcement Detail Modal */}
      <AnnouncementDetailModal
        announcement={selectedAnnouncement}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}
