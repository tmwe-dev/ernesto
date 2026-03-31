import React from 'react';
import { Check, Circle } from 'lucide-react';

interface StepperProps {
  steps: string[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
}

export const Stepper: React.FC<StepperProps> = ({
  steps,
  currentStep,
  onStepClick,
}) => {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center flex-1">
            {/* Step Circle */}
            <button
              onClick={() => onStepClick?.(index)}
              disabled={index > currentStep}
              className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                index < currentStep
                  ? 'bg-emerald-600 text-white'
                  : index === currentStep
                    ? 'bg-cyan-600 text-white ring-2 ring-cyan-400'
                    : 'bg-slate-800 text-slate-500'
              } ${
                index <= currentStep && onStepClick
                  ? 'cursor-pointer hover:ring-2 hover:ring-cyan-400'
                  : 'cursor-not-allowed'
              }`}
            >
              {index < currentStep ? <Check size={20} /> : <span>{index + 1}</span>}
            </button>

            {/* Step Label */}
            <div className="ml-3 flex-1">
              <p
                className={`text-sm font-medium ${
                  index === currentStep
                    ? 'text-cyan-400'
                    : index < currentStep
                      ? 'text-emerald-400'
                      : 'text-slate-500'
                }`}
              >
                {step}
              </p>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                className={`hidden md:block h-1 flex-1 mx-2 ${
                  index < currentStep ? 'bg-emerald-600' : 'bg-slate-800'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
