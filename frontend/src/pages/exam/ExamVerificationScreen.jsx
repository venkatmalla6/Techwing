import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';

const ExamVerificationScreen = ({ exam, onVerifySuccess, onCancel }) => {
  const videoRef = useRef(null);
  const [camStatus, setCamStatus] = useState('checking'); // 'checking' | 'success' | 'error'
  const [localStream, setLocalStream] = useState(null);

  const checkDevices = async () => {
    setCamStatus('checking');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240 }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.log('Preview play failed:', e));
      }
      setLocalStream(stream);
      setCamStatus('success');
    } catch (e) {
      console.error('Camera initialization failed:', e);
      setCamStatus('error');
    }
  };

  useEffect(() => {
    checkDevices();
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleProceed = () => {
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
    }
    onVerifySuccess();
  };

  const handleCancel = () => {
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
    }
    onCancel();
  };

  return (
    <div className="min-h-screen bg-techwing-dark flex items-center justify-center p-6">
      <div className="glass-panel p-8 max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-techwing-gold/10 text-techwing-gold px-4 py-1.5 rounded-full text-xs font-bold tracking-widest mb-4">
            PRE-EXAM CHECK
          </div>
          <h1 className="text-2xl font-bold mb-2">{exam.title}</h1>
          <p className="text-gray-400 text-sm">Camera verification is required before you can begin.</p>
        </div>

        {/* Camera Preview */}
        <div className="relative rounded-xl overflow-hidden bg-black border border-white/10 mb-6" style={{ aspectRatio: '4/3' }}>
          <video
            ref={videoRef}
            muted
            playsInline
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
          {camStatus === 'checking' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
              <Camera className="w-10 h-10 text-techwing-gold animate-pulse mb-3" />
              <p className="text-sm text-gray-300">Requesting camera access...</p>
            </div>
          )}
          {camStatus === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
              <CameraOff className="w-10 h-10 text-red-400 mb-3" />
              <p className="text-sm text-red-400 font-bold">Camera not available</p>
            </div>
          )}
        </div>

        {/* Status Card */}
        {camStatus === 'success' && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3 mb-6">
            <CheckCircle className="text-green-400 w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-bold text-green-400 text-sm">Camera Ready</p>
              <p className="text-gray-400 text-xs">Your camera is active. You may proceed to the exam.</p>
            </div>
          </div>
        )}
        {camStatus === 'error' && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="text-red-400 w-5 h-5" />
              <p className="font-bold text-red-400 text-sm">Camera Access Denied</p>
            </div>
            <p className="text-gray-400 text-xs">Please allow camera permissions in your browser settings and try again.</p>
            <button
              onClick={checkDevices}
              className="mt-3 text-xs text-techwing-gold underline hover:text-techwing-orange transition-colors"
            >
              Retry Camera Access
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={handleCancel} className="btn-secondary flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <button
            onClick={handleProceed}
            disabled={camStatus !== 'success'}
            className={`btn-primary flex-1 ${camStatus !== 'success' ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Start Exam →
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExamVerificationScreen;
