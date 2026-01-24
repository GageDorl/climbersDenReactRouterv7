import * as React from 'react';

interface SliderProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  value: number[];
  onValueChange: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  (
    { value, onValueChange, min = 0, max = 100, step = 1, className = '', ...props },
    ref
  ) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onValueChange([parseFloat(e.target.value)]);
    };

    return (
      <input
        ref={ref}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value[0]}
        onChange={handleChange}
        className={`w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer ${className}`}
        style={{accentColor: 'var(--accent-color)'}}
        {...props}
      />
    );
  }
);

Slider.displayName = 'Slider';

export { Slider };
