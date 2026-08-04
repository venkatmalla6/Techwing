import React, { useEffect, useRef, useState, useCallback } from 'react';
import { addResult, updateResultDraft } from '../../services/examService';
import {
  startSecuritySystem, stopSecuritySystem, requestFullscreen,
  getViolationLog, getCameraCaptures
} from '../../utils/examSecurity';
import { saveLocalExamState, clearLocalExamState, seededShuffle, formatDuration } from '../../utils/examUtils';
import { transpileJavaToJS, extractMethodName, runTestCase } from '../../utils/javaTranspiler';
import { showModal, showToast, showConfirm } from '../../utils/examNotifications';
import WarningOverlay from './WarningOverlay';
import { Editor } from '@monaco-editor/react';
import { ChevronLeft, ChevronRight, Send, Clock, Camera, AlertTriangle } from 'lucide-react';

const MAX_VIOLATIONS = 8;

const ExamEngine = ({ exam, student, activeDraft, onFinished }) => {
  const videoRef = useRef(null);
  const iframeRef = useRef(null);
  const resultIdRef = useRef(activeDraft ? activeDraft.id : 'result_' + Date.now());

  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [secondsRemaining, setSecondsRemaining] = useState(exam.duration * 60);
  const [questions, setQuestions] = useState([]);
  const [visitedQuestions, setVisitedQuestions] = useState({});

  const [showWarning, setShowWarning] = useState(false);
  const [warningTitle, setWarningTitle] = useState('');
  const [warningMsg, setWarningMsg] = useState('');
  const [warningNum, setWarningNum] = useState(0);
  const [showViolationBanner, setShowViolationBanner] = useState(false);
  const [violationBannerCount, setViolationBannerCount] = useState(0);
  const violationBannerTimerRef = useRef(null);

  const [sandboxOutputs, setSandboxOutputs] = useState({});
  const [submissionFeedback, setSubmissionFeedback] = useState({});
  const [splitPercent, setSplitPercent] = useState(50);

  const activeQ = questions[activeQuestionIdx];
  const activeAnswer = activeQ ? (answers[activeQ.id] || '') : '';

  // Track visited questions
  useEffect(() => {
    if (questions.length > 0 && activeQuestionIdx >= 0 && activeQuestionIdx < questions.length) {
      const qId = questions[activeQuestionIdx].id;
      setVisitedQuestions(prev => prev[qId] ? prev : { ...prev, [qId]: true });
    }
  }, [activeQuestionIdx, questions]);

  // 1. Setup questions with seeded shuffle
  useEffect(() => {
    const seedStr = student.rollNumber + '_' + exam.id;
    const questionsWithIds = exam.questions.map((q, idx) => q.id ? q : { ...q, id: `q_${idx}` });

    const rawMcqList = questionsWithIds.filter(q => q.type !== 'coding' && !q.type?.startsWith('practical'));
    const codingList = questionsWithIds.filter(q => q.type === 'coding' || q.type?.startsWith('practical'));

    const shuffledMcqList = seededShuffle(rawMcqList, seedStr);
    const mcqListWithShuffledOptions = shuffledMcqList.map(q => {
      if (q.type !== 'mcq' || !q.options || q.options.length === 0) return q;
      const originalCorrectIdx = q.correctOptionIndex ?? 0;
      const optObjs = q.options.map((text, idx) => ({ text, isCorrect: idx === originalCorrectIdx }));
      const shuffledOptObjs = seededShuffle(optObjs, seedStr + q.id);
      const newCorrectIdx = shuffledOptObjs.findIndex(o => o.isCorrect);
      return { ...q, options: shuffledOptObjs.map(o => o.text), correctOptionIndex: newCorrectIdx };
    });

    const orderedQs = [...mcqListWithShuffledOptions, ...codingList];
    setQuestions(orderedQs);

    if (activeDraft) {
      setAnswers(activeDraft.answers || {});
      const start = new Date(activeDraft.date + ' ' + activeDraft.startTime).getTime();
      const elapsed = Math.floor((Date.now() - start) / 1000);
      setSecondsRemaining(Math.max(10, (exam.duration * 60) - elapsed));
    } else {
      // Create initial draft entry
      const now = new Date();
      const initialResult = {
        id: resultIdRef.current,
        examId: exam.id,
        examName: exam.title,
        studentName: student.name,
        rollNumber: student.rollNumber,
        date: now.toLocaleDateString(),
        startTime: now.toLocaleTimeString(),
        endTime: '',
        timeTaken: '0 sec',
        totalQuestions: exam.questions.length,
        correctAnswers: 0,
        wrongAnswers: exam.questions.length,
        marksObtained: 0,
        totalMarks: exam.questions.reduce((acc, q) => acc + (q.marks || 0), 0),
        percentage: 0,
        status: 'Draft',
        isSubmitted: false,
        cameraViolations: 0,
        microphoneViolations: 0,
        fullscreenViolations: 0,
        tabSwitchingCount: 0,
        totalViolations: 0,
        violationLog: [],
        cameraCaptures: [],
        answers: {}
      };
      addResult(initialResult);
    }
  }, [exam, student, activeDraft]);

  // 2. Security system
  useEffect(() => {
    let securityInit = false;
    window.history.pushState(null, '', window.location.href);
    const preventBack = () => {
      window.history.pushState(null, '', window.location.href);
      showToast('Navigation is disabled during the examination.', 'warning');
    };
    const preventClose = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('popstate', preventBack);
    window.addEventListener('beforeunload', preventClose);

    const initSecurity = async () => {
      if (videoRef.current && !securityInit) {
        securityInit = true;
        await startSecuritySystem({
          videoElement: videoRef.current,
          onViolation: (v) => console.log('Violation:', v),
          onWarning: (type, count) => {
            setViolationBannerCount(count);
            setShowViolationBanner(true);
            if (violationBannerTimerRef.current) clearTimeout(violationBannerTimerRef.current);
            violationBannerTimerRef.current = setTimeout(() => setShowViolationBanner(false), 5000);
            setWarningTitle(`${type} Detected!`);
            setWarningMsg(getViolationTip(type));
            setWarningNum(count);
            setShowWarning(true);
          },
          onAutoSubmit: (reason) => {
            showModal('⚠️ Exam Auto-Submitted', `Your exam has been automatically submitted.\n\nReason: ${reason}`, 'error');
            handleAutoSubmit();
          }
        });
      }
    };

    const t = setTimeout(initSecurity, 500);
    return () => {
      clearTimeout(t);
      stopSecuritySystem();
      window.removeEventListener('popstate', preventBack);
      window.removeEventListener('beforeunload', preventClose);
    };
  }, []);

  // 3. Timer
  useEffect(() => {
    if (secondsRemaining <= 0) {
      showModal('⏰ Time Expired', 'Your exam time has run out. Your answers are being submitted automatically.', 'warning');
      handleAutoSubmit();
      return;
    }
    const timer = setInterval(() => setSecondsRemaining(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [secondsRemaining]);

  // 4. Auto-save every 10s
  useEffect(() => {
    const interval = setInterval(async () => {
      saveLocalExamState(student.rollNumber, exam.id, { answers, activeQuestionIndex: activeQuestionIdx, secondsRemaining });
      await updateResultDraft(resultIdRef.current, answers, getViolationLog(), getCameraCaptures());
    }, 10000);
    return () => clearInterval(interval);
  }, [answers, activeQuestionIdx, secondsRemaining]);

  // Live HTML preview
  useEffect(() => {
    if (activeQ?.type === 'practical-html' && iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(answers[activeQ.id] || activeQ.codeTemplate || '');
        doc.close();
      }
    }
  }, [answers, activeQuestionIdx, questions]);

  const getViolationTip = (type) => {
    const tips = {
      'Tab Switch': 'You switched to another tab or minimized the window. This is strictly prohibited.',
      'Exit Fullscreen': 'You exited fullscreen mode. The exam must run in fullscreen at all times.',
      'Screenshot Attempt': 'You attempted to take a screenshot. This is not allowed.',
    };
    return tips[type] || `A security violation (${type}) was detected. Please remain focused on the exam.`;
  };

  const computeResult = useCallback(() => {
    const violationLog = getViolationLog();
    const cameraCaptures = getCameraCaptures();
    const tabSwitches = violationLog.filter(v => v.type === 'Tab Switch').length;
    const fullscreenViolations = violationLog.filter(v => v.type === 'Exit Fullscreen').length;
    const cameraViolations = violationLog.filter(v => v.type === 'Camera Disabled').length;
    const totalViolations = violationLog.filter(v => v.warningNumber !== null).length;
    const now = new Date();

    let correctAnswers = 0;
    let marksObtained = 0;
    const totalMarks = questions.reduce((acc, q) => acc + (q.marks || 0), 0);

    questions.forEach(q => {
      const ans = answers[q.id] || '';
      if (q.type === 'mcq') {
        if (parseInt(ans) === q.correctOptionIndex) {
          correctAnswers++;
          marksObtained += q.marks || 0;
        }
      } else if (q.type === 'tf') {
        if (ans === q.correctAnswer) {
          correctAnswers++;
          marksObtained += q.marks || 0;
        }
      } else if (q.type === 'fib') {
        if (ans.trim().toLowerCase() === (q.correctAnswer || '').trim().toLowerCase()) {
          correctAnswers++;
          marksObtained += q.marks || 0;
        }
      } else if (q.type === 'coding' || q.type === 'practical-java') {
        const fb = submissionFeedback[q.id];
        if (fb?.passed) {
          correctAnswers++;
          marksObtained += q.marks || 0;
        }
      }
    });

    const wrongAnswers = questions.length - correctAnswers;
    const percentage = totalMarks > 0 ? (marksObtained / totalMarks) * 100 : 0;
    const timeTaken = formatDuration(exam.duration * 60 - secondsRemaining);

    return {
      id: resultIdRef.current,
      examId: exam.id,
      examName: exam.title,
      studentName: student.name,
      rollNumber: student.rollNumber,
      date: now.toLocaleDateString(),
      startTime: '',
      endTime: now.toLocaleTimeString(),
      timeTaken,
      totalQuestions: questions.length,
      correctAnswers,
      wrongAnswers,
      marksObtained,
      totalMarks,
      percentage,
      status: marksObtained >= exam.passingMarks ? 'Pass' : 'Fail',
      isSubmitted: true,
      cameraViolations,
      microphoneViolations: 0,
      fullscreenViolations,
      tabSwitchingCount: tabSwitches,
      totalViolations,
      violationLog,
      cameraCaptures,
      answers
    };
  }, [questions, answers, exam, student, secondsRemaining, submissionFeedback]);

  const handleAutoSubmit = useCallback(async () => {
    stopSecuritySystem();
    clearLocalExamState(student.rollNumber, exam.id);
    const result = computeResult();
    const { success } = await addResult(result);
    onFinished(result, success);
  }, [computeResult, student, exam, onFinished]);

    const handleManualSubmit = () => {
    const answeredCount = Object.keys(answers).length;
    const unanswered = questions.length - answeredCount;
    const msg = unanswered > 0
      ? `You have ${unanswered} unanswered question${unanswered > 1 ? 's' : ''}. Are you sure you want to submit?`
      : 'Are you sure you want to submit your exam?';

    showConfirm('Submit Exam?', msg, () => handleAutoSubmit(), undefined, 'Yes, Submit', 'Cancel');
  };

  const runCodingTests = async (q) => {
    if (!q.testCases?.length) return;
    const code = answers[q.id] || q.codeTemplate || '';
    let transpiledCode = code;
    if (q.type === 'practical-java') {
      transpiledCode = transpileJavaToJS(code);
    }
    const methodName = extractMethodName(transpiledCode);
    if (!methodName) {
      showToast('Could not find a function to test. Make sure you have a named function.', 'warning');
      return;
    }
    const outputs = q.testCases.map(tc => {
      const result = runTestCase(transpiledCode, methodName, tc.input);
      return { ...tc, actual: result.actual, passed: result.actual === tc.expected };
    });
    setSandboxOutputs(prev => ({ ...prev, [q.id]: outputs }));
    const allPassed = outputs.every(o => o.passed);
    setSubmissionFeedback(prev => ({ ...prev, [q.id]: { passed: allPassed, message: allPassed ? 'All test cases passed!' : 'Some test cases failed.' } }));
    showToast(allPassed ? `✅ All ${outputs.length} test cases passed!` : `⚠️ ${outputs.filter(o => !o.passed).length} test case(s) failed.`, allPassed ? 'success' : 'warning');
  };

  // Timer color
  const timerColor = secondsRemaining <= 300 ? 'text-red-400' : secondsRemaining <= 600 ? 'text-techwing-orange' : 'text-techwing-gold';
  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  const timerStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  if (!activeQ) return (
    <div className="min-h-screen bg-techwing-dark flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-techwing-gold border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-techwing-dark flex flex-col">
      {/* Warning Overlay */}
      <WarningOverlay
        show={showWarning}
        title={warningTitle}
        message={warningMsg}
        count={warningNum}
        maxCount={MAX_VIOLATIONS}
        onResume={() => { setShowWarning(false); requestFullscreen(); }}
      />

      {/* Violation Banner */}
      {showViolationBanner && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white font-bold px-6 py-3 rounded-full shadow-lg text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Violation {violationBannerCount} / {MAX_VIOLATIONS}
        </div>
      )}

      {/* Top Bar */}
      <div className="bg-techwing-card border-b border-white/10 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-xs text-gray-400">Examination</p>
          <p className="font-bold text-sm truncate max-w-xs">{exam.title}</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Hidden camera feed */}
          <video ref={videoRef} muted playsInline className="w-0 h-0 opacity-0" />
          <div className={`flex items-center gap-2 font-mono font-bold text-xl ${timerColor}`}>
            <Clock className="w-5 h-5" />
            {timerStr}
          </div>
          <button
            onClick={handleManualSubmit}
            className="btn-primary text-sm flex items-center gap-2 py-2"
          >
            <Send className="w-4 h-4" /> Submit
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Question Navigator */}
        <div className="w-16 sm:w-48 bg-techwing-card border-r border-white/10 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-white/10">
            <p className="text-xs text-gray-400 hidden sm:block">Questions</p>
            <p className="text-xs text-gray-500 hidden sm:block">{Object.keys(answers).length}/{questions.length} answered</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 grid grid-cols-2 sm:grid-cols-3 gap-1.5 content-start">
            {questions.map((q, idx) => {
              const isAnswered = !!answers[q.id];
              const isActive = idx === activeQuestionIdx;
              const isVisited = visitedQuestions[q.id];
              return (
                <button
                  key={q.id}
                  onClick={() => setActiveQuestionIdx(idx)}
                  className={`h-8 rounded-lg text-xs font-bold transition-all ${
                    isActive ? 'bg-gradient-to-r from-techwing-gold to-techwing-orange text-black' :
                    isAnswered ? 'bg-green-500/20 border border-green-500/40 text-green-400' :
                    isVisited ? 'bg-white/5 border border-white/20 text-gray-300' :
                    'bg-white/5 text-gray-500 border border-transparent'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
          <div className="p-2 border-t border-white/10 space-y-1 hidden sm:block">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="w-3 h-3 rounded bg-green-500/30 border border-green-500/40" /> Answered
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="w-3 h-3 rounded bg-white/10 border border-white/20" /> Visited
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="w-3 h-3 rounded bg-white/5 border border-transparent" /> Not visited
            </div>
          </div>
        </div>

        {/* Question Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Question Header */}
          <div className="px-6 pt-5 pb-3 border-b border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="bg-techwing-gold/20 text-techwing-gold text-xs font-bold px-2.5 py-1 rounded-full">
                  Q{activeQuestionIdx + 1} / {questions.length}
                </span>
                <span className="bg-white/10 text-gray-300 text-xs px-2.5 py-1 rounded-full">
                  {activeQ.marks} mark{activeQ.marks !== 1 ? 's' : ''}
                </span>
                <span className="bg-blue-500/10 text-blue-400 text-xs px-2.5 py-1 rounded-full">
                  {activeQ.type === 'mcq' ? 'MCQ' : activeQ.type === 'tf' ? 'True/False' : activeQ.type === 'fib' ? 'Fill in Blank' : activeQ.type === 'sa' ? 'Short Answer' : activeQ.type === 'coding' ? 'Coding' : activeQ.type === 'practical-html' ? 'HTML Practical' : 'Java Practical'}
                </span>
              </div>
            </div>
            <p className="text-white font-semibold leading-relaxed">{activeQ.questionText}</p>
          </div>

          {/* Answer Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* MCQ */}
            {activeQ.type === 'mcq' && (
              <div className="space-y-3 max-w-2xl">
                {activeQ.options?.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => setAnswers(prev => ({ ...prev, [activeQ.id]: String(i) }))}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      activeAnswer === String(i)
                        ? 'bg-techwing-gold/15 border-techwing-gold text-white'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mr-3 ${
                      activeAnswer === String(i) ? 'bg-techwing-gold text-black' : 'bg-white/10 text-gray-400'
                    }`}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {/* True/False */}
            {activeQ.type === 'tf' && (
              <div className="flex gap-4 max-w-sm">
                {['true', 'false'].map(val => (
                  <button
                    key={val}
                    onClick={() => setAnswers(prev => ({ ...prev, [activeQ.id]: val }))}
                    className={`flex-1 p-5 rounded-xl border font-bold text-lg transition-all ${
                      activeAnswer === val
                        ? 'bg-techwing-gold/15 border-techwing-gold text-techwing-gold'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    {val === 'true' ? '✓ True' : '✗ False'}
                  </button>
                ))}
              </div>
            )}

            {/* Fill in Blank / Short Answer */}
            {(activeQ.type === 'fib' || activeQ.type === 'sa') && (
              <div className="max-w-xl">
                {activeQ.type === 'fib' ? (
                  <input
                    type="text"
                    value={activeAnswer}
                    onChange={e => setAnswers(prev => ({ ...prev, [activeQ.id]: e.target.value }))}
                    placeholder="Type your answer here..."
                    className="input-field text-base"
                  />
                ) : (
                  <textarea
                    rows={6}
                    value={activeAnswer}
                    onChange={e => setAnswers(prev => ({ ...prev, [activeQ.id]: e.target.value }))}
                    placeholder="Type your detailed answer here..."
                    className="input-field resize-none text-base"
                  />
                )}
              </div>
            )}

            {/* Coding / Java Practical */}
            {(activeQ.type === 'coding' || activeQ.type === 'practical-java') && (
              <div className="flex flex-col h-full" style={{ minHeight: '400px' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-gray-400">Language:</span>
                  <span className="px-2 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded text-xs font-bold">
                    {activeQ.type === 'practical-java' ? 'Java' : (activeQ.codingLanguage || 'JavaScript')}
                  </span>
                </div>
                <div className="flex-1 rounded-xl overflow-hidden border border-white/10">
                  <Editor
                    height="320px"
                    language={activeQ.type === 'practical-java' ? 'java' : (activeQ.codingLanguage || 'javascript')}
                    theme="vs-dark"
                    value={activeAnswer || activeQ.codeTemplate || ''}
                    onChange={val => setAnswers(prev => ({ ...prev, [activeQ.id]: val || '' }))}
                    options={{ fontSize: 14, minimap: { enabled: false }, lineNumbers: 'on', scrollBeyondLastLine: false }}
                  />
                </div>
                {activeQ.testCases?.length > 0 && (
                  <div className="mt-4">
                    <button
                      onClick={() => runCodingTests(activeQ)}
                      className="btn-secondary text-sm"
                    >
                      ▶ Run Test Cases ({activeQ.testCases.length})
                    </button>
                    {sandboxOutputs[activeQ.id] && (
                      <div className="mt-3 space-y-2">
                        {sandboxOutputs[activeQ.id].map((tc, i) => (
                          <div key={i} className={`p-3 rounded-lg border text-xs font-mono ${tc.passed ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                            <p className={`font-bold mb-1 ${tc.passed ? 'text-green-400' : 'text-red-400'}`}>
                              Test {i + 1}: {tc.passed ? '✓ PASS' : '✗ FAIL'}
                            </p>
                            <p className="text-gray-400">Input: <span className="text-white">{tc.input}</span></p>
                            <p className="text-gray-400">Expected: <span className="text-green-300">{tc.expected}</span></p>
                            <p className="text-gray-400">Got: <span className={tc.passed ? 'text-green-300' : 'text-red-300'}>{tc.actual}</span></p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* HTML Practical */}
            {activeQ.type === 'practical-html' && (
              <div className="flex gap-4" style={{ height: '420px' }}>
                <div className="flex-1 rounded-xl overflow-hidden border border-white/10">
                  <Editor
                    height="100%"
                    language="html"
                    theme="vs-dark"
                    value={activeAnswer || activeQ.codeTemplate || ''}
                    onChange={val => setAnswers(prev => ({ ...prev, [activeQ.id]: val || '' }))}
                    options={{ fontSize: 14, minimap: { enabled: false } }}
                  />
                </div>
                <div className="flex-1 rounded-xl overflow-hidden border border-white/10 bg-white">
                  <iframe ref={iframeRef} className="w-full h-full border-0" title="HTML Preview" />
                </div>
              </div>
            )}
          </div>

          {/* Navigation Footer */}
          <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
            <button
              onClick={() => setActiveQuestionIdx(prev => Math.max(0, prev - 1))}
              disabled={activeQuestionIdx === 0}
              className="btn-secondary flex items-center gap-2 py-2 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <p className="text-sm text-gray-400">
              {activeQuestionIdx + 1} of {questions.length}
            </p>
            {activeQuestionIdx === questions.length - 1 ? (
              <button onClick={handleManualSubmit} className="btn-primary flex items-center gap-2 py-2">
                <Send className="w-4 h-4" /> Submit Exam
              </button>
            ) : (
              <button
                onClick={() => setActiveQuestionIdx(prev => Math.min(questions.length - 1, prev + 1))}
                className="btn-primary flex items-center gap-2 py-2"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamEngine;
