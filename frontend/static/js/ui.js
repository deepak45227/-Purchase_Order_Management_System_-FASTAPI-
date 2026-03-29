const UI = (() => {
  function toast(msg, type = 'info', duration = 4000) {
    const container = document.getElementById('toastContainer');
    const icons = { success: '+', error: 'x', info: 'i' };

    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `
      <span class="toast-icon">${icons[type] || 'i'}</span>
      <span class="toast-msg">${msg}</span>
    `;
    container.appendChild(el);

    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(20px)';
      el.style.transition = 'all 0.25s';
      setTimeout(() => el.remove(), 260);
    }, duration);
  }

  const Modal = {
    open(title, bodyHtml, footerHtml = '', large = false) {
      document.getElementById('modalTitle').textContent = title;
      document.getElementById('modalBody').innerHTML = bodyHtml;
      document.getElementById('modalFooter').innerHTML = footerHtml;

      const box = document.getElementById('modalBox');
      box.className = large ? 'modal modal-lg' : 'modal';
      document.getElementById('modalOverlay').classList.remove('hidden');
    },
    close() {
      document.getElementById('modalOverlay').classList.add('hidden');
    },
  };

  const fmt = {
    currency: (v) => 'INR ' + Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    date: (v) => (v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'),
    datetime: (v) => (v ? new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'),
    stars: (r) => {
      const full = Math.floor(r);
      const s = '*'.repeat(full) + '.'.repeat(5 - full);
      return `<span class="stars">${s}</span> <span class="text-xs text-muted">${r.toFixed(1)}</span>`;
    },
    statusBadge: (status) => {
      const s = (status || '').toLowerCase();
      return `<span class="badge badge-${s}">${status}</span>`;
    },
    stockLabel: (level) => {
      const cls = level < 10 ? 'text-danger' : level < 30 ? '' : 'text-success';
      return `<span class="${cls} font-mono text-sm">${level}</span>`;
    },
  };

  function pageLoader() {
    return '<div class="page-loader"><div class="spinner"></div> Loading...</div>';
  }

  function confirm(title, msg, onConfirm, danger = true) {
    Modal.open(
      title,
      `<p style="color:var(--text2); line-height:1.6">${msg}</p>`,
      `<button class="btn btn-ghost" id="confirmCancel">Cancel</button>
       <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="confirmOk">Confirm</button>`
    );

    document.getElementById('confirmCancel').onclick = Modal.close;
    document.getElementById('confirmOk').onclick = () => {
      Modal.close();
      onConfirm();
    };
  }

  return { toast, Modal, fmt, pageLoader, confirm };
})();


