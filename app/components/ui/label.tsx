import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & { error?: string }
>(({ className = '', error, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
      error ? 'text-red-500 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'
    } ${className}`}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
