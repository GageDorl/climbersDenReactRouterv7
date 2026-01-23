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
            className={`block w-full text-sm text-gray-900 dark:text-gray-100 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/20 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/30 cursor-pointer ${className}`}
            ref={ref}
            {...props}
          />
          {error && <p className="mt-1 text-sm text-red-500 dark:text-red-400">{error}</p>}
        </div>
      );
    }

    // Standard text/email/password inputs - always light mode
    return (
      <div className="w-full">
        <input
          type={type}
          className={`flex h-10 w-full rounded-md border ${
            error ? 'border-red-500' : 'border-gray-300'
          } bg-white px-3 py-2 text-sm text-black ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 ${
            error ? 'focus-visible:ring-red-500' : 'focus-visible:ring-blue-600'
          } focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&:-webkit-autofill]:[-webkit-text-fill-color:rgb(0,0,0)] [&:-webkit-autofill]:shadow-[inset_0_0_0px_1000px_rgb(232,240,254)] ${className}`}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
