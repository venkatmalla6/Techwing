import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import ExamStudentDashboard from './ExamStudentDashboard';
import ExamInstructionsScreen from './ExamInstructionsScreen';
import ExamVerificationScreen from './ExamVerificationScreen';
import ExamEngine from './ExamEngine';
import ExamOutcomeScreen from './ExamOutcomeScreen';

/**
 * ExamPortalPage - Main state machine for the exam flow.
 * Uses TechWing's existing JWT auth (Option B).
 * States: dashboard → instructions → verification → exam → outcome
 */
const ExamPortalPage = () => {
  const { user, logout } = useAuth();

  const [examState, setExamState] = useState('dashboard');
  const [activeExam, setActiveExam] = useState(null);
  const [activeResult, setActiveResult] = useState(null);
  const [activeDraft, setActiveDraft] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Build student session from TechWing user (Option B)
  const studentSession = {
    name: user?.name || 'Student',
    rollNumber: user?.pinNumber || user?.id || user?.email || String(user?.id || '')
  };

  const handleStartExam = (exam, draft) => {
    setActiveExam(exam);
    if (draft) {
      setActiveDraft(draft);
      setExamState('exam');
    } else {
      setActiveDraft(null);
      setExamState('instructions');
    }
  };

  const handleLogout = () => {
    logout();
  };

  switch (examState) {
    case 'dashboard':
      return (
        <ExamStudentDashboard
          onStartExam={handleStartExam}
          onLogout={handleLogout}
        />
      );

    case 'instructions':
      return (
        <ExamInstructionsScreen
          exam={activeExam}
          onProceed={() => setExamState('verification')}
          onCancel={() => {
            setActiveExam(null);
            setExamState('dashboard');
          }}
        />
      );

    case 'verification':
      return (
        <ExamVerificationScreen
          exam={activeExam}
          onVerifySuccess={() => setExamState('exam')}
          onCancel={() => {
            setActiveExam(null);
            setExamState('dashboard');
          }}
        />
      );

    case 'exam':
      return (
        <ExamEngine
          exam={activeExam}
          student={studentSession}
          activeDraft={activeDraft}
          onFinished={(result, uploaded) => {
            setActiveResult(result);
            setUploadSuccess(uploaded);
            setActiveDraft(null);
            setExamState('outcome');
          }}
        />
      );

    case 'outcome':
      return (
        <ExamOutcomeScreen
          result={activeResult}
          uploadSuccess={uploadSuccess}
          onDone={() => {
            setActiveExam(null);
            setActiveResult(null);
            setExamState('dashboard');
          }}
        />
      );

    default:
      return (
        <ExamStudentDashboard
          onStartExam={handleStartExam}
          onLogout={handleLogout}
        />
      );
  }
};

export default ExamPortalPage;
