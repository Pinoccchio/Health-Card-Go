'use client';

import { forwardRef } from 'react';
import { Input, InputProps } from './Input';
import { Label } from './Label';
import { cn } from '@/lib/utils';

export interface FormFieldProps extends InputProps {
  label?: string;
  required?: boolean;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, required, className, id, error, ...props }, ref) => {
    return (
      <div className={cn('w-full', className)}>
        {label && (
          <Label htmlFor={id} required={required} disabled={props.disabled}>
            {label}
          </Label>
        )}
        <Input ref={ref} id={id} error={error} {...props} />
      </div>
    );
  }
);

FormField.displayName = 'FormField';
