/**
 * Dashboard Page — Stats, Charts, Recent POs
 */
const DashboardPage = {
  async render() {
    const area = document.getElementById('contentArea');
    area.innerHTML = UI.pageLoader();

    try {
      const [stats, recentPOs] = await Promise.all([
        Api.POs.stats(),
        Api.POs.list('limit=5'),
      ]);

      const totalVal = UI.fmt.currency(stats.total_value);
      const byStatus = stats.by_status;
      const total    = stats.total_pos || 1; // avoid div-by-zero

      area.innerHTML = `
        <!-- STATS GRID -->
        <div class="stats-grid">
          <div class="stat-card" style="--accent-color: var(--accent)">
            <div class="stat-label">Total POs</div>
            <div class="stat-value">${stats.total_pos}</div>
            <div class="stat-sub">All time</div>
          </div>
          <div class="stat-card" style="--accent-color: var(--accent3)">
            <div class="stat-label">Pending Approval</div>
            <div class="stat-value">${byStatus.pending}</div>
            <div class="stat-sub">Awaiting action</div>
          </div>
          <div class="stat-card" style="--accent-color: var(--accent2)">
            <div class="stat-label">Approved</div>
            <div class="stat-value">${byStatus.approved}</div>
            <div class="stat-sub">This period</div>
          </div>
          <div class="stat-card" style="--accent-color: var(--danger)">
            <div class="stat-label">Rejected</div>
            <div class="stat-value">${byStatus.rejected}</div>
            <div class="stat-sub">Review needed</div>
          </div>
          <div class="stat-card" style="--accent-color: var(--info)">
            <div class="stat-label">Total Value</div>
            <div class="stat-value" style="font-size:1.4rem">${totalVal}</div>
            <div class="stat-sub">incl. 5% tax</div>
          </div>
        </div>

        <!-- CHARTS ROW -->
        <div class="chart-grid">
          <!-- Status Breakdown Bar Chart -->
          <div class="chart-card">
            <div class="chart-card-title">PO Status Breakdown</div>
            <div id="statusChart"></div>
          </div>

          <!-- Draft/Pending/Approved donut-style progress -->
          <div class="chart-card">
            <div class="chart-card-title">Approval Pipeline</div>
            <div id="pipelineChart"></div>
          </div>
        </div>

        <!-- RECENT POs -->
        <div class="table-card">
          <div class="table-header">
            <div class="table-header-title">Recent Purchase Orders</div>
            <button class="btn btn-ghost btn-sm" onclick="App.navigate('purchase-orders')">View All →</button>
          </div>
          <div id="recentPOsBody"></div>
        </div>
      `;

      this._renderStatusChart(byStatus, total);
      this._renderPipeline(byStatus, total);
      this._renderRecentPOs(recentPOs);

    } catch (e) {
      area.innerHTML = `<div class="alert alert-error">${e.message}</div>`;
    }
  },

  _renderStatusChart(byStatus, total) {
    const el = document.getElementById('statusChart');
    if (!el) return;

    const data = [
      { label: 'Draft',     value: byStatus.draft     || 0, color: '#6c7293' },
      { label: 'Pending',   value: byStatus.pending   || 0, color: '#f59e0b' },
      { label: 'Approved',  value: byStatus.approved  || 0, color: '#10b981' },
      { label: 'Rejected',  value: byStatus.rejected  || 0, color: '#ef4444' },
    ];

    const maxVal = Math.max(...data.map(d => d.value), 1);

    el.innerHTML = data.map(d => {
      const pct = Math.round((d.value / maxVal) * 100);
      return `
        <div style="margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:5px">
            <span style="color:var(--text2)">${d.label}</span>
            <span style="font-family:var(--font-mono);color:var(--text);font-weight:600">${d.value}</span>
          </div>
          <div style="background:var(--bg3);border-radius:100px;height:8px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${d.color};border-radius:100px;transition:width 0.8s ease"></div>
          </div>
        </div>
      `;
    }).join('');
  },

  _renderPipeline(byStatus, total) {
    const el = document.getElementById('pipelineChart');
    if (!el) return;

    const stages = [
      { label: 'Draft',    count: byStatus.draft     || 0, icon: '◫', color: '#6c7293' },
      { label: 'Pending',  count: byStatus.pending   || 0, icon: '◉', color: '#f59e0b' },
      { label: 'Approved', count: byStatus.approved  || 0, icon: '✓', color: '#10b981' },
      { label: 'Received', count: byStatus.received  || 0, icon: '★', color: '#6366f1' },
    ];

    el.innerHTML = `
      <div style="display:flex;align-items:stretch;gap:0">
        ${stages.map((s, i) => `
          <div style="flex:1;text-align:center;padding:12px 6px;position:relative">
            <div style="font-size:1.5rem;font-weight:800;color:${s.color}">${s.count}</div>
            <div style="font-size:0.72rem;color:var(--text3);margin-top:4px;text-transform:uppercase;letter-spacing:0.05em">${s.label}</div>
            <div style="font-size:1.2rem;margin-top:6px">${s.icon}</div>
            ${i < stages.length - 1 ? `<div style="position:absolute;right:-6px;top:50%;transform:translateY(-50%);color:var(--text3);font-size:1.1rem">›</div>` : ''}
          </div>
        `).join('')}
      </div>
      <div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border)">
        <div style="font-size:0.75rem;color:var(--text3);text-align:center">
          ${total} total PO${total !== 1 ? 's' : ''} &nbsp;·&nbsp;
          ${((byStatus.approved || 0) / total * 100).toFixed(0)}% approval rate
        </div>
      </div>
    `;
  },

  _renderRecentPOs(pos) {
    const el = document.getElementById('recentPOsBody');
    if (!pos.length) {
      el.innerHTML = `<div class="empty-state"><span class="empty-icon">◫</span>No purchase orders yet. <a onclick="App.navigate('purchase-orders')" style="color:var(--accent);cursor:pointer">Create your first PO →</a></div>`;
      return;
    }
    const rows = pos.map(po => `
      <tr>
        <td class="td-mono">${po.reference_no}</td>
        <td class="td-name">${po.vendor?.name || '—'}</td>
        <td>${UI.fmt.statusBadge(po.status)}</td>
        <td class="amount">${UI.fmt.currency(po.total_amount)}</td>
        <td>${UI.fmt.date(po.created_at)}</td>
        <td class="td-actions">
          <button class="btn btn-ghost btn-sm" onclick="POsPage.viewPO(${po.id})">View</button>
        </td>
      </tr>
    `).join('');

    el.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Reference</th><th>Vendor</th><th>Status</th><th>Total</th><th>Date</th><th>Action</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  },
};


