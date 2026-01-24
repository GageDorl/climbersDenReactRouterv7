import * as React from 'react';

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  className?: string;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ value = 0, max = 100, className = '', ...props }, ref) => {
    const percentage = Math.min((value / max) * 100, 100);

    return (
      <div
        ref={ref}
        className={`relative w-full h-2 bg-secondary rounded-full overflow-hidden ${className}`}
        {...props}
      >
        <div
          className="h-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%`, backgroundColor: 'var(--accent-color)' }}
        />
      </div>
    );
  }
);

Progress.displayName = 'Progress';

export { Progress };
