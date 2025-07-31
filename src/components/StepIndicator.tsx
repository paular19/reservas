import React from 'react';
import { Progress } from '@/components/ui/progress';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps?: number;
  className?: string;
  showLabel?: boolean;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ 
  currentStep, 
  totalSteps = 3,
  className = '',
  showLabel = false
}) => {
  const progressValue = (currentStep / totalSteps) * 100;

  return (
    <div className={`mb-6 ${className}`}> {/* Añadido mb-6 para margen inferior */}
      <div className="flex flex-col gap-2">
        <Progress value={progressValue} className="h-2 w-full" />
        {showLabel && (
          <span className="text-xs text-gray-500 text-center">
            Paso {currentStep} de {totalSteps}
          </span>
        )}
      </div>
    </div>
  );
};

export default StepIndicator;