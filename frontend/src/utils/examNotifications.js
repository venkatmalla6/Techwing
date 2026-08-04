// examNotifications.js - Custom toast/modal/confirm helpers
// Ported from smartexamportel - uses SweetAlert2 (already in TechWing deps) for confirm dialogs
// Toast/modal functions use DOM-based approach matching the original

function ensureToastStyles() {
  if (!document.getElementById('tw-exam-toast-styles')) {
    const style = document.createElement('style');
    style.id = 'tw-exam-toast-styles';
    style.innerHTML = `
      @keyframes tw-toast-slide-in {
        from { transform: translateX(120%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes tw-modal-fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes tw-modal-scale-in {
        from { transform: scale(0.92); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
}

export function showToast(message, type = 'info') {
  ensureToastStyles();

  let container = document.getElementById('tw-exam-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'tw-exam-toast-container';
    container.style.cssText = `
      position:fixed;top:24px;right:24px;z-index:999999;
      display:flex;flex-direction:column;gap:10px;pointer-events:none;
    `;
    document.body.appendChild(container);
  }

  const colorMap = {
    success: '#CAA928',
    error: '#ef4444',
    warning: '#E2661A',
    info: '#3b82f6'
  };
  const iconMap = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

  const toast = document.createElement('div');
  toast.style.cssText = `
    background:${colorMap[type] || colorMap.info};color:#0a0a0a;
    padding:14px 20px;border-radius:10px;
    box-shadow:0 10px 25px rgba(0,0,0,0.4);
    font-size:14px;font-weight:700;min-width:260px;max-width:380px;
    pointer-events:auto;cursor:pointer;display:flex;align-items:center;gap:10px;
    animation:tw-toast-slide-in 0.3s ease-out forwards;
  `;
  toast.innerHTML = `<span>${iconMap[type] || 'ℹ️'}</span><div style="flex:1">${message}</div>`;
  container.appendChild(toast);

  const removeToast = () => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-8px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 280);
  };
  toast.onclick = removeToast;
  setTimeout(removeToast, 5000);
}

export function showModal(title, message, type = 'info', onConfirm) {
  ensureToastStyles();

  const colorMap = { error: '#ef4444', warning: '#E2661A', success: '#CAA928', info: '#3b82f6' };
  const titleColor = colorMap[type] || colorMap.info;

  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:fixed;top:0;left:0;width:100vw;height:100vh;
    background:rgba(0,0,0,0.75);backdrop-filter:blur(8px);
    display:flex;align-items:center;justify-content:center;
    z-index:9999999;animation:tw-modal-fade-in 0.2s ease-out forwards;
  `;

  const modal = document.createElement('div');
  modal.style.cssText = `
    background:#171717;border:1px solid rgba(255,255,255,0.1);
    border-radius:16px;padding:28px;width:90%;max-width:460px;
    color:#fff;box-shadow:0 25px 60px rgba(0,0,0,0.7);
    text-align:center;font-family:system-ui,-apple-system,sans-serif;
    animation:tw-modal-scale-in 0.25s cubic-bezier(0.34,1.56,0.64,1);
  `;

  modal.innerHTML = `
    <h3 style="margin-top:0;margin-bottom:12px;font-size:20px;font-weight:700;color:${titleColor}">${title}</h3>
    <p style="margin:0 0 24px 0;font-size:14.5px;color:#9ca3af;line-height:1.6;white-space:pre-wrap;">${message}</p>
    <div style="display:flex;justify-content:center;">
      <button id="tw-modal-ok-btn" style="background:linear-gradient(135deg,#CAA928,#E2661A);color:#0a0a0a;border:none;padding:10px 28px;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer;">
        OK
      </button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const okBtn = modal.querySelector('#tw-modal-ok-btn');
  okBtn.focus();
  const close = () => {
    overlay.remove();
    if (onConfirm) onConfirm();
  };
  okBtn.onclick = close;
}

export function showConfirm(title, message, onConfirm, onCancel, confirmLabel = 'Confirm', cancelLabel = 'Cancel') {
  ensureToastStyles();

  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:fixed;top:0;left:0;width:100vw;height:100vh;
    background:rgba(0,0,0,0.8);backdrop-filter:blur(10px);
    display:flex;align-items:center;justify-content:center;
    z-index:9999999;animation:tw-modal-fade-in 0.2s ease-out;
  `;

  const modal = document.createElement('div');
  modal.style.cssText = `
    background:#171717;border:1px solid rgba(202,169,40,0.2);
    border-radius:20px;padding:32px;width:90%;max-width:480px;
    color:#fff;box-shadow:0 25px 60px rgba(0,0,0,0.7);
    text-align:center;font-family:system-ui,-apple-system,sans-serif;
    animation:tw-modal-scale-in 0.25s cubic-bezier(0.34,1.56,0.64,1);
  `;

  modal.innerHTML = `
    <div style="width:52px;height:52px;background:rgba(202,169,40,0.15);border:2px solid #CAA928;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#CAA928" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    </div>
    <h3 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#CAA928">${title}</h3>
    <p style="margin:0 0 28px;font-size:14.5px;color:#9ca3af;line-height:1.6;white-space:pre-wrap">${message}</p>
    <div style="display:flex;justify-content:center;gap:12px">
      <button id="tw-confirm-cancel" style="background:rgba(255,255,255,0.1);color:#9ca3af;border:1px solid rgba(255,255,255,0.15);padding:12px 24px;border-radius:10px;font-weight:600;font-size:14px;cursor:pointer">${cancelLabel}</button>
      <button id="tw-confirm-ok" style="background:linear-gradient(135deg,#CAA928,#E2661A);color:#0a0a0a;border:none;padding:12px 24px;border-radius:10px;font-weight:700;font-size:14px;cursor:pointer">${confirmLabel}</button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const okBtn = modal.querySelector('#tw-confirm-ok');
  const cancelBtn = modal.querySelector('#tw-confirm-cancel');
  const close = () => overlay.remove();

  okBtn.onclick = () => { close(); onConfirm(); };
  cancelBtn.onclick = () => { close(); if (onCancel) onCancel(); };
  okBtn.focus();
}
