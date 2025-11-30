import React from 'react';
import { cn } from '@/lib/utils';

interface GradientCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

interface GradientCardHeaderProps {
  children: React.ReactNode;
  className?: string;
  gradient?: boolean;
  gradientFrom?: string;
  gradientTo?: string;
}

interface GradientCardTitleProps {
  children: React.ReactNode;
  className?: string;
}

interface GradientCardDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

interface GradientCardContentProps {
  children: React.ReactNode;
  className?: string;
}

interface GradientCardFooterProps {
  children: React.ReactNode;
  className?: string;
}

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export function GradientCard({ children, className, padding = 'none' }: GradientCardProps) {
  return (
    <div
      className={cn(
        'bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden',
        paddingStyles[padding],
        className
      )}
    >
      {children}
    </div>
  );
}

export function GradientCardHeader({
  children,
  className,
  gradient = false,
  gradientFrom = 'from-primary-teal',
  gradientTo = 'to-primary-teal/80',
}: GradientCardHeaderProps) {
  return (
    <div
      className={cn(
        'px-6 py-4',
        gradient
          ? `bg-gradient-to-r ${gradientFrom} ${gradientTo} text-white`
          : 'bg-gray-50 border-b border-gray-200',
        className
      )}
    >
      {children}
    </div>
  );
}

export function GradientCardTitle({ children, className }: GradientCardTitleProps) {
  return (
    <h3 className={cn('text-lg font-semibold', className)}>
      {children}
    </h3>
  );
}

export function GradientCardDescription({ children, className }: GradientCardDescriptionProps) {
  return (
    <p className={cn('text-sm opacity-90 mt-1', className)}>
      {children}
    </p>
  );
}

export function GradientCardContent({ children, className }: GradientCardContentProps) {
  return (
    <div className={cn('p-6', className)}>
      {children}
    </div>
  );
}

export function GradientCardFooter({ children, className }: GradientCardFooterProps) {
  return (
    <div className={cn('px-6 py-4 border-t border-gray-200 bg-gray-50', className)}>
      {children}
    </div>
  );
}
