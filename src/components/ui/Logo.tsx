'use client';

import { cn } from '@/lib/utils';

export interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  variant?: 'default' | 'stacked';
  colorScheme?: 'default' | 'light';
}

const sizeClasses = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl',
  xl: 'text-3xl',
};

export function Logo({ size = 'lg', className, variant = 'default', colorScheme = 'default' }: LogoProps) {
  // Determine colors based on color scheme
  const healthColor = colorScheme === 'light' ? 'text-white' : 'text-primary-teal';
  const careColor = 'text-cta-orange'; // Always orange for brand consistency
  if (variant === 'stacked') {
    return (
      <div className={cn('flex flex-col items-center', className)}>
        <span className={cn(sizeClasses[size], 'font-bold', healthColor)}>
          Health
        </span>
        <span className={cn(sizeClasses[size], 'font-bold', careColor)}>
          Care
        </span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center space-x-1', className)}>
      <span className={cn(sizeClasses[size], 'font-bold', healthColor)}>
        Health
      </span>
      <span className={cn(sizeClasses[size], 'font-bold', careColor)}>
        Care
      </span>
    </div>
  );
}
