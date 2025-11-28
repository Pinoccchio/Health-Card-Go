'use client';

import { forwardRef, SelectHTMLAttributes } from 'react';
import { cva, VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

const selectVariants = cva(
  'w-full px-4 py-3 rounded-lg transition-all duration-200 outline-none appearance-none pr-10 bg-white',
  {
    variants: {
      variant: {
        default:
          'border border-gray-300 text-gray-900 focus:border-primary-teal focus:ring-2 focus:ring-primary-teal/20',
        error:
          'border border-danger text-gray-900 focus:border-danger focus:ring-2 focus:ring-danger/20',
        success:
          'border border-success text-gray-900 focus:border-success focus:ring-2 focus:ring-success/20',
      },
      selectSize: {
        sm: 'px-3 py-2 text-sm',
        md: 'px-4 py-3 text-base',
        lg: 'px-5 py-4 text-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      selectSize: 'md',
    },
  }
);

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'>,
    VariantProps<typeof selectVariants> {
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  helperText?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      variant,
      selectSize,
      options,
      placeholder,
      error,
      helperText,
      disabled,
      ...props
    },
    ref
  ) => {
    const effectiveVariant = error ? 'error' : variant;

    return (
      <div className="w-full">
        <div className="relative">
          <select
            ref={ref}
            className={cn(
              selectVariants({ variant: effectiveVariant, selectSize }),
              disabled &&
                'opacity-50 cursor-not-allowed bg-gray-50',
              !props.value && 'text-gray-400',
              className
            )}
            disabled={disabled}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={
              error
                ? `${props.id}-error`
                : helperText
                  ? `${props.id}-helper`
                  : undefined
            }
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="text-gray-900"
              >
                {option.label}
              </option>
            ))}
          </select>

          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <ChevronDown
              className={cn(
                'w-5 h-5',
                error ? 'text-danger' : 'text-gray-400',
                disabled && 'opacity-50'
              )}
            />
          </div>
        </div>

        {error && (
          <p
            id={`${props.id}-error`}
            className="mt-1.5 text-sm text-danger flex items-center gap-1"
          >
            {error}
          </p>
        )}

        {helperText && !error && (
          <p
            id={`${props.id}-helper`}
            className="mt-1.5 text-sm text-gray-500"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
