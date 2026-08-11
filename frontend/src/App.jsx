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

const getStoredUser = () => {
    try {
        const stored = localStorage.getItem("user");
        return stored ? JSON.parse(stored) : null;
    } catch (e) {
        return null;
    }
};

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated } = useAuth();
    const token = localStorage.getItem("token");
    return (isAuthenticated || token) ? children : <Navigate to="/login" replace />;
};

const GuestRoute = ({ children }) => {
    const { isAuthenticated, user } = useAuth();
    const token = localStorage.getItem("token");
    const currentUser = user || getStoredUser();

    if (isAuthenticated || token) {
        const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'TRAINER';
        return <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace />;
    }
    return children;
};

const AdminRoute = ({ children }) => {
    const { isAuthenticated, user } = useAuth();
    const token = localStorage.getItem("token");
    const currentUser = user || getStoredUser();

    if (!isAuthenticated && !token) return <Navigate to="/login" replace />;
    
    const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'TRAINER';
    if (!isAdmin) return <Navigate to="/dashboard" replace />;
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
