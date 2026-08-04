import React from 'react';
import { AlertTriangle } from 'lucide-react';

const WarningOverlay = ({ show, title, message, count, maxCount = 8, onResume }) => {
  if (!show) return null;
  const remaining = maxCount - count;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-techwing-card border border-red-500/40 rounded-2xl p-8 max-w-md w-11/12 text-center shadow-2xl animate-pulse-glow">
        {/* Warning Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-red-500/20 border-2 border-red-500 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <h3 className="text-2xl font-bold text-red-400 mb-3">{title}</h3>
        <p className="text-gray-300 mb-5 text-sm leading-relaxed">{message}</p>

        {/* Violation Counter */}
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-5">
          <p className="text-red-400 font-bold text-lg">
            Violation <span className="text-2xl">{count}</span> of {maxCount}
          </p>
          <p className="text-gray-400 text-xs mt-1">
            {remaining} more violation{remaining === 1 ? '' : 's'} will auto-submit your exam.
          </p>
        </div>

        <button
          onClick={onResume}
          className="w-full btn-primary flex items-center justify-center gap-2"
        >
          Resume Exam (Re-enter Fullscreen)
        </button>
      </div>
    </div>
  );
};

export default WarningOverlay;
