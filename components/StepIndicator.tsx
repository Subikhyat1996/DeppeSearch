
import React from 'react';
import { ResearchStep } from '../types';

interface StepIndicatorProps {
  steps: ResearchStep[];
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ steps }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Research Pipeline</h3>
      <div className="space-y-3">
        {steps.map((step) => (
          <div key={step.id} className="flex items-start gap-3 group">
            <div className="mt-1">
              {step.status === 'completed' ? (
                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-[10px] text-white">
                  <i className="fas fa-check"></i>
                </div>
              ) : step.status === 'searching' || step.status === 'analyzing' ? (
                <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
              ) : (
                <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-slate-400">
                  <i className="fas fa-circle"></i>
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className={`text-sm ${step.status === 'pending' ? 'text-slate-500' : 'text-slate-200'}`}>
                {step.query}
              </p>
              {step.status === 'searching' && (
                <span className="text-[10px] font-medium text-blue-400 animate-pulse">Browsing web...</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
