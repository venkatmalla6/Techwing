// examSecurity.js - Proctoring and Anti-Cheating Control Engine
// Ported from smartexamportel/src/utils/security.ts

let cameraStream = null;
let cameraInterval = null;
let violationLog = [];
let cameraCaptures = [];
let warningCount = 0;
const MAX_WARNINGS = 8;
let lastViolationTime = {};
const VIOLATION_COOLDOWN_MS = 8000;

let activeConfig = {
  onViolation: () => {},
  onWarning: () => {},
  onAutoSubmit: () => {},
  videoElement: null
};

export async function startSecuritySystem(config) {
  activeConfig = {
    onViolation: config.onViolation || (() => {}),
    onWarning: config.onWarning || (() => {}),
    onAutoSubmit: config.onAutoSubmit || (() => {}),
    videoElement: config.videoElement || null
  };

  violationLog = [];
  cameraCaptures = [];
  warningCount = 0;
  lastViolationTime = {};

  toggleEventBlockers(true);
  toggleWindowFocusListeners(true);

  const cameraOk = await initCameraMonitoring();
  requestFullscreen();

  return { cameraOk };
}

export function stopSecuritySystem() {
  toggleEventBlockers(false);
  toggleWindowFocusListeners(false);

  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  if (activeConfig.videoElement) {
    activeConfig.videoElement.srcObject = null;
  }
  if (cameraInterval) {
    clearInterval(cameraInterval);
    cameraInterval = null;
  }
}

export function logViolation(type, details = '') {
  const now = Date.now();
  const lastTime = lastViolationTime[type] || 0;

  const highPriority = ['Tab Switch', 'Exit Fullscreen', 'Screenshot Attempt'];
  if (!highPriority.includes(type) && (now - lastTime) < VIOLATION_COOLDOWN_MS) {
    return;
  }
  lastViolationTime[type] = now;

  const timestamp = new Date().toLocaleTimeString();
  const realViolationTypes = ['Tab Switch', 'Exit Fullscreen', 'Screenshot Attempt'];
  let warningNum = null;

  if (realViolationTypes.includes(type)) {
    warningCount++;
    warningNum = warningCount;
  }

  const logEntry = {
    time: timestamp,
    type: type,
    warningNumber: warningNum,
    details: details
  };

  violationLog.push(logEntry);
  activeConfig.onViolation(logEntry);

  if (warningNum !== null) {
    if (warningCount >= MAX_WARNINGS) {
      activeConfig.onAutoSubmit(`Security violation limit reached (${MAX_WARNINGS} violations).`);
    } else {
      activeConfig.onWarning(type, warningCount);
    }
  }
}

export function getViolationLog() {
  return violationLog;
}

export function getCameraCaptures() {
  return cameraCaptures;
}

export function getWarningCount() {
  return warningCount;
}

export function requestFullscreen() {
  const docEl = document.documentElement;
  if (!document.fullscreenElement) {
    docEl.requestFullscreen().catch(err => {
      console.warn('Failed to enter fullscreen mode:', err);
    });
  }
}

async function initCameraMonitoring() {
  const cameraConstraints = [
    { video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: 'user' } },
    { video: { facingMode: 'user' } },
    { video: true }
  ];

  for (const constraints of cameraConstraints) {
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
      break;
    } catch (err) {
      cameraStream = null;
    }
  }

  if (!cameraStream) {
    console.warn('Camera not available on this device.');
    return false;
  }

  try {
    if (activeConfig.videoElement) {
      activeConfig.videoElement.srcObject = cameraStream;
      activeConfig.videoElement.play().catch(e => console.log('Video play failed:', e));
    }

    if (cameraStream.getVideoTracks().length > 0) {
      cameraStream.getVideoTracks()[0].addEventListener('ended', () => {
        logViolation('Camera Disabled', 'Camera feed was disconnected or turned off.');
      });
    }

    cameraInterval = setInterval(() => { /* snapshots disabled */ }, 30000);
    return true;
  } catch (error) {
    console.error('Camera setup error:', error);
    return false;
  }
}

function handleVisibilityChange() {
  if (document.visibilityState === 'hidden') {
    logViolation('Tab Switch', 'Student minimized the window or navigated away to another tab.');
  }
}

function handleWindowBlur() {
  if (document.activeElement && document.activeElement.tagName === 'IFRAME') return;
  logViolation('Unfocused Window', 'Student shifted focus outside the browser.');
}

function handleFullscreenChange() {
  if (!document.fullscreenElement) {
    logViolation('Exit Fullscreen', 'Student exited full screen mode.');
  }
}

function toggleWindowFocusListeners(enable) {
  const action = enable ? 'addEventListener' : 'removeEventListener';
  document[action]('visibilitychange', handleVisibilityChange);
  window[action]('blur', handleWindowBlur);
  document[action]('fullscreenchange', handleFullscreenChange);
  document[action]('fullscreenerror', handleFullscreenChange);
}

function blockShortcuts(e) {
  if (e.key === 'PrintScreen') {
    e.preventDefault();
    logViolation('Screenshot Attempt', 'Student pressed PrintScreen to take a screenshot.');
    return false;
  }
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && ['3', '4', '5', 's'].includes(e.key)) {
    e.preventDefault();
    logViolation('Screenshot Attempt', `Student attempted a screenshot shortcut.`);
    return false;
  }
  if (e.key === 'F12') {
    e.preventDefault();
    logViolation('Inspect Element Blocked', 'Attempted to open Developer Tools using F12.');
    return false;
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    logViolation('Esc Key Intercepted', 'Student attempted to use the Esc key.');
    setTimeout(requestFullscreen, 100);
    return false;
  }
  if (e.altKey) {
    e.preventDefault();
    logViolation('Keyboard Blocked', 'Attempted key combination using Alt key.');
    return false;
  }
  if (e.ctrlKey || e.metaKey) {
    const key = e.key.toLowerCase();
    const blockedKeys = ['c', 'v', 'x', 'a', 'p', 's', 'u', 'i'];
    if (blockedKeys.includes(key)) {
      e.preventDefault();
      logViolation('Keyboard Blocked', `Attempted blocked shortcut: Ctrl+${key.toUpperCase()}.`);
      return false;
    }
  }
}

function preventDefaultEvent(e) {
  e.preventDefault();
  return false;
}

function preventRightClick(e) {
  e.preventDefault();
  logViolation('Right Click Blocked', 'Student attempted to open context menu.');
  return false;
}

function preventDragDrop(e) {
  e.preventDefault();
  logViolation('Drag and Drop Blocked', 'Student attempted to drag or drop content.');
  return false;
}

function toggleEventBlockers(enable) {
  const action = enable ? 'addEventListener' : 'removeEventListener';
  window[action]('keydown', blockShortcuts, true);
  window[action]('contextmenu', preventRightClick, true);
  window[action]('copy', preventDefaultEvent, true);
  window[action]('paste', preventDefaultEvent, true);
  window[action]('cut', preventDefaultEvent, true);
  window[action]('selectstart', preventDefaultEvent, true);
  window[action]('dragstart', preventDragDrop, true);
  window[action]('drop', preventDragDrop, true);
}
