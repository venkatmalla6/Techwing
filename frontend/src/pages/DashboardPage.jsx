import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as interviewService from '../services/interviewService';
import { Upload, Play, CheckCircle, FileText, Code, Users, Loader2, Mic, BookOpen, ArrowRight } from 'lucide-react';
import Swal from 'sweetalert2';

const DashboardPage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState('interviews');
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [resumeUploaded, setResumeUploaded] = useState(() => {
        return localStorage.getItem('resumeUploaded') === 'true';
    });

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await interviewService.getResumeStatus();
                if (res.data.data === 'ANALYZED') {
                    setResumeUploaded(true);
                    localStorage.setItem('resumeUploaded', 'true');
                }
            } catch (error) {
                // Ignore if no resume exists yet
            }
        };
        checkStatus();
    }, []);

    const handleFileChange = async (e) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            await uploadSelectedFile(selectedFile);
        }
    };

    const uploadSelectedFile = async (fileToUpload) => {
        setUploading(true);
        setUploadError('');
        const formData = new FormData();
        formData.append('file', fileToUpload);
        try {
            await interviewService.uploadResume(formData);
            
            const pollInterval = setInterval(async () => {
                try {
                    const statusRes = await interviewService.getResumeStatus();
                    if (statusRes.data.data === 'ANALYZED') {
                        clearInterval(pollInterval);
                        setResumeUploaded(true);
                        localStorage.setItem('resumeUploaded', 'true');
                        setUploading(false);
                    } else if (statusRes.data.data === 'FAILED') {
                        clearInterval(pollInterval);
                        setUploading(false);
                        setUploadError('AI could not parse this PDF. Please try a different format.');
                        setFile(null);
                        Swal.fire({
                            title: 'Analysis Failed',
                            text: 'The AI could not read your PDF. Please try a simpler resume format without images.',
                            icon: 'error',
                            background: '#1a1f2b',
                            color: '#fff',
                            confirmButtonColor: '#CAA928'
                        });
                    }
                } catch (e) {
                    clearInterval(pollInterval);
                    setUploading(false);
                    setUploadError('Connection error while checking status.');
                }
            }, 2000);

        } catch (error) {
            console.error('Upload failed', error);
            setUploadError('Upload failed. Please ensure the backend server is running.');
            Swal.fire({
                title: 'Upload Failed',
                text: 'Resume upload failed. Please ensure the backend server is running.',
                icon: 'error',
                background: '#1a1f2b',
                color: '#fff',
                confirmButtonColor: '#CAA928'
            });
            setFile(null);
            setUploading(false);
        }
    };

    const startInterview = () => {
        if (!resumeUploaded) {
            Swal.fire({
                title: 'Resume Required',
                text: 'Please upload your resume first to personalize the interview.',
                icon: 'warning',
                background: '#1a1f2b',
                color: '#fff',
                confirmButtonColor: '#CAA928'
            });
            return;
        }
        navigate('/interview/technical');
    };

    const handleLogout = () => {
        Swal.fire({
            title: 'Log out?',
            text: "Are you sure you want to end your session?",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, logout',
            background: '#1a1f2b',
            color: '#fff'
        }).then((result) => {
            if (result.isConfirmed) {
                logout();
            }
        });
    };

    return (
        <div className="min-h-screen bg-techwing-dark p-6">
            <header className="max-w-6xl mx-auto flex justify-between items-center py-6 mb-8 border-b border-white/10">
                <img src="/src/assets/logo.png" alt="TechWing" className="h-10 object-contain" onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/150x50/0a0a0a/CAA928?text=TECHWING' }} />
                <div className="flex items-center gap-6">
                    <span className="text-gray-300">Hello, <strong className="text-white">{user?.name}</strong></span>
                    <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white transition-colors">Logout</button>
                </div>
            </header>

            {/* Section Tab Toggle */}
            <div className="max-w-6xl mx-auto mb-8">
                <div className="flex gap-2 bg-white/5 border border-white/10 rounded-xl p-1.5 w-fit">
                    <button
                        onClick={() => setActiveSection('interviews')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                            activeSection === 'interviews'
                                ? 'bg-gradient-to-r from-techwing-gold to-techwing-orange text-black shadow-lg'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <Mic className="w-4 h-4" /> Interviews
                    </button>
                    <button
                        onClick={() => setActiveSection('exams')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                            activeSection === 'exams'
                                ? 'bg-gradient-to-r from-techwing-gold to-techwing-orange text-black shadow-lg'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <BookOpen className="w-4 h-4" /> Exams
                    </button>
                </div>
            </div>

            {/* ── INTERVIEWS SECTION ── */}
            {activeSection === 'interviews' && (
                <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Setup */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="glass-panel p-6">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <span className="bg-techwing-orange text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                                Upload Resume
                            </h2>

                            {!resumeUploaded ? (
                                <div className="space-y-4">
                                    <p className="text-sm text-gray-400">Upload your PDF resume to generate tailored technical questions.</p>
                                    <div className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center hover:border-techwing-gold transition-colors">
                                        <input
                                            type="file"
                                            id="resume"
                                            accept=".pdf"
                                            className="hidden"
                                            onChange={handleFileChange}
                                            disabled={uploading}
                                        />
                                        <label htmlFor="resume" className={`cursor-pointer flex flex-col items-center ${uploading ? 'opacity-50 cursor-wait' : ''}`}>
                                            {uploading ? (
                                                <Loader2 className="w-8 h-8 text-techwing-gold mb-2 animate-spin" />
                                            ) : (
                                                <Upload className="w-8 h-8 text-techwing-gold mb-2" />
                                            )}
                                            <span className="text-sm font-medium">
                                                {uploading ? 'Analyzing Resume...' : (file ? file.name : 'Select PDF File (Auto Upload)')}
                                            </span>
                                        </label>
                                    </div>
                                    {uploadError && (
                                        <div className="bg-red-500/10 border border-red-500/50 p-3 rounded-lg text-center">
                                            <p className="text-red-400 text-sm font-bold">Failed to Analyze Resume</p>
                                            <p className="text-red-300 text-xs mt-1">{uploadError}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-xl flex items-center gap-3">
                                        <CheckCircle className="text-green-500 w-6 h-6 flex-shrink-0" />
                                        <div>
                                            <h4 className="font-bold text-green-500">Resume Analyzed</h4>
                                            <p className="text-xs text-gray-400">Your interview is personalized and ready.</p>
                                        </div>
                                    </div>
                                    <div className="border-2 border-dashed border-white/10 rounded-xl p-3 text-center hover:border-techwing-gold/50 transition-colors">
                                        <input
                                            type="file"
                                            id="resume-reupload"
                                            accept=".pdf"
                                            className="hidden"
                                            onChange={handleFileChange}
                                            disabled={uploading}
                                        />
                                        <label htmlFor="resume-reupload" className={`cursor-pointer flex flex-col items-center gap-1 ${uploading ? 'opacity-50 cursor-wait' : ''}`}>
                                            <Upload className="w-5 h-5 text-gray-500 mb-1" />
                                            <span className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                                                {uploading ? 'Re-uploading...' : 'Re-upload Resume'}
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Instructions */}
                    <div className="lg:col-span-2">
                        <div className="glass-panel p-8 h-full flex flex-col">
                            <h2 className="text-3xl font-bold mb-6">Interview Instructions</h2>

                            <div className="space-y-6 flex-grow">
                                <div className="flex gap-4 items-start">
                                    <div className="bg-techwing-gold/20 p-3 rounded-lg text-techwing-gold mt-1">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold mb-1">Round 1: Technical Interview</h3>
                                        <p className="text-gray-400">A conversational voice interview assessing your domain knowledge based on your resume. You will speak with our AI agent.</p>
                                    </div>
                                </div>

                                <div className="flex gap-4 items-start">
                                    <div className="bg-blue-500/20 p-3 rounded-lg text-blue-400 mt-1">
                                        <Users className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold mb-1">Round 2: HR Interview</h3>
                                        <p className="text-gray-400">Behavioral and situational questions assessing cultural fit and soft skills. Spoken interaction.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-white/10 flex justify-end">
                                <button
                                    onClick={startInterview}
                                    className={`btn-primary flex items-center gap-2 text-lg ${!resumeUploaded ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <Play className="w-5 h-5 fill-current" />
                                    Start Interview Now
                                </button>
                            </div>
                        </div>
                    </div>
                </main>
            )}

            {/* ── EXAMS SECTION ── */}
            {activeSection === 'exams' && (
                <main className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Info Card */}
                        <div className="lg:col-span-1">
                            <div className="glass-panel p-6 h-full">
                                <div className="w-12 h-12 bg-techwing-gold/20 rounded-xl flex items-center justify-center mb-4">
                                    <BookOpen className="w-6 h-6 text-techwing-gold" />
                                </div>
                                <h3 className="text-xl font-bold mb-3">Smart Exam Portal</h3>
                                <p className="text-gray-400 text-sm mb-6">
                                    Access scheduled assessments and examinations. The exam portal includes full proctoring,
                                    multiple question types, and secure result submission.
                                </p>
                                <ul className="space-y-2 text-sm text-gray-400">
                                    {[
                                        'MCQ, True/False, Fill in Blank',
                                        'Coding challenges with test cases',
                                        'HTML & Java practicals',
                                        'Camera proctoring & violation tracking',
                                        'Auto-save every 10 seconds',
                                    ].map((feature, i) => (
                                        <li key={i} className="flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4 text-techwing-gold flex-shrink-0" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Launch Card */}
                        <div className="lg:col-span-2 flex items-center justify-center">
                            <div className="glass-panel p-10 text-center w-full">
                                <div className="w-20 h-20 bg-gradient-to-br from-techwing-gold/20 to-techwing-orange/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <BookOpen className="w-10 h-10 text-techwing-gold" />
                                </div>
                                <h2 className="text-3xl font-bold mb-3">Ready to take an exam?</h2>
                                <p className="text-gray-400 mb-8">
                                    Click below to access your scheduled examinations. You are logged in as{' '}
                                    <strong className="text-white">{user?.name}</strong> — your TechWing credentials will be used automatically.
                                </p>
                                <button
                                    onClick={() => navigate('/exam')}
                                    className="btn-primary text-lg flex items-center gap-2 mx-auto"
                                >
                                    <BookOpen className="w-5 h-5" />
                                    Enter Exam Portal
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </main>
            )}
        </div>
    );
};

export default DashboardPage;
