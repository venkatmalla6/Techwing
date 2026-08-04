import React, { useEffect, useState } from 'react';
import { getExams, getStudentResults, checkActiveDraft } from '../../services/examService';
import { showToast } from '../../utils/examNotifications';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, Clock, CheckCircle, Play, Loader2, FileText, LogOut } from 'lucide-react';
import TechWingLoader from '../../components/TechWingLoader';
import Swal from 'sweetalert2';

const ExamStudentDashboard = ({ onStartExam, onLogout }) => {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [studentResults, setStudentResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingDraft, setCheckingDraft] = useState(false);

  // Use TechWing user id/pin as the student roll number
  const rollNumber = user?.pinNumber || user?.id || user?.email || '';

  useEffect(() => {
    const loadData = async () => {
      try {
        const [fetchedExams, fetchedResults] = await Promise.all([
          getExams(),
          getStudentResults(rollNumber)
        ]);
        setExams(fetchedExams);
        setStudentResults(fetchedResults);
      } catch (err) {
        console.error('Failed to load exam dashboard data:', err);
        showToast('Failed to load exam data. Please try again.', 'error');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [rollNumber]);

  const handleStartExamClick = async (exam) => {
    setCheckingDraft(true);
    try {
      const draft = await checkActiveDraft(rollNumber, exam.id);
      if (draft) {
        showToast(`Resuming saved attempt for "${exam.title}"...`, 'info');
        onStartExam(exam, draft);
      } else {
        onStartExam(exam, null);
      }
    } catch (e) {
      console.warn('Draft check failed, starting fresh:', e);
      onStartExam(exam, null);
    } finally {
      setCheckingDraft(false);
    }
  };

  const handleLogout = () => {
    Swal.fire({
      title: 'Log out?',
      text: 'Are you sure you want to end your session?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, logout',
      background: '#1a1f2b',
      color: '#fff'
    }).then(result => {
      if (result.isConfirmed) onLogout();
    });
  };

  const now = new Date();
  const availableExams = exams.filter(e => {
    const start = new Date(e.startDate);
    const end = new Date(e.endDate);
    return now >= start && now <= end;
  });
  const upcomingExams = exams.filter(e => new Date(e.startDate) > now);

  if (loading || checkingDraft) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-techwing-dark">
        <TechWingLoader text={checkingDraft ? 'Checking for saved draft...' : 'Loading exam portal...'} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-techwing-dark p-6">
      {/* Header */}
      <header className="max-w-5xl mx-auto flex justify-between items-center mb-8 pb-6 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-techwing-gold to-techwing-orange bg-clip-text text-transparent">
            Exam Portal
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Hello, <strong className="text-white">{user?.name}</strong>
            {rollNumber && <span className="ml-2 text-gray-500">| {rollNumber}</span>}
          </p>
        </div>
        <button onClick={handleLogout} className="btn-secondary flex items-center gap-2 text-sm">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </header>

      <main className="max-w-5xl mx-auto">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="glass-panel p-5 text-center">
            <BookOpen className="w-7 h-7 text-techwing-gold mx-auto mb-2" />
            <p className="text-2xl font-bold">{availableExams.length}</p>
            <p className="text-xs text-gray-400">Active Exams</p>
          </div>
          <div className="glass-panel p-5 text-center">
            <CheckCircle className="w-7 h-7 text-green-400 mx-auto mb-2" />
            <p className="text-2xl font-bold">{studentResults.filter(r => r.isSubmitted).length}</p>
            <p className="text-xs text-gray-400">Completed</p>
          </div>
          <div className="glass-panel p-5 text-center">
            <Clock className="w-7 h-7 text-blue-400 mx-auto mb-2" />
            <p className="text-2xl font-bold">{upcomingExams.length}</p>
            <p className="text-xs text-gray-400">Upcoming</p>
          </div>
        </div>

        {/* Available Exams */}
        <div className="glass-panel p-6 mb-6">
          <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
            <Play className="w-5 h-5 text-techwing-gold" />
            Available Examinations
          </h2>
          {availableExams.length === 0 ? (
            <div className="text-center py-10">
              <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500">No exams are currently active.</p>
              <p className="text-gray-600 text-sm mt-1">Check back later or contact your administrator.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {availableExams.map(exam => {
                const alreadyTaken = studentResults.some(r => r.examId === exam.id && r.isSubmitted);
                const totalMarks = exam.questions?.reduce((s, q) => s + (q.marks || 0), 0) || 0;
                return (
                  <div key={exam.id} className="flex items-center justify-between p-5 bg-white/5 border border-white/10 rounded-xl hover:border-techwing-gold/30 transition-all group">
                    <div className="flex-1">
                      <h3 className="font-bold text-white mb-1">{exam.title}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {exam.duration} mins</span>
                        <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {exam.questions?.length || 0} questions</span>
                        <span>Total: {totalMarks} marks</span>
                        <span>Pass: {exam.passingMarks} marks</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      {alreadyTaken ? (
                        <span className="flex items-center gap-1.5 px-4 py-2 bg-green-500/15 border border-green-500/30 text-green-400 rounded-lg text-sm font-bold">
                          <CheckCircle className="w-4 h-4" /> Completed
                        </span>
                      ) : (
                        <button
                          onClick={() => handleStartExamClick(exam)}
                          className="btn-primary flex items-center gap-2 text-sm py-2"
                        >
                          <Play className="w-4 h-4 fill-current" /> Start Exam
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Exams */}
        {upcomingExams.length > 0 && (
          <div className="glass-panel p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              Upcoming Exams
            </h2>
            <div className="space-y-3">
              {upcomingExams.map(exam => (
                <div key={exam.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl opacity-70">
                  <div>
                    <h4 className="font-semibold text-white">{exam.title}</h4>
                    <p className="text-xs text-gray-400 mt-1">
                      Opens: {new Date(exam.startDate).toLocaleString()}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-full text-xs font-bold">Upcoming</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ExamStudentDashboard;
