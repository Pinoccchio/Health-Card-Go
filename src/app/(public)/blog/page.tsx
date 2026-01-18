'use client';

import React, { useState } from 'react';
import { Container } from '@/components/ui';
import { motion } from 'framer-motion';
import { BookOpen, Calendar, User, Clock } from 'lucide-react';
import { BLOG_POSTS, BlogPost } from '@/lib/config/blogConfig';
import { BlogDetailModal } from '@/components/blog';

export default function BlogPage() {
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handlePostClick = (post: BlogPost) => {
    setSelectedPost(post);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedPost(null), 300); // Clear after animation
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
              <BookOpen className="w-12 h-12" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Health Blog</h1>
            <p className="text-lg md:text-xl text-emerald-50 max-w-2xl mx-auto">
              Stay informed with health tips, updates, and information from Panabo City Health
              Office
            </p>
          </motion.div>
        </Container>
      </section>

      {/* Blog Posts Grid */}
      <section className="py-16">
        <Container>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {BLOG_POSTS.map((post, index) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                onClick={() => handlePostClick(post)}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
              >
                {/* Post Image Placeholder */}
                <div
                  className="h-48 bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center relative overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${post.categoryColor}80, ${post.categoryColor})`,
                  }}
                >
                  <BookOpen className="w-16 h-16 text-white opacity-40" />
                  <div className="absolute inset-0 bg-black opacity-0 hover:opacity-10 transition-opacity duration-300" />
                </div>

                {/* Post Content */}
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="text-xs font-semibold px-3 py-1 rounded-full"
                      style={{
                        backgroundColor: `${post.categoryColor}15`,
                        color: post.categoryColor,
                      }}
                    >
                      {post.category}
                    </span>
                  </div>

                  <h2 className="text-xl font-bold text-gray-800 mb-3 line-clamp-2 hover:text-emerald-600 transition-colors">
                    {post.title}
                  </h2>

                  <p className="text-gray-600 mb-4 line-clamp-3">{post.excerpt}</p>

                  {/* Post Meta */}
                  <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 min-w-0">
                      <User className="w-4 h-4 flex-shrink-0" />
                      <span className="line-clamp-1 truncate">{post.author}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Calendar className="w-4 h-4" />
                      <span className="whitespace-nowrap">
                        {new Date(post.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Read Time */}
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    <span>{post.readTime}</span>
                  </div>
                </div>

                {/* Read More Indicator */}
                <div className="px-6 pb-4">
                  <div className="text-sm font-medium text-emerald-600 flex items-center gap-1 group">
                    <span>Read More</span>
                    <span className="transform group-hover:translate-x-1 transition-transform">
                      →
                    </span>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </Container>
      </section>

      {/* Blog Detail Modal */}
      <BlogDetailModal post={selectedPost} isOpen={isModalOpen} onClose={handleCloseModal} />
    </div>
  );
}

