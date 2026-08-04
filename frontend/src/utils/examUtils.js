// examUtils.js - Smart Exam Portal Utility Functions
// Ported from smartexamportel - all external backend references removed

// ─── CSV Question Parser ─────────────────────────────────────────────────────
export function parseCSVQuestions(csvText) {
  const lines = csvText.split('\n');
  const questions = [];
  let startIdx = 0;
  if (lines[0] && (lines[0].toLowerCase().includes('type') || lines[0].toLowerCase().includes('question'))) {
    startIdx = 1;
  }

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cells = [];
    let insideQuote = false;
    let currentCell = '';
    for (let charIdx = 0; charIdx < line.length; charIdx++) {
      const char = line[charIdx];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        cells.push(currentCell.trim());
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    cells.push(currentCell.trim());

    const type = (cells[0] || 'mcq').toLowerCase().trim();
    const questionText = cells[1]?.replace(/^"|"$/g, '') || '';
    const marks = parseInt(cells[2]) || 1;
    const optionsRaw = cells[3]?.replace(/^"|"$/g, '') || '';
    const correctVal = cells[4]?.replace(/^"|"$/g, '') || '';
    const codeTemplate = cells[5]?.replace(/^"|"$/g, '') || '';
    const testCasesRaw = cells[6]?.replace(/^"|"$/g, '') || '';

    const q = {
      id: 'q_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      type,
      questionText,
      marks
    };

    if (type === 'mcq') {
      q.options = optionsRaw.split('|').map(o => o.trim());
      q.correctOptionIndex = parseInt(correctVal) || 0;
    } else if (type === 'tf') {
      q.correctAnswer = correctVal.toLowerCase().trim() === 'true' ? 'true' : 'false';
    } else if (type === 'fib' || type === 'sa') {
      q.correctAnswer = correctVal.trim();
    } else if (type === 'coding' || type === 'practical-java') {
      q.codingLanguage = 'javascript';
      q.codeTemplate = codeTemplate || 'public class Solution {\n  // your method\n}';
      q.testCases = testCasesRaw ? testCasesRaw.split('|').map(tcStr => {
        const parts = tcStr.split('=>');
        return {
          input: parts[0]?.trim() || '',
          expected: parts[1]?.trim() || ''
        };
      }).filter(tc => tc.input) : [{ input: '', expected: '' }];
    } else if (type === 'practical-html') {
      q.codeTemplate = codeTemplate || '<!DOCTYPE html>\n<html>\n<body>\n</body>\n</html>';
      q.correctAnswer = correctVal || 'form';
    }

    questions.push(q);
  }
  return questions;
}

// ─── JSON Exam Parser ─────────────────────────────────────────────────────────
export function parseJSONExam(jsonText) {
  const data = JSON.parse(jsonText);
  // Support both array of exams and single exam object
  if (Array.isArray(data)) return data;
  if (data.exams) return data.exams;
  return [data];
}

// ─── Seeded Shuffle ───────────────────────────────────────────────────────────
export function seededShuffle(arr, seedStr) {
  let seedNum = 0;
  for (let k = 0; k < seedStr.length; k++) {
    seedNum = ((seedNum << 5) - seedNum) + seedStr.charCodeAt(k);
    seedNum |= 0;
  }
  function seededRandom() {
    seedNum |= 0; seedNum = seedNum + 0x6D2B79F5 | 0;
    let t = Math.imul(seedNum ^ seedNum >>> 15, 1 | seedNum);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Format Duration ──────────────────────────────────────────────────────────
export function formatDuration(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const out = [];
  if (hrs > 0) out.push(`${hrs} hr${hrs > 1 ? 's' : ''}`);
  if (mins > 0) out.push(`${mins} min${mins > 1 ? 's' : ''}`);
  if (secs > 0 || out.length === 0) out.push(`${secs} sec${secs !== 1 ? 's' : ''}`);
  return out.join(' ');
}

// ─── Download Results CSV ─────────────────────────────────────────────────────
export function downloadResultsCSV(results, examName = 'All_Exams') {
  if (results.length === 0) return;

  const headers = [
    'Student Name', 'Roll Number', 'Exam Name', 'Date', 'Start Time', 'End Time',
    'Total Questions', 'Correct Answers', 'Wrong Answers', 'Marks Obtained', 'Total Marks',
    'Percentage', 'Pass/Fail', 'Time Taken', 'Camera Violations',
    'Microphone Violations', 'Full Screen Violations', 'Tab Switches', 'Total Violations'
  ];

  const rows = results.map(r => [
    r.studentName, r.rollNumber, r.examName, r.date, r.startTime, r.endTime,
    r.totalQuestions, r.correctAnswers, r.wrongAnswers,
    r.marksObtained, r.totalMarks,
    (r.percentage?.toFixed(1) || '0') + '%',
    r.status, r.timeTaken,
    r.cameraViolations, r.microphoneViolations, r.fullscreenViolations,
    r.tabSwitchingCount, r.totalViolations
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `TechWing_Exam_${examName.replace(/\s+/g, '_')}_Results_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── Local Exam State (localStorage fallback) ─────────────────────────────────
const EXAMS_KEY = 'tw_exam_portal_exams';
const RESULTS_KEY = 'tw_exam_portal_results';

export function getLocalExamsFallback() {
  try { return JSON.parse(localStorage.getItem(EXAMS_KEY) || '[]'); } catch { return []; }
}

export function saveLocalExams(exams) {
  localStorage.setItem(EXAMS_KEY, JSON.stringify(exams));
}

export function getLocalResultsFallback() {
  try { return JSON.parse(localStorage.getItem(RESULTS_KEY) || '[]'); } catch { return []; }
}

export function saveLocalResults(results) {
  localStorage.setItem(RESULTS_KEY, JSON.stringify(results));
}

export function getLocalExamState(rollNumber, examId) {
  try {
    const key = `tw_exam_state_${rollNumber}_${examId}`;
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch { return null; }
}

export function saveLocalExamState(rollNumber, examId, state) {
  const key = `tw_exam_state_${rollNumber}_${examId}`;
  localStorage.setItem(key, JSON.stringify(state));
}

export function clearLocalExamState(rollNumber, examId) {
  localStorage.removeItem(`tw_exam_state_${rollNumber}_${examId}`);
}
