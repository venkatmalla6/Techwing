import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import WelcomePage from './pages/WelcomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import TechnicalRoundPage from './pages/TechnicalRoundPage';
import HrRoundPage from './pages/HrRoundPage';
import ReportPage from './pages/ReportPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import TrackDashboardPage from './pages/admin/TrackDashboardPage';
import AdminStudentProfilePage from './pages/admin/AdminStudentProfilePage';
import FeedbackPage from './pages/FeedbackPage';
import NotFoundPage from './pages/NotFoundPage';
import ErrorBoundary from './components/ErrorBoundary';
import ExamPortalPage from './pages/exam/ExamPortalPage';

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? children : <Navigate to="/login" />;
};

const GuestRoute = ({ children }) => {
    const { isAuthenticated, user } = useAuth();
    if (isAuthenticated) {
        return user?.role === 'ADMIN' ? <Navigate to="/admin" /> : <Navigate to="/dashboard" />;
    }
    return children;
};

const AdminRoute = ({ children }) => {
    const { isAuthenticated, user } = useAuth();
    if (!isAuthenticated) return <Navigate to="/login" />;
    if (user?.role !== 'ADMIN') return <Navigate to="/dashboard" />;
    return children;
};

function App() {
    return (
        <ErrorBoundary>
            <div className="min-h-screen bg-techwing-dark text-white font-sans selection:bg-techwing-gold/30">
                <Routes>
                    <Route path="/" element={<WelcomePage />} />
                    <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
                    <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
                    
                    <Route path="/admin" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
                    <Route path="/admin/track/:trackId" element={<AdminRoute><TrackDashboardPage /></AdminRoute>} />
                    <Route path="/admin/students/:userId" element={<AdminRoute><AdminStudentProfilePage /></AdminRoute>} />
                    
                    <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                    <Route path="/interview/technical" element={<ProtectedRoute><TechnicalRoundPage /></ProtectedRoute>} />
                    <Route path="/interview/hr" element={<ProtectedRoute><HrRoundPage /></ProtectedRoute>} />
                    <Route path="/feedback" element={<ProtectedRoute><FeedbackPage /></ProtectedRoute>} />
                    <Route path="/report" element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />
                    <Route path="/exam" element={<ProtectedRoute><ExamPortalPage /></ProtectedRoute>} />
                    
                    {/* 404 Fallback */}
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </div>
        </ErrorBoundary>
    );
}

export default App;
