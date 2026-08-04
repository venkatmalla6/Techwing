// examService.js - Smart Exam Portal API Service
// All calls go through TechWing's axios instance (JWT auth auto-attached)
import api from './api';
import {
  getLocalExamsFallback, saveLocalExams,
  getLocalResultsFallback, saveLocalResults
} from '../utils/examUtils';

// ─── EXAMS ────────────────────────────────────────────────────────────────────
export async function getExams() {
  try {
    const res = await api.get('/exams');
    const exams = res.data?.data || res.data || [];
    saveLocalExams(exams);
    return exams;
  } catch (e) {
    console.warn('getExams failed, using local fallback:', e.message);
    return getLocalExamsFallback();
  }
}

export async function addExam(exam) {
  try {
    const res = await api.post('/exams', exam);
    return { success: true, data: res.data?.data || res.data };
  } catch (e) {
    return { success: false, error: e.response?.data?.message || e.message };
  }
}

export async function updateExam(id, exam) {
  try {
    const res = await api.put(`/exams/${id}`, exam);
    return { success: true, data: res.data?.data || res.data };
  } catch (e) {
    return { success: false, error: e.response?.data?.message || e.message };
  }
}

export async function deleteExam(id) {
  try {
    await api.delete(`/exams/${id}`);
    const local = getLocalExamsFallback().filter(e => e.id !== id);
    saveLocalExams(local);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.response?.data?.message || e.message };
  }
}

// ─── RESULTS ──────────────────────────────────────────────────────────────────
export async function getResults() {
  try {
    const res = await api.get('/exam-results');
    const results = res.data?.data || res.data || [];
    saveLocalResults(results);
    return results;
  } catch (e) {
    console.warn('getResults failed, using local fallback:', e.message);
    return getLocalResultsFallback();
  }
}

export async function getStudentResults(rollNumber) {
  try {
    const res = await api.get(`/exam-results?rollNumber=${encodeURIComponent(rollNumber)}`);
    return res.data?.data || res.data || [];
  } catch (e) {
    const all = getLocalResultsFallback();
    return all.filter(r => r.rollNumber === rollNumber);
  }
}

export async function checkActiveDraft(rollNumber, examId) {
  try {
    const res = await api.get(`/exam-results/draft?rollNumber=${encodeURIComponent(rollNumber)}&examId=${encodeURIComponent(examId)}`);
    return res.data?.data || null;
  } catch (e) {
    return null;
  }
}

export async function addResult(result) {
  try {
    const res = await api.post('/exam-results', result);
    // Also persist locally as fallback
    const local = getLocalResultsFallback().filter(r => r.id !== result.id);
    local.push(result);
    saveLocalResults(local);
    return { success: true, data: res.data?.data || res.data };
  } catch (e) {
    // Save locally even if backend fails
    const local = getLocalResultsFallback().filter(r => r.id !== result.id);
    local.push(result);
    saveLocalResults(local);
    return { success: false, error: e.response?.data?.message || e.message };
  }
}

export async function updateResultDraft(resultId, answers, violationLog, cameraCaptures) {
  try {
    await api.patch(`/exam-results/${resultId}/draft`, { answers, violationLog, cameraCaptures });
    return true;
  } catch (e) {
    return false;
  }
}
