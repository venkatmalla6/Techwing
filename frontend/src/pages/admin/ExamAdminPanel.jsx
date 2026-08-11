import React, { useState, useEffect } from 'react';
import { getExams, addExam, deleteExam, getResults } from '../../services/examService';
import { parseCSVQuestions, downloadResultsCSV } from '../../utils/examUtils';
import { showToast, showModal, showConfirm } from '../../utils/examNotifications';
import {
  BookOpen, Plus, Trash2, Download, Upload,
  BarChart2, Eye, Search, RefreshCw, FileText, Loader2, X
} from 'lucide-react';

const QUESTION_TYPES = [
  { value: 'mcq', label: 'Multiple Choice (MCQ)' },
  { value: 'tf', label: 'True / False' },
  { value: 'fib', label: 'Fill in the Blank' },
  { value: 'sa', label: 'Short Answer' },
  { value: 'coding', label: 'Coding Challenge' },
  { value: 'practical-html', label: 'HTML Practical' },
  { value: 'practical-java', label: 'Java Practical' },
];

export default function ExamAdminPanel() {
  const [activeTab, setActiveTab] = useState('exams');
  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResult, setSelectedResult] = useState(null);

  // Exam creator
  const [examTitle, setExamTitle] = useState('');
  const [examDuration, setExamDuration] = useState(90);
  const [examPassingMarks, setExamPassingMarks] = useState(40);
  const [examStart, setExamStart] = useState('');
  const [examEnd, setExamEnd] = useState('');
  const [shuffleQs, setShuffleQs] = useState(true);
  const [shuffleOpts, setShuffleOpts] = useState(true);
  const [creationMode, setCreationMode] = useState('manual');
  const [jsonContent, setJsonContent] = useState('');
  const [currentQuestions, setCurrentQuestions] = useState([]);
  const [selectedQType, setSelectedQType] = useState('mcq');
  const [fileName, setFileName] = useState('');
  const [saving, setSaving] = useState(false);

  const syncData = async () => {
    setLoading(true);
    try {
      const [fetchedExams, fetchedResults] = await Promise.all([getExams(), getResults()]);
      setExams(fetchedExams);
      setResults(fetchedResults);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncData();
    const now = new Date();
    setExamStart(now.toISOString().slice(0, 16));
    setExamEnd(new Date(now.getTime() + 86400000).toISOString().slice(0, 16));
  }, []);

  const handleDeleteExam = (id) => {
    showConfirm('Delete Exam?', 'This will permanently delete the exam. This action cannot be undone.', async () => {
      const res = await deleteExam(id);
      if (res.success) {
        showToast('Exam deleted successfully.', 'success');
        await syncData();
      } else {
        showToast('Failed to delete: ' + (res.error || 'Unknown error'), 'error');
      }
    }, undefined, 'Delete Permanently', 'Cancel');
  };

  // Question handlers
  const handleAddQuestion = () => {
    const q = {
      id: 'q_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      type: selectedQType,
      questionText: '',
      marks: selectedQType === 'coding' ? 15 : selectedQType.startsWith('practical') ? 10 : 1
    };
    if (selectedQType === 'mcq') { q.options = ['', '', '', '']; q.correctOptionIndex = 0; }
    else if (selectedQType === 'tf') { q.correctAnswer = 'true'; }
    else if (selectedQType === 'coding' || selectedQType === 'practical-java') {
      q.codingLanguage = 'javascript';
      q.codeTemplate = 'function solution() {\n  // your code here\n}';
      q.testCases = [{ input: '', expected: '' }];
    } else if (selectedQType === 'practical-html') {
      q.codeTemplate = '<!DOCTYPE html>\n<html>\n<body>\n  \n</body>\n</html>';
      q.correctAnswer = 'form';
    } else { q.correctAnswer = ''; }
    setCurrentQuestions(prev => [...prev, q]);
  };

  const updateQuestion = (idx, updates) => {
    setCurrentQuestions(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], ...updates };
      return updated;
    });
  };

  const handleSaveExam = async () => {
    const title = examTitle.trim();
    if (!title) { showToast('Please enter an exam title.', 'warning'); return; }
    if (currentQuestions.length === 0) { showToast('Please add at least one question.', 'warning'); return; }
    for (let i = 0; i < currentQuestions.length; i++) {
      const q = currentQuestions[i];
      if (!q.questionText.trim()) { showToast(`Question ${i + 1} has no text.`, 'warning'); return; }
      if (q.type === 'mcq' && q.options?.some(o => !o.trim())) { showToast(`All MCQ options in Q${i + 1} must be filled.`, 'warning'); return; }
    }
    const totalMarks = currentQuestions.reduce((s, q) => s + (q.marks || 0), 0);
    if (examPassingMarks > totalMarks) { showToast(`Passing marks (${examPassingMarks}) exceeds total (${totalMarks}).`, 'warning'); return; }

    const exam = {
      id: 'exam_' + Date.now(),
      title, duration: examDuration, passingMarks: examPassingMarks,
      startDate: examStart, endDate: examEnd,
      shuffleQuestions: shuffleQs, shuffleOptions: shuffleOpts,
      showResultToStudent: true, resumeWindow: 60,
      questions: currentQuestions
    };

    setSaving(true);
    const res = await addExam(exam);
    setSaving(false);
    if (res.success) {
      showToast(`Exam "${title}" created with ${currentQuestions.length} questions!`, 'success');
      setExamTitle(''); setCurrentQuestions([]);
      await syncData();
      setActiveTab('exams');
    } else {
      showToast('Failed to save exam: ' + (res.error || 'Unknown error'), 'error');
    }
  };

  const handleJSONImport = async () => {
    try {
      const parsed = JSON.parse(jsonContent.trim());
      if (Array.isArray(parsed)) { showModal('Invalid JSON', 'Wrap questions in an exam object with title, duration, passingMarks, questions.', 'error'); return; }
      if (!parsed.title || !parsed.questions?.length) { showToast('Missing title or questions in JSON.', 'error'); return; }

      const questions = parsed.questions.map((q, idx) => ({
        id: q.id || `q_json_${idx}_${Date.now()}`,
        type: q.type || 'mcq', questionText: q.questionText || '',
        marks: q.marks || 1, options: q.options,
        correctOptionIndex: q.correctOptionIndex, correctAnswer: q.correctAnswer,
        codingLanguage: q.codingLanguage, codeTemplate: q.codeTemplate, testCases: q.testCases
      }));

      const totalMarks = questions.reduce((s, q) => s + q.marks, 0);
      const exam = {
        id: parsed.id || 'exam_' + Date.now(),
        title: parsed.title, duration: parsed.duration || 90,
        passingMarks: parsed.passingMarks || Math.round(totalMarks * 0.4),
        startDate: parsed.startDate || new Date().toISOString().slice(0, 16),
        endDate: parsed.endDate || new Date(Date.now() + 86400000).toISOString().slice(0, 16),
        shuffleQuestions: parsed.shuffleQuestions ?? true, shuffleOptions: parsed.shuffleOptions ?? true,
        showResultToStudent: parsed.showResultToStudent ?? true, resumeWindow: parsed.resumeWindow ?? 60,
        questions
      };

      setSaving(true);
      const res = await addExam(exam);
      setSaving(false);
      if (res.success) {
        showToast(`Imported "${exam.title}" with ${exam.questions.length} questions!`, 'success');
        setJsonContent(''); await syncData(); setActiveTab('exams');
      } else {
        showToast('Failed to import: ' + res.error, 'error');
      }
    } catch (err) {
      showModal('JSON Parse Error', 'Invalid JSON. Error: ' + err.message, 'error');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target.result;
      if (file.name.endsWith('.json')) {
        setJsonContent(content);
        setCreationMode('json');
      } else if (file.name.endsWith('.csv')) {
        try {
          const questions = parseCSVQuestions(content);
          setCurrentQuestions(questions);
          setCreationMode('manual');
          showToast(`Loaded ${questions.length} questions from CSV!`, 'success');
        } catch (err) {
          showToast('Failed to parse CSV: ' + err.message, 'error');
        }
      } else {
        showToast('Unsupported file. Please use .csv or .json', 'error');
      }
    };
    reader.readAsText(file);
  };

  // Results filter
  const filteredResults = results.filter(r =>
    !searchQuery || r.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.rollNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.examName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tabs = [
    { id: 'exams', label: 'All Exams', icon: BookOpen },
    { id: 'create', label: 'Create Exam', icon: Plus },
    { id: 'results', label: 'Results', icon: BarChart2 },
  ];

  return (
    <div>
      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b border-white/10 pb-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-techwing-gold to-techwing-orange text-black font-bold'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
        <button
          onClick={syncData}
          disabled={loading}
          className="ml-auto btn-secondary flex items-center gap-2 py-2 text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* ── EXAMS TAB ── */}
      {activeTab === 'exams' && (
        <div>
          {loading ? (
            <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-techwing-gold border-t-transparent rounded-full animate-spin" /></div>
          ) : exams.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500">No exams created yet.</p>
              <button onClick={() => setActiveTab('create')} className="btn-primary mt-4 text-sm">
                <Plus className="w-4 h-4 inline mr-1" /> Create First Exam
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {exams.map(exam => {
                const examResults = results.filter(r => r.examId === exam.id && r.isSubmitted);
                const totalMarks = exam.questions?.reduce((s, q) => s + (q.marks || 0), 0) || 0;
                const now = new Date();
                const isActive = now >= new Date(exam.startDate) && now <= new Date(exam.endDate);
                return (
                  <div key={exam.id} className="glass-panel p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-lg">{exam.title}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${isActive ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'}`}>
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                          <span>{exam.questions?.length || 0} questions</span>
                          <span>{totalMarks} total marks</span>
                          <span>Pass: {exam.passingMarks} marks</span>
                          <span>{exam.duration} min</span>
                          <span>{examResults.length} submissions</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(exam.startDate).toLocaleString()} → {new Date(exam.endDate).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {examResults.length > 0 && (
                          <button
                            onClick={() => downloadResultsCSV(examResults, exam.title)}
                            className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" /> CSV
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteExam(exam.id)}
                          className="p-2 text-red-400 hover:bg-red-400/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── CREATE TAB ── */}
      {activeTab === 'create' && (
        <div className="space-y-6">
          {/* Mode Toggle */}
          <div className="glass-panel p-4">
            <div className="flex items-center gap-2 mb-4">
              <label className="relative cursor-pointer">
                <input type="file" accept=".csv,.json" onChange={handleFileUpload} className="hidden" id="exam-file-upload" />
              </label>
              <label
                htmlFor="exam-file-upload"
                className="btn-secondary text-sm flex items-center gap-2 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                {fileName || 'Import CSV / JSON'}
              </label>
              <div className="flex gap-2 ml-auto">
                <button onClick={() => setCreationMode('manual')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${creationMode === 'manual' ? 'bg-techwing-gold/20 text-techwing-gold border border-techwing-gold/30' : 'bg-white/5 text-gray-400'}`}>Manual Build</button>
                <button onClick={() => setCreationMode('json')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${creationMode === 'json' ? 'bg-techwing-gold/20 text-techwing-gold border border-techwing-gold/30' : 'bg-white/5 text-gray-400'}`}>JSON Import</button>
              </div>
            </div>

            {/* Exam Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Exam Title *</label>
                <input type="text" value={examTitle} onChange={e => setExamTitle(e.target.value)} placeholder="e.g. Mid-term Assessment" className="input-field" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Duration (minutes)</label>
                <input type="number" value={examDuration} min={5} onChange={e => setExamDuration(Number(e.target.value))} className="input-field" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Start Date & Time</label>
                <input type="datetime-local" value={examStart} onChange={e => setExamStart(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">End Date & Time</label>
                <input type="datetime-local" value={examEnd} onChange={e => setExamEnd(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Passing Marks</label>
                <input type="number" value={examPassingMarks} min={0} onChange={e => setExamPassingMarks(Number(e.target.value))} className="input-field" />
              </div>
              <div className="flex items-center gap-6 pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={shuffleQs} onChange={e => setShuffleQs(e.target.checked)} className="w-4 h-4 accent-yellow-500" />
                  <span className="text-sm text-gray-300">Shuffle Questions</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={shuffleOpts} onChange={e => setShuffleOpts(e.target.checked)} className="w-4 h-4 accent-yellow-500" />
                  <span className="text-sm text-gray-300">Shuffle Options</span>
                </label>
              </div>
            </div>
          </div>

          {/* JSON Mode */}
          {creationMode === 'json' && (
            <div className="glass-panel p-5">
              <h3 className="font-bold mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-techwing-gold" /> JSON Exam Import</h3>
              <textarea
                rows={10}
                value={jsonContent}
                onChange={e => setJsonContent(e.target.value)}
                placeholder={'{\n  "title": "My Exam",\n  "duration": 90,\n  "passingMarks": 40,\n  "questions": [...]\n}'}
                className="input-field font-mono text-xs resize-y w-full mb-4"
              />
              <button onClick={handleJSONImport} disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</> : <><Upload className="w-4 h-4" /> Import & Save</>}
              </button>
            </div>
          )}

          {/* Manual Mode - Questions */}
          {creationMode === 'manual' && (
            <div className="glass-panel p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold flex items-center gap-2"><BookOpen className="w-4 h-4 text-techwing-gold" /> Questions ({currentQuestions.length})</h3>
                <div className="flex items-center gap-2">
                  <select value={selectedQType} onChange={e => setSelectedQType(e.target.value)} className="input-field py-1.5 text-sm w-auto">
                    {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <button onClick={handleAddQuestion} className="btn-primary py-1.5 px-3 text-sm flex items-center gap-1">
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
              </div>

              {currentQuestions.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">No questions yet. Add a question above or import a CSV/JSON file.</p>
              ) : (
                <div className="space-y-4">
                  {currentQuestions.map((q, idx) => (
                    <div key={q.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <div className="flex items-start justify-between mb-3">
                        <span className="px-2 py-1 bg-techwing-gold/10 text-techwing-gold text-xs font-bold rounded-full">
                          Q{idx + 1} · {QUESTION_TYPES.find(t => t.value === q.type)?.label || q.type}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <label className="text-xs text-gray-400">Marks:</label>
                            <input type="number" min={1} value={q.marks} onChange={e => updateQuestion(idx, { marks: Number(e.target.value) })} className="w-16 input-field py-1 text-xs text-center" />
                          </div>
                          <button onClick={() => setCurrentQuestions(prev => prev.filter((_, i) => i !== idx))} className="text-red-400 hover:bg-red-400/20 p-1 rounded">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <textarea
                        rows={2}
                        value={q.questionText}
                        onChange={e => updateQuestion(idx, { questionText: e.target.value })}
                        placeholder="Enter question text..."
                        className="input-field text-sm resize-none mb-3 w-full"
                      />

                      {/* MCQ Options */}
                      {q.type === 'mcq' && (
                        <div className="space-y-2">
                          {q.options?.map((opt, oi) => (
                            <div key={oi} className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`correct_${q.id}`}
                                checked={q.correctOptionIndex === oi}
                                onChange={() => updateQuestion(idx, { correctOptionIndex: oi })}
                                className="accent-yellow-500"
                              />
                              <input
                                type="text"
                                value={opt}
                                onChange={e => {
                                  const opts = [...(q.options || [])];
                                  opts[oi] = e.target.value;
                                  updateQuestion(idx, { options: opts });
                                }}
                                placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                                className="input-field py-1.5 text-sm flex-1"
                              />
                              {q.options.length > 2 && (
                                <button onClick={() => {
                                  const opts = q.options.filter((_, i) => i !== oi);
                                  const correct = q.correctOptionIndex >= opts.length ? 0 : q.correctOptionIndex;
                                  updateQuestion(idx, { options: opts, correctOptionIndex: correct });
                                }} className="text-red-400 p-1"><X className="w-3 h-3" /></button>
                              )}
                            </div>
                          ))}
                          <button onClick={() => updateQuestion(idx, { options: [...(q.options || []), ''] })} className="text-xs text-techwing-gold hover:text-techwing-orange mt-1">
                            + Add Option
                          </button>
                        </div>
                      )}

                      {/* True/False */}
                      {q.type === 'tf' && (
                        <div className="flex gap-3">
                          {['true', 'false'].map(val => (
                            <label key={val} className="flex items-center gap-2 cursor-pointer">
                              <input type="radio" name={`tf_${q.id}`} checked={q.correctAnswer === val} onChange={() => updateQuestion(idx, { correctAnswer: val })} className="accent-yellow-500" />
                              <span className="text-sm capitalize">{val}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* FIB / SA */}
                      {(q.type === 'fib' || q.type === 'sa') && (
                        <input
                          type="text"
                          value={q.correctAnswer || ''}
                          onChange={e => updateQuestion(idx, { correctAnswer: e.target.value })}
                          placeholder="Correct answer..."
                          className="input-field text-sm w-full"
                        />
                      )}

                      {/* Coding */}
                      {(q.type === 'coding' || q.type === 'practical-java') && (
                        <div>
                          <textarea
                            rows={3}
                            value={q.codeTemplate || ''}
                            onChange={e => updateQuestion(idx, { codeTemplate: e.target.value })}
                            placeholder="Code template for students..."
                            className="input-field font-mono text-xs resize-none mb-2 w-full"
                          />
                          <p className="text-xs text-gray-400 mb-2">Test Cases:</p>
                          {q.testCases?.map((tc, ti) => (
                            <div key={ti} className="flex gap-2 mb-1">
                              <input type="text" value={tc.input} onChange={e => {
                                const tcs = [...(q.testCases || [])];
                                tcs[ti] = { ...tcs[ti], input: e.target.value };
                                updateQuestion(idx, { testCases: tcs });
                              }} placeholder="Input" className="input-field text-xs py-1.5 flex-1" />
                              <input type="text" value={tc.expected} onChange={e => {
                                const tcs = [...(q.testCases || [])];
                                tcs[ti] = { ...tcs[ti], expected: e.target.value };
                                updateQuestion(idx, { testCases: tcs });
                              }} placeholder="Expected Output" className="input-field text-xs py-1.5 flex-1" />
                              <button onClick={() => updateQuestion(idx, { testCases: q.testCases.filter((_, i) => i !== ti) })} className="text-red-400 p-1"><X className="w-3 h-3" /></button>
                            </div>
                          ))}
                          <button onClick={() => updateQuestion(idx, { testCases: [...(q.testCases || []), { input: '', expected: '' }] })} className="text-xs text-techwing-gold hover:text-techwing-orange">
                            + Add Test Case
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {currentQuestions.length > 0 && (
                <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                  <p className="text-sm text-gray-400">
                    Total: <strong className="text-white">{currentQuestions.reduce((s, q) => s + (q.marks || 0), 0)} marks</strong>
                  </p>
                  <button onClick={handleSaveExam} disabled={saving} className="btn-primary flex items-center gap-2">
                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><BookOpen className="w-4 h-4" /> Save Exam</>}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── RESULTS TAB ── */}
      {activeTab === 'results' && (
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search student or exam..."
                className="input-field pl-9 text-sm"
              />
            </div>
            <button
              onClick={() => downloadResultsCSV(filteredResults)}
              className="btn-secondary text-sm flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-techwing-gold border-t-transparent rounded-full animate-spin" /></div>
          ) : filteredResults.length === 0 ? (
            <div className="text-center py-16">
              <BarChart2 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500">No results found.</p>
            </div>
          ) : (
            <div className="glass-panel overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400 text-xs">
                    <th className="py-3 px-4 font-medium">Student</th>
                    <th className="py-3 px-4 font-medium">Exam</th>
                    <th className="py-3 px-4 font-medium">Date</th>
                    <th className="py-3 px-4 font-medium text-right">Score</th>
                    <th className="py-3 px-4 font-medium text-center">Status</th>
                    <th className="py-3 px-4 font-medium text-center">Violations</th>
                    <th className="py-3 px-4 font-medium text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.filter(r => r.isSubmitted).map(r => (
                    <tr key={r.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-medium text-white text-sm">{r.studentName}</p>
                        <p className="text-xs text-gray-400">{r.rollNumber}</p>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-300">{r.examName}</td>
                      <td className="py-3 px-4 text-xs text-gray-400">{r.date}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-bold text-techwing-gold">{r.marksObtained}/{r.totalMarks}</span>
                        <p className="text-xs text-gray-400">{r.percentage?.toFixed(1)}%</p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${r.status === 'Pass' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-xs">
                        {r.totalViolations > 0 ? (
                          <span className="text-red-400 font-bold">{r.totalViolations}</span>
                        ) : (
                          <span className="text-gray-500">None</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setSelectedResult(selectedResult?.id === r.id ? null : r)}
                          className="text-xs text-techwing-gold hover:text-techwing-orange transition-colors flex items-center gap-1 mx-auto"
                        >
                          <Eye className="w-3 h-3" /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Result Detail Modal */}
          {selectedResult && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <div className="glass-panel p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg">{selectedResult.studentName} — {selectedResult.examName}</h3>
                  <button onClick={() => setSelectedResult(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  {[
                    ['Score', `${selectedResult.marksObtained}/${selectedResult.totalMarks}`],
                    ['Percentage', `${selectedResult.percentage?.toFixed(1)}%`],
                    ['Status', selectedResult.status],
                    ['Time Taken', selectedResult.timeTaken],
                    ['Tab Switches', selectedResult.tabSwitchingCount],
                    ['Total Violations', selectedResult.totalViolations],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-white/5 border border-white/10 rounded-xl p-3">
                      <p className="text-xs text-gray-400">{k}</p>
                      <p className="font-bold text-sm">{v}</p>
                    </div>
                  ))}
                </div>
                {selectedResult.violationLog?.length > 0 && (
                  <div>
                    <p className="text-sm font-bold text-red-400 mb-2">Violation Log</p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {selectedResult.violationLog.map((v, i) => (
                        <p key={i} className="text-xs text-gray-400 font-mono bg-red-500/5 border border-red-500/10 rounded px-2 py-1">
                          [{v.time}] {v.type}{v.details ? ': ' + v.details : ''}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
