import * as React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', type, error, ...props }, ref) => {
    // Handle file inputs differently
    if (type === 'file') {
      return (
        <div className="w-full">
          <input
            type="file"
            className={`block w-full text-sm text-primary file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-secondary file:text-primary hover:file:bg-secondary hover:file:bg-opacity-80 cursor-pointer ${className}`}
            ref={ref}
            {...props}
          />
          {error && <p className="mt-1 text-sm" style={{color: 'var(--destructive-color)'}}>{error}</p>}
        </div>
      );
    }

    // Standard text/email/password inputs
    return (
      <div className="w-full">
        <input
          type={type}
          className={`flex h-10 w-full rounded-md border border-default bg-surface px-3 py-2 text-sm text-primary ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
          style={error ? {borderColor: 'var(--destructive-color)'} : {}}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-1 text-sm" style={{color: 'var(--destructive-color)'}}>{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
