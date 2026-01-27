interface PageWrapperProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '7xl';
  className?: string;
}

export function PageWrapper({ children, maxWidth = '2xl', className = '' }: PageWrapperProps) {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '7xl': 'max-w-7xl',
  };

  return (
    <div className={`min-h-screen bg-surface py-8 pb-20 md:pb-8 `}>
      <div className={`w-full ${maxWidthClasses[maxWidth]} mx-auto px-4 ${className}`}>
        {children}
      </div>
    </div>
  );
}
