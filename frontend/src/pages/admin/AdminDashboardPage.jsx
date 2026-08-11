import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getTracks, addTrack, deleteTrack, getAllStudentsPerformance } from '../../services/adminService';
import { LogOut, Plus, Trash2, Layers, Users, Activity, Loader2, ChevronRight, BookOpen, Mic } from 'lucide-react';
import TechWingLoader from '../../components/TechWingLoader';
import Swal from 'sweetalert2';
import ExamAdminPanel from './ExamAdminPanel';

const AdminDashboardPage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState('interviews');
    const [tracks, setTracks] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newTrack, setNewTrack] = useState({ name: '', description: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [tracksRes, studentsRes] = await Promise.all([
                getTracks(),
                getAllStudentsPerformance()
            ]);
            setTracks(tracksRes.data?.data || []);
            setStudents(studentsRes.data?.data || []);
        } catch (err) {
            console.error("Failed to fetch dashboard data", err);
        } finally {
            setLoading(false);
        }
    };



    const handleAddTrack = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        try {
            await addTrack(newTrack);
            setNewTrack({ name: '', description: '' });
            fetchData();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add track');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteTrack = async (e, id) => {
        e.stopPropagation(); // Prevent track card click
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You are about to delete this technology track. This action cannot be undone!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
            background: '#1a1f2b',
            color: '#fff'
        });

        if (result.isConfirmed) {
            try {
                await deleteTrack(id);
                fetchData();
                Swal.fire({
                    title: 'Deleted!',
                    text: 'The track has been deleted.',
                    icon: 'success',
                    background: '#1a1f2b',
                    color: '#fff'
                });
            } catch (err) {
                Swal.fire({
                    title: 'Error!',
                    text: err.response?.data?.message || 'Failed to delete track',
                    icon: 'error',
                    background: '#1a1f2b',
                    color: '#fff'
                });
            }
        }
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

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-techwing-dark">
                <TechWingLoader text="Loading Admin Dashboard..." />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-techwing-dark p-6">
            <header className="max-w-6xl mx-auto flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-techwing-gold to-techwing-orange bg-clip-text text-transparent">
                        Admin Dashboard
                    </h1>
                    <p className="text-gray-400 mt-1">Welcome back, {user?.name}</p>
                </div>
                <button onClick={handleLogout} className="btn-secondary flex items-center gap-2">
                    <LogOut className="w-4 h-4" /> Logout
                </button>
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

            {/* ── EXAMS SECTION ── */}
            {activeSection === 'exams' && (
                <div className="max-w-6xl mx-auto">
                    <ExamAdminPanel />
                </div>
            )}

            {/* ── INTERVIEWS SECTION ── */}
            {activeSection === 'interviews' && (
            <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Stats Sidebar */}
                <div className="space-y-4">
                    <div className="glass-panel p-6 flex items-center gap-4">
                        <div className="p-3 bg-techwing-gold/10 rounded-lg text-techwing-gold">
                            <Layers className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Total Tracks</p>
                            <p className="text-2xl font-bold">{tracks.length}</p>
                        </div>
                    </div>
                    
                    <div 
                        onClick={() => {
                            document.getElementById('students-section')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="glass-panel p-6 flex items-center gap-4 cursor-pointer hover:border-blue-500/40 hover:bg-white/10 transition-all group"
                    >
                        <div className="p-3 bg-blue-500/10 rounded-lg text-blue-500 group-hover:scale-105 transition-transform">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm flex items-center gap-1">
                                Registered Students <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-blue-400" />
                            </p>
                            <p className="text-2xl font-bold">{students.length}</p>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Add Track Form */}
                    <div className="glass-panel p-6">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Plus className="w-5 h-5 text-techwing-gold" /> Add Technology Track
                        </h2>
                        {error && <div className="text-red-500 mb-4">{error}</div>}
                        <form onSubmit={handleAddTrack} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Track Name</label>
                                <input 
                                    type="text" 
                                    className="input-field" 
                                    required
                                    value={newTrack.name}
                                    onChange={e => setNewTrack({...newTrack, name: e.target.value})}
                                    placeholder="e.g. Cybersecurity"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Description</label>
                                <input 
                                    type="text" 
                                    className="input-field" 
                                    value={newTrack.description}
                                    onChange={e => setNewTrack({...newTrack, description: e.target.value})}
                                    placeholder="Short description..."
                                />
                            </div>
                            <button type="submit" disabled={isSubmitting} className="btn-primary">
                                {isSubmitting ? 'Adding...' : 'Add Track'}
                            </button>
                        </form>
                    </div>

                    {/* Track List */}
                    <div className="glass-panel p-6">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-techwing-orange" /> Active Technology Tracks
                        </h2>
                        
                        {tracks.length === 0 ? (
                            <p className="text-gray-500">No tracks found. Please add one.</p>
                        ) : (
                            <div className="space-y-3">
                                {tracks.map(track => (
                                    <div 
                                        key={track.id} 
                                        onClick={() => navigate(`/admin/track/${track.id}`)}
                                        className="flex justify-between items-center p-4 bg-white/5 rounded-lg border border-white/10 hover:border-techwing-gold/30 hover:bg-white/10 transition-all cursor-pointer group"
                                    >
                                        <div>
                                            <h3 className="font-semibold text-white flex items-center gap-2">
                                                {track.name}
                                                <ChevronRight className="w-4 h-4 text-techwing-gold opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </h3>
                                            <p className="text-sm text-gray-400">{track.description}</p>
                                        </div>
                                        <button 
                                            onClick={(e) => handleDeleteTrack(e, track.id)}
                                            className="p-2 text-red-400 hover:bg-red-400/20 rounded-lg transition-colors z-10"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
            )}

            {/* Students Table - only in interviews tab */}
            {activeSection === 'interviews' && (
            <div id="students-section">
            <main className="max-w-6xl mx-auto mt-8">
                <div className="glass-panel p-6">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-techwing-gold" /> All Registered Students
                        <span className="text-xs font-normal text-gray-400 ml-auto">Click any student to view detailed profile</span>
                    </h2>
                    
                    {students.length === 0 ? (
                        <p className="text-gray-500">No students registered yet.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/10 text-gray-400 text-sm">
                                        <th className="py-3 px-4 font-medium">Name / PIN</th>
                                        <th className="py-3 px-4 font-medium">Branch & Year</th>
                                        <th className="py-3 px-4 font-medium">Track</th>
                                        <th className="py-3 px-4 font-medium text-right">Performance Score</th>
                                        <th className="py-3 px-4 font-medium text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map(student => (
                                        <tr 
                                            key={student.userId} 
                                            onClick={() => navigate(`/admin/students/${student.userId}`)}
                                            className="border-b border-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
                                        >
                                            <td className="py-3 px-4">
                                                <div className="font-medium text-white group-hover:text-techwing-gold transition-colors">{student.name}</div>
                                                <div className="text-xs text-gray-400">{student.pinNumber || 'No PIN'}</div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="text-sm">{student.branch || 'Unknown'}</div>
                                                <div className="text-xs text-gray-400">Year: {student.year || '-'}</div>
                                            </td>
                                            <td className="py-3 px-4 text-sm">
                                                {student.trackName ? (
                                                    <span className="px-2 py-1 bg-techwing-gold/10 text-techwing-gold rounded-full text-xs">
                                                        {student.trackName}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-500 text-xs">Not Evaluated</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                {student.overallScore !== null && student.overallScore !== undefined ? (
                                                    <div className="font-bold text-techwing-gold">
                                                        {student.overallScore.toFixed(1)}/100
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-500 text-sm">Pending</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <div className="inline-flex items-center gap-1 text-xs font-semibold text-techwing-gold group-hover:underline">
                                                    View Profile <ChevronRight className="w-3.5 h-3.5" />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
            </div>)}

        </div>

    );
};

export default AdminDashboardPage;
