'use client';

import { HTMLAttributes, forwardRef } from 'react';
import { cva, VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  X,
  LucideIcon,
} from 'lucide-react';

const alertVariants = cva(
  'relative w-full rounded-lg p-4 flex items-start gap-3 border',
  {
    variants: {
      variant: {
        success:
          'bg-success/10 border-success/30 text-success-dark',
        error: 'bg-danger/10 border-danger/30 text-danger-dark',
        warning: 'bg-warning/10 border-warning/30 text-warning-dark',
        info: 'bg-info/10 border-info/30 text-info-dark',
      },
    },
    defaultVariants: {
      variant: 'info',
    },
  }
);

const iconMap: Record<string, LucideIcon> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const iconColorMap: Record<string, string> = {
  success: 'text-success',
  error: 'text-danger',
  warning: 'text-warning',
  info: 'text-info',
};

export interface AlertProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string;
  message?: string;
  onClose?: () => void;
  closeable?: boolean;
}

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      className,
      variant = 'info',
      title,
      message,
      children,
      onClose,
      closeable = false,
      ...props
    },
    ref
  ) => {
    const Icon = iconMap[variant as string];
    const iconColor = iconColorMap[variant as string];

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ variant }), className)}
        {...props}
      >
        <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', iconColor)} />

        <div className="flex-1 min-w-0">
          {title && (
            <h4 className="font-semibold text-sm mb-1">{title}</h4>
          )}
          {message && (
            <p className="text-sm opacity-90">{message}</p>
          )}
          {children && <div className="text-sm opacity-90">{children}</div>}
        </div>

        {(closeable || onClose) && (
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity focus:outline-none focus:opacity-100"
            aria-label="Close alert"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }
);

Alert.displayName = 'Alert';
