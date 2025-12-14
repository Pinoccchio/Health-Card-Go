'use client';

import { useState } from 'react';
import StarRating from '@/components/ui/StarRating';
import { Calendar, Clock, Building2, Timer, ThumbsUp, MessageSquare } from 'lucide-react';
import { useToast } from '@/lib/contexts/ToastContext';
import { TimeBlock, TIME_BLOCKS, getTimeBlockColor } from '@/types/appointment';

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  time_block: TimeBlock;
  completed_at: string;
  services?: {
    name: string;
  };
}

interface FeedbackFormProps {
  appointment: Appointment;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function FeedbackForm({ appointment, onSuccess, onCancel }: FeedbackFormProps) {
  const [formData, setFormData] = useState({
    rating: 0,
    facility_rating: 0,
    wait_time_rating: 0,
    would_recommend: false,
    comments: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (formData.rating === 0) {
      newErrors.rating = 'Overall rating is required';
    }
    if (formData.facility_rating === 0) {
      newErrors.facility_rating = 'Facility rating is required';
    }
    if (formData.wait_time_rating === 0) {
      newErrors.wait_time_rating = 'Wait time rating is required';
    }
    if (formData.comments.trim().length === 0) {
      newErrors.comments = 'Comments are required';
    }
    if (formData.comments.length > 500) {
      newErrors.comments = 'Comments must be 500 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointment_id: appointment.id,
          ...formData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit feedback');
      }

      toast.success('Thank you! Your feedback has been submitted successfully.');
      onSuccess();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit feedback';
      setErrors({ submit: errorMessage });
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg">
      {/* Appointment Context */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="text-sm font-medium text-blue-900 mb-3">Appointment Details</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center text-gray-700">
            <Building2 className="w-4 h-4 mr-2 text-blue-600" />
            <span className="font-medium">Service:</span>
            <span className="ml-2">{appointment.services?.name || 'N/A'}</span>
          </div>
          <div className="flex items-center text-gray-700">
            <Calendar className="w-4 h-4 mr-2 text-blue-600" />
            <span className="font-medium">Date:</span>
            <span className="ml-2">{new Date(appointment.appointment_date).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-700">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="font-medium">Time:</span>
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${getTimeBlockColor(appointment.time_block)}`}>
              {appointment.time_block}
            </span>
            <span className="text-xs">
              {TIME_BLOCKS[appointment.time_block].timeRange}
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Overall Experience */}
        <div>
          <StarRating
            label="Overall Experience"
            value={formData.rating}
            onChange={(value) => {
              setFormData({ ...formData, rating: value });
              setErrors({ ...errors, rating: '' });
            }}
            size="lg"
            required
          />
          {errors.rating && (
            <p className="text-red-500 text-sm mt-1">{errors.rating}</p>
          )}
        </div>

        {/* Facility Cleanliness */}
        <div>
          <StarRating
            label="Facility Cleanliness"
            value={formData.facility_rating}
            onChange={(value) => {
              setFormData({ ...formData, facility_rating: value });
              setErrors({ ...errors, facility_rating: '' });
            }}
            size="md"
            required
          />
          {errors.facility_rating && (
            <p className="text-red-500 text-sm mt-1">{errors.facility_rating}</p>
          )}
        </div>

        {/* Wait Time Satisfaction */}
        <div>
          <StarRating
            label="Wait Time Satisfaction"
            value={formData.wait_time_rating}
            onChange={(value) => {
              setFormData({ ...formData, wait_time_rating: value });
              setErrors({ ...errors, wait_time_rating: '' });
            }}
            size="md"
            required
          />
          {errors.wait_time_rating && (
            <p className="text-red-500 text-sm mt-1">{errors.wait_time_rating}</p>
          )}
        </div>

        {/* Would Recommend */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center">
            <ThumbsUp className="w-5 h-5 mr-3 text-green-600" />
            <div>
              <label htmlFor="would_recommend" className="text-sm font-medium text-gray-700 cursor-pointer">
                Would you recommend this service?
              </label>
              <p className="text-xs text-gray-500 mt-1">Help others make informed decisions</p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={formData.would_recommend}
            onClick={() => setFormData({ ...formData, would_recommend: !formData.would_recommend })}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              ${formData.would_recommend ? 'bg-green-600' : 'bg-gray-300'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${formData.would_recommend ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>

        {/* Comments */}
        <div>
          <label htmlFor="comments" className="flex items-center text-sm font-medium text-gray-700 mb-2">
            <MessageSquare className="w-4 h-4 mr-2" />
            Comments & Suggestions
            <span className="text-red-500 ml-1">*</span>
          </label>
          <textarea
            id="comments"
            value={formData.comments}
            onChange={(e) => {
              setFormData({ ...formData, comments: e.target.value });
              setErrors({ ...errors, comments: '' });
            }}
            rows={4}
            maxLength={500}
            placeholder="Share your experience and suggestions for improvement..."
            className={`
              w-full px-3 py-2 border rounded-lg resize-none
              focus:outline-none focus:ring-2 focus:ring-blue-500
              ${errors.comments ? 'border-red-500' : 'border-gray-300'}
            `}
          />
          <div className="flex justify-between mt-1">
            {errors.comments ? (
              <p className="text-red-500 text-sm">{errors.comments}</p>
            ) : (
              <p className="text-gray-500 text-xs">Please provide specific feedback</p>
            )}
            <p className="text-gray-400 text-xs">
              {formData.comments.length}/500
            </p>
          </div>
        </div>

        {/* Submit Error */}
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-700 text-sm">{errors.submit}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Submitting...
              </>
            ) : (
              'Submit Feedback'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
