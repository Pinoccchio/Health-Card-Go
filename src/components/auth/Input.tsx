'use client';

import { forwardRef, InputHTMLAttributes } from 'react';
import { cva, VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

const inputVariants = cva(
  'w-full px-4 py-3 rounded-lg transition-all duration-200 outline-none',
  {
    variants: {
      variant: {
        default:
          'bg-white border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-primary-teal focus:ring-2 focus:ring-primary-teal/20',
        error:
          'bg-white border border-danger text-gray-900 placeholder:text-gray-400 focus:border-danger focus:ring-2 focus:ring-danger/20',
        success:
          'bg-white border border-success text-gray-900 placeholder:text-gray-400 focus:border-success focus:ring-2 focus:ring-success/20',
      },
      inputSize: {
        sm: 'px-3 py-2 text-sm',
        md: 'px-4 py-3 text-base',
        lg: 'px-5 py-4 text-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      inputSize: 'md',
    },
  }
);

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant,
      inputSize,
      icon: Icon,
      iconPosition = 'left',
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
          {Icon && iconPosition === 'left' && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <Icon
                className={cn(
                  'w-5 h-5',
                  error ? 'text-danger' : 'text-gray-400',
                  disabled && 'opacity-50'
                )}
              />
            </div>
          )}

          <input
            ref={ref}
            className={cn(
              inputVariants({ variant: effectiveVariant, inputSize }),
              Icon && iconPosition === 'left' && 'pl-12',
              Icon && iconPosition === 'right' && 'pr-12',
              disabled &&
                'opacity-50 cursor-not-allowed bg-gray-50',
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
          />

          {Icon && iconPosition === 'right' && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <Icon
                className={cn(
                  'w-5 h-5',
                  error ? 'text-danger' : 'text-gray-400',
                  disabled && 'opacity-50'
                )}
              />
            </div>
          )}
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

Input.displayName = 'Input';
