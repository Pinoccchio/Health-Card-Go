'use client';

import React from 'react';
import { Drawer } from '@/components/ui';
import { Calendar, User, Clock, Tag, BookOpen } from 'lucide-react';
import { BlogPost } from '@/lib/config/blogConfig';

interface BlogDetailModalProps {
  post: BlogPost | null;
  isOpen: boolean;
  onClose: () => void;
}

export function BlogDetailModal({ post, isOpen, onClose }: BlogDetailModalProps) {
  if (!post) return null;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={post.title}
      subtitle="Health Blog Article"
      size="xl"
    >
      {/* Header with metadata */}
      <div className="flex flex-wrap gap-4 mb-6 pb-6 border-b border-gray-200">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <User className="w-4 h-4 flex-shrink-0" />
          <div>
            <span className="font-medium">{post.author}</span>
            <span className="text-gray-400 ml-1">• {post.authorRole}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4 flex-shrink-0" />
          <span>
            {new Date(post.date).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4 flex-shrink-0" />
          <span>{post.readTime}</span>
        </div>
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 flex-shrink-0" style={{ color: post.categoryColor }} />
          <span
            className="text-sm font-semibold px-3 py-1 rounded-full"
            style={{
              backgroundColor: `${post.categoryColor}15`,
              color: post.categoryColor,
            }}
          >
            {post.category}
          </span>
        </div>
      </div>

      {/* Featured Image Placeholder */}
      <div className="mb-8 rounded-lg overflow-hidden bg-gradient-to-br from-emerald-400 to-emerald-600 h-64 flex items-center justify-center">
        <BookOpen className="w-24 h-24 text-white opacity-30" />
      </div>

      {/* Article Content */}
      <div
        className="prose prose-gray max-w-none mb-8"
        dangerouslySetInnerHTML={{ __html: post.content }}
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
