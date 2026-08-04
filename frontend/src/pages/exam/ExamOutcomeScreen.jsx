import React from 'react';
import { CheckCircle, CloudOff, Cloud, Home } from 'lucide-react';

const ExamOutcomeScreen = ({ result, uploadSuccess, onDone }) => {
  const isPassed = result.status === 'Pass';

  return (
    <div className="min-h-screen bg-techwing-dark flex items-center justify-center p-6">
      <div className="glass-panel p-10 max-w-lg w-full text-center">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isPassed ? 'bg-green-500/20 border-2 border-green-500' : 'bg-red-500/20 border-2 border-red-500'}`}>
            <CheckCircle className={`w-10 h-10 ${isPassed ? 'text-green-400' : 'text-red-400'}`} />
          </div>
        </div>

        <h2 className="text-3xl font-bold mb-2">Exam Completed</h2>
        <p className="text-gray-400 mb-6">
          Your responses for <strong className="text-white">{result.examName}</strong> have been secured.
        </p>

        {/* Sync Status */}
        <div className={`flex items-center justify-center gap-3 px-4 py-3 rounded-xl border mb-6 ${
          uploadSuccess ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-techwing-orange/10 border-techwing-orange/30 text-techwing-orange'
        }`}>
          {uploadSuccess ? <Cloud className="w-5 h-5 flex-shrink-0" /> : <CloudOff className="w-5 h-5 flex-shrink-0" />}
          <span className="text-sm font-semibold">
            {uploadSuccess ? 'Responses synced to server successfully.' : 'Responses saved locally. Will sync when connection restores.'}
          </span>
        </div>

        {/* Notice */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-8 text-left">
          <p className="text-sm text-gray-400 leading-relaxed">
            <strong className="text-gray-200">Note:</strong> To maintain evaluation integrity, detailed marks and correct options are restricted. 
            Your responses are logged securely and are available only in the teacher's dashboard.
          </p>
        </div>

        {/* Violations Summary */}
        {result.totalViolations > 0 && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-left">
            <p className="text-xs font-bold text-red-400 mb-2">Security Log</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
              <span>Tab switches: <strong className="text-white">{result.tabSwitchingCount}</strong></span>
              <span>Fullscreen exits: <strong className="text-white">{result.fullscreenViolations}</strong></span>
              <span>Camera issues: <strong className="text-white">{result.cameraViolations}</strong></span>
              <span>Total violations: <strong className="text-red-400">{result.totalViolations}</strong></span>
            </div>
          </div>
        )}

        <button
          onClick={onDone}
          className="btn-primary w-full flex items-center justify-center gap-2 text-lg"
        >
          <Home className="w-5 h-5" /> Return to Dashboard
        </button>
      </div>
    </div>
  );
};

export default ExamOutcomeScreen;
