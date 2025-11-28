'use client';

import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, id, disabled, ...props }, ref) => {
    return (
      <div className="w-full">
        <label
          htmlFor={id}
          className={cn(
            'flex items-start gap-3 cursor-pointer group',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <div className="relative flex items-center justify-center flex-shrink-0">
            <input
              ref={ref}
              type="checkbox"
              id={id}
              className="peer sr-only"
              disabled={disabled}
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={error ? `${id}-error` : undefined}
              {...props}
            />
            <div
              className={cn(
                'w-5 h-5 rounded border-2 transition-all duration-200',
                'peer-checked:bg-primary-teal peer-checked:border-primary-teal',
                'peer-focus-visible:ring-2 peer-focus-visible:ring-primary-teal/20',
                error
                  ? 'border-danger peer-checked:bg-danger peer-checked:border-danger'
                  : 'border-gray-300',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            />
            <Check
              className={cn(
                'absolute w-3.5 h-3.5 text-white pointer-events-none',
                'opacity-0 peer-checked:opacity-100 transition-opacity duration-200',
                'scale-0 peer-checked:scale-100 transform'
              )}
              strokeWidth={3}
            />
          </div>

          {label && (
            <span
              className={cn(
                'text-sm text-gray-700 select-none',
                error && 'text-danger'
              )}
            >
              {label}
            </span>
          )}
        </label>

        {error && (
          <p
            id={`${id}-error`}
            className="mt-1.5 text-sm text-danger ml-8"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
