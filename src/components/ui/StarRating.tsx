'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  required?: boolean;
}

export default function StarRating({
  value,
  onChange,
  readonly = false,
  size = 'md',
  label,
  required = false,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const handleClick = (rating: number) => {
    if (!readonly && onChange) {
      onChange(rating);
    }
  };

  const handleMouseEnter = (rating: number) => {
    if (!readonly) {
      setHoverValue(rating);
    }
  };

  const handleMouseLeave = () => {
    if (!readonly) {
      setHoverValue(null);
    }
  };

  const displayValue = hoverValue ?? value;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => handleClick(rating)}
            onMouseEnter={() => handleMouseEnter(rating)}
            onMouseLeave={handleMouseLeave}
            disabled={readonly}
            className={`
              ${sizeClasses[size]}
              transition-all duration-150
              ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded
            `}
            aria-label={`Rate ${rating} star${rating !== 1 ? 's' : ''}`}
          >
            <Star
              className={`
                ${sizeClasses[size]}
                transition-colors duration-150
                ${rating <= displayValue
                  ? 'fill-yellow-400 stroke-yellow-500'
                  : 'fill-none stroke-gray-300'
                }
              `}
            />
          </button>
        ))}
        {value > 0 && (
          <span className="ml-2 text-sm text-gray-600 self-center">
            {value} / 5
          </span>
        )}
      </div>
    </div>
  );
}
