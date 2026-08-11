import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import VoiceAvatar from '../components/VoiceAvatar';
import TechWingLoader from '../components/TechWingLoader';
import { useBrowserTTS } from '../hooks/useBrowserTTS';
import { useBrowserSTT, BROWSER_STT_SUPPORTED } from '../hooks/useBrowserSTT';
import { useVAD } from '../hooks/useVAD';
import * as interviewService from '../services/interviewService';
import { useInterview } from '../context/InterviewContext';
import Swal from 'sweetalert2';
import { Users, Loader2, Mic, Clock } from 'lucide-react';
import logo from '../assets/logo.png';

// ─── Status Display Messages ──────────────────────────────────────────────────
const STATUS = {
    IDLE: 'Click "Start HR Round" to begin',
    INITIALIZING: 'Connecting to your HR interviewer...',
    AI_SPEAKING: 'AI is speaking...',
    LISTENING: 'Listening... speak your answer',
    PROCESSING: 'AI is thinking...',
    TIME_UP: 'HR round complete!',
};

const HrRoundPage = () => {
    const navigate = useNavigate();
    const { sessionId: contextSessionId, setSessionId, setCurrentRound } = useInterview();

    // ─── Refs (avoid stale closures) ─────────────────────────────────────────
    const sessionDataRef = useRef(null);
    const questionRef = useRef(null);
    const isTimeUpRef = useRef(false);
    const isProcessingRef = useRef(false);

    // ─── State ────────────────────────────────────────────────────────────────
    const [hasStarted, setHasStarted] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);
    const [status, setStatus] = useState(STATUS.IDLE);
    const [isProcessing, setIsProcessing] = useState(false);
    const [timeLeft, setTimeLeft] = useState(null);
    const [isTimeUp, setIsTimeUp] = useState(false);
    const [questionNumber, setQuestionNumber] = useState(1);

    // ─── Hooks ────────────────────────────────────────────────────────────────
    const { speak, stop: stopTTS, isSpeaking } = useBrowserTTS();

    // ─── Handle answer transcript ─────────────────────────────────────────────
    const handleTranscriptReady = useCallback(async (transcript) => {
        if (!transcript || isTimeUpRef.current || isProcessingRef.current) return;

        isProcessingRef.current = true;
        setIsProcessing(true);
        setStatus(STATUS.PROCESSING);

        try {
            // Handle "repeat question" naturally
            const lower = transcript.toLowerCase();
            if (lower.includes('repeat') || lower.includes("didn't hear") || lower.includes('say that again') || lower.includes('come again')) {
                isProcessingRef.current = false;
                setIsProcessing(false);
                setStatus(STATUS.AI_SPEAKING);
                await speak("Of course! " + questionRef.current?.text);
                if (!isTimeUpRef.current) {
                    setStatus(STATUS.LISTENING);
                    startListening();
                }
                return;
            }

            // Submit answer → get HR evaluation + feedback
            const payload = {
                sessionId: sessionDataRef.current?.sessionId,
                questionOrder: questionRef.current?.order,
                transcript,
            };

            const res = await interviewService.answerHrQuestion(payload);
            const evalData = res.data.data;

            if (isTimeUpRef.current) {
                isProcessingRef.current = false;
                setIsProcessing(false);
                return;
            }

            // Fetch next HR question
            let nextQuestionText = null;
            try {
                const nextRes = await interviewService.getNextHrQuestion(
                    sessionDataRef.current?.sessionId
                );
                const nextData = nextRes.data.data;
                questionRef.current = { id: nextData.questionId, order: nextData.order, text: nextData.questionText };
                nextQuestionText = nextData.questionText;
                setQuestionNumber(nextData.order);
            } catch (_) {
                // No more questions — continue until timer
            }

            isProcessingRef.current = false;
            setIsProcessing(false);

            if (isTimeUpRef.current) return;

            // Speak feedback + next question together
            const toSpeak = nextQuestionText
                ? `${evalData.feedback}. ${nextQuestionText}`
                : `${evalData.feedback}. That covers all our questions. Feel free to add anything about yourself.`;

            setStatus(STATUS.AI_SPEAKING);
            await speak(toSpeak);

            if (!isTimeUpRef.current) {
                setStatus(STATUS.LISTENING);
                startListening();
            }
        } catch (err) {
            console.error('[HR] Error processing answer:', err);
            isProcessingRef.current = false;
            setIsProcessing(false);
            if (!isTimeUpRef.current) {
                setStatus(STATUS.AI_SPEAKING);
                await speak("Let's continue. " + (questionRef.current?.text || ''));
                setStatus(STATUS.LISTENING);
                startListening();
            }
        }
    }, [speak]);

    // ─── Browser STT (primary — Chrome) ──────────────────────────────────────
    const {
        isListening: isBrowserListening,
        interimText,
        startListening: startBrowserListening,
        stopListening: stopBrowserListening,
    } = useBrowserSTT({
        onTranscriptReady: handleTranscriptReady,
        silenceDurationMs: 1400,
        minSpeechMs: 800,
    });

    // ─── VAD Fallback (Firefox / non-Chrome browsers) ────────────────────────
    const handleVADSpeechEnd = useCallback(async (audioBlob) => {
        if (!audioBlob || isTimeUpRef.current || isProcessingRef.current) return;
        isProcessingRef.current = true;
        setIsProcessing(true);
        setStatus(STATUS.PROCESSING);

        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'answer.webm');
            let transcript = 'No response detected.';
            try {
                const res = await interviewService.transcribeVoice(formData, 'HR');
                if (res.data) transcript = res.data;
            } catch (_) {}

            isProcessingRef.current = false;
            await handleTranscriptReady(transcript);
        } catch (err) {
            console.error('[VAD Fallback HR] Error:', err);
            isProcessingRef.current = false;
            setIsProcessing(false);
            if (!isTimeUpRef.current) {
                startVAD();
                setStatus(STATUS.LISTENING);
            }
        }
    }, [handleTranscriptReady]);

    const {
        isRecording: isVADRecording,
        startRecording: startVAD,
        stopRecording: stopVAD,
        volume: vadVolume,
    } = useVAD({
        onSpeechEnd: handleVADSpeechEnd,
        silenceDurationMs: 1400,
        minRecordingMs: 800,
    });

    // ─── Unified controls ─────────────────────────────────────────────────────
    const startListening = useCallback(() => {
        if (isTimeUpRef.current) return;
        if (BROWSER_STT_SUPPORTED) {
            startBrowserListening();
        } else {
            startVAD();
        }
        setStatus(STATUS.LISTENING);
    }, [startBrowserListening, startVAD]);

    const stopListening = useCallback(() => {
        if (BROWSER_STT_SUPPORTED) {
            stopBrowserListening();
        } else {
            stopVAD();
        }
    }, [stopBrowserListening, stopVAD]);

    const isRecording = BROWSER_STT_SUPPORTED ? isBrowserListening : isVADRecording;
    const displayVolume = BROWSER_STT_SUPPORTED ? (interimText ? 60 : 0) : vadVolume;

    // ─── Cleanup on unmount ───────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            stopTTS();
            stopListening();
        };
    }, []);

    // ─── Start Interview ──────────────────────────────────────────────────────
    const handleStartInterview = async () => {
        setIsInitializing(true);
        setStatus(STATUS.INITIALIZING);

        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });

            const res = await interviewService.startHrRound();
            const data = res.data.data;

            sessionDataRef.current = data;
            questionRef.current = {
                id: data.questionId,
                order: data.questionOrder,
                text: data.questionText,
            };

            setSessionId(data.sessionId);
            setCurrentRound('HR');
            setQuestionNumber(data.questionOrder || 1);

            const timeLimitSeconds = (data.timeLimitMinutes || 15) * 60;
            setTimeLeft(timeLimitSeconds);
            setHasStarted(true);
            setIsInitializing(false);

            // Speak welcome + first question
            setStatus(STATUS.AI_SPEAKING);
            await speak(
                `Hello! Welcome to the HR Round. I'm your HR interviewer. ` +
                `This is a conversational round — please answer naturally and confidently. ` +
                `Let's begin. ${data.questionText}`
            );

            if (!isTimeUpRef.current) {
                setStatus(STATUS.LISTENING);
                startListening();
            }
        } catch (err) {
            console.error('Failed to start HR round:', err);
            setIsInitializing(false);
            setStatus(STATUS.IDLE);

            if (err.name === 'NotAllowedError' || err.name === 'NotFoundError') {
                Swal.fire({
                    title: 'Microphone Required',
                    text: 'Please allow microphone access to start the HR round.',
                    icon: 'warning',
                    background: '#1a1f2b',
                    color: '#fff',
                    confirmButtonColor: '#CAA928',
                });
            } else {
                Swal.fire({
                    title: 'Connection Error',
                    text: 'Could not start the HR round. Please check your connection.',
                    icon: 'error',
                    background: '#1a1f2b',
                    color: '#fff',
                    confirmButtonColor: '#CAA928',
                });
            }
        }
    };

    // ─── Timer Effect ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!hasStarted || timeLeft === null || isTimeUp) return;

        if (timeLeft <= 0) {
            handleTimeUp();
            return;
        }

        if (timeLeft === 60) {
            Swal.fire({
                title: '⏰ 1 Minute Left!',
                text: 'HR round ending soon.',
                icon: 'warning',
                timer: 3000,
                showConfirmButton: false,
                toast: true,
                position: 'top-end',
                background: '#1a1a1a',
                color: '#fff',
            });
        }

        const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft, isTimeUp, hasStarted]);

    // ─── Time Up ──────────────────────────────────────────────────────────────
    const handleTimeUp = async () => {
        if (isTimeUpRef.current) return;
        isTimeUpRef.current = true;
        setIsTimeUp(true);
        setStatus(STATUS.TIME_UP);

        stopListening();
        stopTTS();

        try {
            const sid = sessionDataRef.current?.sessionId;
            if (sid) await interviewService.completeHrRound(sid);
        } catch (e) {
            console.error('Failed to complete HR round:', e);
        }

        await speak('Your HR round is now complete. Thank you for your time. Please share your feedback next.');
        setTimeout(() => navigate('/feedback'), 2500);
    };


    // ─── Format Time ─────────────────────────────────────────────────────────
    const formatTime = (seconds) => {
        if (seconds === null || seconds === undefined) return '00:00';
        const s = Math.max(0, seconds);
        const m = Math.floor(s / 60).toString().padStart(2, '0');
        const sec = (s % 60).toString().padStart(2, '0');
        return `${m}:${sec}`;
    };

    // ─── Render: Pre-start ────────────────────────────────────────────────────
    if (!hasStarted) {
        return (
            <div className="min-h-screen bg-techwing-dark flex items-center justify-center p-6">
                <div className="glass-panel p-12 text-center max-w-md w-full">
                    <div className="w-20 h-20 bg-orange-500/10 border border-orange-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Users className="w-10 h-10 text-orange-400" />
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-3">HR Round</h2>
                    <p className="text-gray-400 mb-2 text-sm">
                        HR Interviewer: <span className="text-orange-400 font-semibold">AI Assistant</span>
                    </p>
                    <p className="text-gray-400 mb-8 text-sm leading-relaxed">
                        This is a <strong className="text-white">voice conversation</strong> with your HR
                        interviewer. Answer naturally and confidently — just as you would in a real HR interview.
                    </p>

                    {!BROWSER_STT_SUPPORTED && (
                        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-400 text-xs text-left">
                            ⚠️ For best performance, use <strong>Google Chrome</strong>.
                        </div>
                    )}

                    <button
                        onClick={handleStartInterview}
                        disabled={isInitializing}
                        className="w-full flex justify-center items-center py-4 gap-2 text-base font-semibold rounded-xl transition-all text-white"
                        style={{
                            background: isInitializing
                                ? '#6b7280'
                                : 'linear-gradient(135deg, #f97316, #ea580c)',
                            cursor: isInitializing ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {isInitializing ? (
                            <><Loader2 className="w-5 h-5 animate-spin" /> Connecting...</>
                        ) : (
                            <><Mic className="w-5 h-5" /> Enable Microphone &amp; Start HR Round</>
                        )}
                    </button>
                </div>
            </div>
        );
    }

    // ─── Render: Interview ────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-techwing-dark flex flex-col">

            {/* Time's Up Overlay */}
            {isTimeUp && (
                <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center">
                    <div className="glass-panel p-10 text-center max-w-sm">
                        <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Clock className="w-8 h-8 text-orange-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">HR Round Complete!</h2>
                        <p className="text-gray-400 mb-4">Generating your interview report...</p>
                        <div className="flex items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 text-techwing-gold animate-spin" />
                            <span className="text-sm text-gray-500">Please wait</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="flex-shrink-0 px-6 py-4 border-b border-white/10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <img src={logo} alt="Techwing Logo" className="h-9 w-auto object-contain" />
                    <div>
                        <h1 className="text-base font-bold text-white leading-tight">HR Round</h1>
                        <p className="text-xs text-gray-500">
                            Question {questionNumber} &bull; HR Interviewer
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Timer */}
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full border font-mono font-semibold text-sm ${
                        timeLeft !== null && timeLeft < 60
                            ? 'bg-red-500/20 border-red-500/40 text-red-400 animate-pulse'
                            : timeLeft !== null && timeLeft < 120
                            ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400'
                            : 'bg-white/5 border-white/10 text-gray-300'
                    }`}>
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatTime(timeLeft)}</span>
                    </div>

                </div>
            </header>

            {/* Main — Centered Voice Interface */}
            <main className="flex-grow flex flex-col items-center justify-center gap-8 px-6 py-8">

                {/* AI Avatar */}
                <div className="flex flex-col items-center gap-6">
                    <VoiceAvatar
                        isListening={isRecording}
                        isSpeaking={isSpeaking}
                        isProcessing={isProcessing}
                        volume={displayVolume}
                        onStartListening={startListening}
                        onStopListening={stopListening}
                    />

                    {/* Status */}
                    <div className="text-center">
                        <p className={`text-base font-medium transition-all duration-300 ${
                            isProcessing ? 'text-yellow-400' :
                            isSpeaking   ? 'text-orange-400'  :
                            isRecording  ? 'text-green-400'   : 'text-gray-400'
                        }`}>
                            {isSpeaking   ? STATUS.AI_SPEAKING :
                             isProcessing ? STATUS.PROCESSING  :
                             isRecording  ? STATUS.LISTENING   : '...'}
                        </p>

                        {/* Real-time interim transcript (Removed per user request) */}
                    </div>
                </div>

                {/* Mic hint removed for automated flow */}
            </main>

            {/* Footer */}
            <footer className="flex-shrink-0 px-6 py-3 border-t border-white/5 text-center">
                <p className="text-xs text-gray-600">
                    {BROWSER_STT_SUPPORTED
                        ? 'Real-time voice recognition active — stop speaking and Priya will respond'
                        : 'Speak your answer and pause — Priya will respond after 1.4 seconds of silence'}
                </p>
            </footer>
        </div>
    );
};

export default HrRoundPage;
