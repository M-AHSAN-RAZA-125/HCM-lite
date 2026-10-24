import React from 'react';
import { Check } from 'lucide-react';

export default function FormProgress({ currentStep, steps = [] }) {
  return (
    <nav aria-label="Setup progress" className="w-full">
      <ol className="flex items-center justify-between relative">
        {/* Background track line */}
        <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-200 -z-0" aria-hidden="true" />

        {/* Active progress fill */}
        <div
          className="absolute top-4 left-6 h-0.5 bg-indigo-600 transition-all duration-300 -z-0"
          style={{
            width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
          }}
          aria-hidden="true"
        />

        {steps.map((step, idx) => {
          const stepNum = idx + 1;
          const isCompleted = currentStep > stepNum;
          const isCurrent = currentStep === stepNum;

          return (
            <li key={step.title} className="relative z-10 flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                  isCompleted
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : isCurrent
                    ? 'bg-white border-2 border-indigo-600 text-indigo-600 shadow-sm'
                    : 'bg-white border-2 border-slate-200 text-slate-400'
                }`}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 stroke-[2.5]" />
                ) : (
                  <span className="font-mono">{stepNum}</span>
                )}
              </div>
              <span
                className={`mt-2 text-[11px] sm:text-xs font-medium text-center truncate max-w-[100px] sm:max-w-none ${
                  isCurrent
                    ? 'text-slate-900 font-semibold'
                    : isCompleted
                    ? 'text-slate-700'
                    : 'text-slate-400'
                }`}
              >
                {step.title}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
