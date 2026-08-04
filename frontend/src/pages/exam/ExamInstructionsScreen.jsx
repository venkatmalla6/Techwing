import React from 'react';
import { BookOpen, Clock, AlertTriangle, Camera, Monitor, Shield, ArrowLeft, Play } from 'lucide-react';

const ExamInstructionsScreen = ({ exam, onProceed, onCancel }) => {
  const totalMarks = exam.questions?.reduce((sum, q) => sum + (q.marks || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-techwing-dark p-6 flex items-start justify-center">
      <div className="max-w-3xl w-full my-8">
        {/* Header Badge */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-techwing-gold/10 border border-techwing-gold/30 text-techwing-gold px-4 py-2 rounded-full text-xs font-bold tracking-widest mb-4">
            <BookOpen className="w-4 h-4" />
            {exam.title.toUpperCase()}
          </div>
          <h1 className="text-3xl font-bold mb-2">Assessment Guidelines</h1>
          <p className="text-gray-400">Please read all instructions carefully before proceeding.</p>
        </div>

        {/* Exam Info Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="glass-panel p-4 text-center">
            <Clock className="w-6 h-6 text-techwing-gold mx-auto mb-2" />
            <p className="text-2xl font-bold">{exam.duration}</p>
            <p className="text-xs text-gray-400">Minutes</p>
          </div>
          <div className="glass-panel p-4 text-center">
            <BookOpen className="w-6 h-6 text-blue-400 mx-auto mb-2" />
            <p className="text-2xl font-bold">{exam.questions?.length || 0}</p>
            <p className="text-xs text-gray-400">Questions</p>
          </div>
          <div className="glass-panel p-4 text-center">
            <Shield className="w-6 h-6 text-techwing-orange mx-auto mb-2" />
            <p className="text-2xl font-bold">{totalMarks}</p>
            <p className="text-xs text-gray-400">Total Marks</p>
          </div>
          <div className="glass-panel p-4 text-center">
            <Monitor className="w-6 h-6 text-green-400 mx-auto mb-2" />
            <p className="text-2xl font-bold">{exam.passingMarks}</p>
            <p className="text-xs text-gray-400">Pass Marks</p>
          </div>
        </div>

        {/* Instructions Panel */}
        <div className="glass-panel p-6 mb-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-techwing-gold" />
            Important Instructions
          </h2>
          <ul className="space-y-3">
            {[
              'Once the exam begins, the timer cannot be paused.',
              'Do not switch tabs, minimize, or navigate away — it will be logged as a violation.',
              'The exam must be taken in fullscreen mode. Exiting fullscreen counts as a violation.',
              `After ${8} violations, your exam will be automatically submitted.`,
              'Camera access is required throughout the exam for proctoring.',
              'Do not use keyboard shortcuts for copy, paste, print, or view source.',
              'Answers are auto-saved every 10 seconds. Do not close the browser.',
              exam.shuffleQuestions ? 'Questions and options are shuffled uniquely for each student.' : '',
            ].filter(Boolean).map((instruction, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                <span className="bg-techwing-gold/20 text-techwing-gold w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {instruction}
              </li>
            ))}
          </ul>
        </div>

        {/* Question Types */}
        {exam.questions && exam.questions.length > 0 && (
          <div className="glass-panel p-6 mb-8">
            <h2 className="text-lg font-bold mb-4">Question Types in This Exam</h2>
            <div className="flex flex-wrap gap-2">
              {[...new Set(exam.questions.map(q => q.type))].map(type => (
                <span key={type} className="px-3 py-1.5 bg-techwing-gold/10 border border-techwing-gold/30 text-techwing-gold rounded-full text-xs font-bold">
                  {type === 'mcq' ? 'Multiple Choice' :
                   type === 'tf' ? 'True / False' :
                   type === 'fib' ? 'Fill in the Blank' :
                   type === 'sa' ? 'Short Answer' :
                   type === 'coding' ? 'Coding Challenge' :
                   type === 'practical-html' ? 'HTML Practical' :
                   type === 'practical-java' ? 'Java Practical' : type}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Warning Banner */}
        <div className="bg-techwing-orange/10 border border-techwing-orange/40 rounded-xl p-4 mb-8 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-techwing-orange flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-300">
            <strong className="text-techwing-orange">Note:</strong> By clicking "Proceed to Verification", you acknowledge these instructions. 
            Your camera will be activated on the next step for identity verification.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button onClick={onCancel} className="btn-secondary flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <button onClick={onProceed} className="btn-primary flex-1 flex items-center justify-center gap-2 text-lg">
            <Play className="w-5 h-5 fill-current" />
            Proceed to Verification
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExamInstructionsScreen;
