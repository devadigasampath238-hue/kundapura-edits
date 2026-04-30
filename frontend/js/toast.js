// frontend/js/toast.js
// ── Lightweight Toast Notification System ─────

const Toast = (() => {
  let container = null;

  function getContainer() {
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 99999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
        max-width: 360px;
      `;
      document.body.appendChild(container);
    }
    return container;
  }

  function show(message, type = 'info', duration = 4000) {
    const c = getContainer();

    const icons = {
      success: '✅',
      error:   '❌',
      warning: '⚠️',
      info:    'ℹ️',
      loading: '⏳',
    };

    const colors = {
      success: { bg: 'rgba(0,200,100,0.12)', border: 'rgba(0,200,100,0.35)', text: '#00c864' },
      error:   { bg: 'rgba(255,60,60,0.12)',  border: 'rgba(255,60,60,0.35)',  text: '#ff6060' },
      warning: { bg: 'rgba(255,160,0,0.12)',  border: 'rgba(255,160,0,0.35)',  text: '#ffa000' },
      info:    { bg: 'rgba(0,194,255,0.12)',  border: 'rgba(0,194,255,0.35)',  text: '#00c2ff' },
      loading: { bg: 'rgba(255,107,0,0.12)', border: 'rgba(255,107,0,0.35)', text: '#ff6b00' },
    };

    const col = colors[type] || colors.info;
    const toast = document.createElement('div');

    toast.style.cssText = `
      pointer-events: all;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      background: ${col.bg};
      border: 1px solid ${col.border};
      border-radius: 10px;
      padding: 14px 16px;
      font-family: 'DM Sans', sans-serif;
      font-size: 0.88rem;
      color: #f0f0f0;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      transform: translateX(110%);
      transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s;
      opacity: 0;
      max-width: 360px;
      word-break: break-word;
    `;

    toast.innerHTML = `
      <span style="font-size:1.1rem;flex-shrink:0;margin-top:1px">${icons[type] || icons.info}</span>
      <span style="flex:1;line-height:1.5">${message}</span>
      <button onclick="this.parentElement.remove()" style="
        background:none;border:none;cursor:pointer;
        color:rgba(255,255,255,0.4);font-size:1rem;
        padding:0;line-height:1;flex-shrink:0;margin-top:1px;
        transition:color 0.2s;
      " onmouseover="this.style.color='#fff'" onmouseout="this.style.color='rgba(255,255,255,0.4)'">✕</button>
    `;

    c.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.style.transform = 'translateX(0)';
        toast.style.opacity = '1';
      });
    });

    // Auto dismiss
    if (duration > 0) {
      setTimeout(() => {
        toast.style.transform = 'translateX(110%)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 350);
      }, duration);
    }

    return toast;
  }

  // Spinner/loading toast (returns dismiss function)
  function loading(message = 'Loading...') {
    const t = show(message, 'loading', 0);
    return () => {
      t.style.transform = 'translateX(110%)';
      t.style.opacity = '0';
      setTimeout(() => t.remove(), 350);
    };
  }

  return { show, loading, success: (m, d) => show(m, 'success', d), error: (m, d) => show(m, 'error', d), info: (m, d) => show(m, 'info', d), warning: (m, d) => show(m, 'warning', d) };
})();

// Global spinner overlay
const Spinner = {
  show() {
    if (document.getElementById('global-spinner')) return;
    const el = document.createElement('div');
    el.id = 'global-spinner';
    el.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:16px;">
        <div style="
          width:48px;height:48px;border-radius:50%;
          border:3px solid rgba(255,107,0,0.2);
          border-top-color:#ff6b00;
          animation:spin 0.8s linear infinite;
        "></div>
        <span style="font-family:'DM Sans',sans-serif;font-size:0.85rem;color:#a0a0a0;letter-spacing:0.05em;">Loading...</span>
      </div>
    `;
    el.style.cssText = `
      position:fixed;inset:0;z-index:9000;
      background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);
      display:flex;align-items:center;justify-content:center;
    `;
    document.head.insertAdjacentHTML('beforeend','<style>@keyframes spin{to{transform:rotate(360deg)}}</style>');
    document.body.appendChild(el);
  },
  hide() {
    const el = document.getElementById('global-spinner');
    if (el) el.remove();
  },
};

window.Toast  = Toast;
window.Spinner = Spinner;
