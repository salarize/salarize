import React from 'react';

const STEPS = [
  { key: 'read', label: 'Lecture' },
  { key: 'validate', label: 'Validation' },
  { key: 'import', label: 'Import' },
];

export function CSVProgressSteps({ currentStep }) {
  if (!currentStep) return null;
  const currentIdx = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex items-center gap-2 py-2 px-1">
      {STEPS.map((step, i) => {
        const isDone = i < currentIdx;
        const isActive = i === currentIdx;
        return (
          <div key={step.key} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 text-xs font-medium transition-colors duration-200 ${
                isDone ? 'text-emerald-600' : isActive ? 'text-violet-600' : 'text-slate-300'
              }`}
            >
              {isDone ? (
                <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : isActive ? (
                <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <div className="w-4 h-4 border-2 border-slate-200 rounded-full" />
              )}
              <span>{step.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-8 h-0.5 transition-colors duration-200 ${isDone ? 'bg-emerald-300' : 'bg-slate-100'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

