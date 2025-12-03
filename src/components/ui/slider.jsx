import React, { useState, useEffect, useRef } from 'react';
import { cn } from "@/components/utils";

const Slider = React.forwardRef(({ className, min, max, step, value, onValueChange, ...props }, ref) => {
  const [localValue, setLocalValue] = useState(value || [min, max]);
  const sliderRef = useRef(null);

  useEffect(() => {
    setLocalValue(value || [min, max]);
  }, [value, min, max]);

  const handleMouseDown = (index) => (event) => {
    event.preventDefault();
    const moveHandler = (moveEvent) => {
      const rect = sliderRef.current.getBoundingClientRect();
      const percentage = Math.min(Math.max((moveEvent.clientX - rect.left) / rect.width, 0), 1);
      const newValue = min + percentage * (max - min);
      
      const newValues = [...localValue];
      newValues[index] = Math.round(newValue / step) * step;
      
      // Prevent crossing
      if (index === 0 && newValues[0] > newValues[1]) newValues[0] = newValues[1];
      if (index === 1 && newValues[1] < newValues[0]) newValues[1] = newValues[0];
      
      setLocalValue(newValues);
      onValueChange(newValues);
    };

    const upHandler = () => {
      document.removeEventListener('mousemove', moveHandler);
      document.removeEventListener('mouseup', upHandler);
    };

    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', upHandler);
  };

  const getPercentage = (val) => ((val - min) / (max - min)) * 100;

  return (
    <div ref={ref} className={cn("relative flex w-full touch-none select-none items-center", className)} {...props}>
      <div ref={sliderRef} className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
        <div 
          className="absolute h-full bg-primary" 
          style={{ 
            left: `${getPercentage(localValue[0])}%`, 
            right: `${100 - getPercentage(localValue[1])}%` 
          }} 
        />
      </div>
      {[0, 1].map((index) => (
        <div
          key={index}
          className="absolute h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer shadow-md"
          style={{ left: `calc(${getPercentage(localValue[index])}% - 10px)` }}
          onMouseDown={handleMouseDown(index)}
        />
      ))}
    </div>
  );
});

Slider.displayName = "Slider";

export { Slider };