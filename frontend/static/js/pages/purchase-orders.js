/**
 * Purchase Orders Page
 * - List all POs with filters
 * - Create PO with dynamic multi-product rows
 * - View PO detail
 * - Update PO status with business rules
 */
const POsPage = {
  _vendors: [],
  _products: [],
  _itemRowCount: 0,

  async render() {
    const area = document.getElementById('contentArea');
    area.innerHTML = UI.pageLoader();
    try {
      const pos = await Api.POs.list();
      this._renderList(pos, area);
    } catch (e) {
      area.innerHTML = `<div class="alert alert-error">${e.message}</div>`;
    }
  },

  _renderList(pos, area) {
    const rows = pos.map(po => `
      <tr>
        <td class="td-mono">${po.reference_no}</td>
        <td class="td-name">${po.vendor?.name || '—'}</td>
        <td>${po.items?.length || 0} item(s)</td>
        <td>${UI.fmt.statusBadge(po.status)}</td>
        <td class="amount">${UI.fmt.currency(po.subtotal)}</td>
        <td class="amount" style="color:var(--accent3)">${UI.fmt.currency(po.tax_amount)}</td>
        <td class="amount-large">${UI.fmt.currency(po.total_amount)}</td>
        <td>${UI.fmt.date(po.created_at)}</td>
        <td class="td-actions">
          <button class="btn btn-ghost btn-sm" onclick="POsPage.viewPO(${po.id})">View</button>
          ${po.status === 'DRAFT' ? `<button class="btn btn-danger btn-sm" onclick="POsPage.deletePO(${po.id}, '${po.reference_no}')">Delete</button>` : ''}
        </td>
      </tr>
    `).join('');

    area.innerHTML = `
      <div class="table-card">
        <div class="table-header">
          <div class="table-header-title">Purchase Orders <span class="text-muted text-sm">(${pos.length})</span></div>
          <div class="table-actions">
            <select class="filter-select" id="statusFilter" onchange="POsPage.filterByStatus(this.value)">
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="RECEIVED">Received</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <button class="btn btn-primary" onclick="POsPage.showCreateForm()">+ Create PO</button>
          </div>
        </div>
        ${pos.length ? `
          <div style="overflow-x:auto">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Reference</th><th>Vendor</th><th>Items</th><th>Status</th>
                  <th>Subtotal</th><th>Tax (5%)</th><th>Total</th><th>Date</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        ` : `<div class="empty-state"><span class="empty-icon">◫</span>No purchase orders found.<br><button class="btn btn-primary mt-4" onclick="POsPage.showCreateForm()">Create First PO</button></div>`}
      </div>
    `;
  },

  async filterByStatus(status) {
    const area = document.getElementById('contentArea');
    try {
      const pos = await Api.POs.list(status ? `status=${status}` : '');
      this._renderList(pos, area);
      // Re-select the filter value after re-render
      const sel = document.getElementById('statusFilter');
      if (sel) sel.value = status;
    } catch (e) { UI.toast(e.message, 'error'); }
  },
  // Create purchase order
  async showCreateForm() {
    const area = document.getElementById('contentArea');
    area.innerHTML = UI.pageLoader();

    try {
      const [vendors, products] = await Promise.all([
        Api.Vendors.list(),
        Api.Products.list(),
      ]);
      this._vendors = vendors;
      this._products = products;
      this._itemRowCount = 0;

      area.innerHTML = `
        <div class="back-link" onclick="POsPage.render()">← Back to Purchase Orders</div>

        <div class="po-form-card">
          <div class="section-title">Create New Purchase Order</div>

          <!-- PO Header -->
          <div class="form-row" style="margin-bottom:18px">
            <div class="form-group">
              <label class="form-label">Vendor *</label>
              <select class="form-select" id="poVendor">
                <option value="">— Select Vendor —</option>
                ${vendors.map(v => `<option value="${v.id}">${v.name} (Rating: ${v.rating}★)</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Expected Delivery</label>
              <input class="form-input" type="date" id="poDelivery"/>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Notes / Remarks</label>
            <textarea class="form-textarea" id="poNotes" placeholder="Any special instructions or notes..."></textarea>
          </div>

          <!-- Line Items -->
          <div class="section-title" style="margin-top:24px">Line Items</div>
          <div class="items-table-wrap">
            <table class="items-table">
              <thead>
                <tr>
                  <th style="width:35%">Product</th>
                  <th style="width:12%">Qty</th>
                  <th style="width:16%">Unit Price</th>
                  <th style="width:16%">Line Total</th>
                  <th style="width:9%">Unit</th>
                  <th style="width:12%">Stock</th>
                  <th style="width:40px"></th>
                </tr>
              </thead>
              <tbody id="itemsBody"></tbody>
            </table>
          </div>

          <button class="btn btn-ghost btn-sm" onclick="POsPage.addItemRow()">+ Add Product Row</button>

          <!-- Totals -->
          <div class="totals-box" id="totalsBox">
            <div class="total-row">
              <span class="label">Subtotal</span>
              <span class="value" id="totalSubtotal">₹0.00</span>
            </div>
            <div class="total-row">
              <span class="label">Tax (5%)</span>
              <span class="value" id="totalTax">₹0.00</span>
            </div>
            <div class="total-row grand">
              <span class="label">TOTAL</span>
              <span class="value" id="totalGrand">₹0.00</span>
            </div>
          </div>

          <div id="poFormError" class="alert alert-error hidden" style="margin-top:14px"></div>

          <div class="flex gap-3 mt-4" style="justify-content:flex-end">
            <button class="btn btn-ghost" onclick="POsPage.render()">Cancel</button>
            <button class="btn btn-primary" onclick="POsPage.submitCreate()">
              Create Purchase Order
            </button>
          </div>
        </div>
      `;

      // Add first row automatically
      this.addItemRow();

    } catch (e) {
      area.innerHTML = `<div class="alert alert-error">${e.message}</div>`;
    }
  },

  addItemRow() {
    const tbody = document.getElementById('itemsBody');
    if (!tbody) return;

    const rowId = ++this._itemRowCount;
    const productOptions = this._products.map(p =>
      `<option value="${p.id}" data-price="${p.unit_price}" data-stock="${p.stock_level}" data-unit="${p.unit}">${p.name} (${p.sku})</option>`
    ).join('');

    const row = document.createElement('tr');
    row.id = `item-row-${rowId}`;
    row.innerHTML = `
      <td>
        <select class="form-select item-select" id="prod-${rowId}" onchange="POsPage.onProductChange(${rowId})">
          <option value="">— Select Product —</option>
          ${productOptions}
        </select>
      </td>
      <td>
        <input class="form-input qty-input" type="number" id="qty-${rowId}"
               min="1" value="1" onchange="POsPage.recalcRow(${rowId})" oninput="POsPage.recalcRow(${rowId})"/>
      </td>
      <td>
        <span class="price-cell" id="price-${rowId}">—</span>
      </td>
      <td>
        <span class="price-cell" id="linetotal-${rowId}">—</span>
      </td>
      <td>
        <span class="text-sm text-muted" id="unit-${rowId}">—</span>
      </td>
      <td>
        <span class="text-sm" id="stock-${rowId}" style="color:var(--text3)">—</span>
      </td>
      <td>
        <button class="remove-row-btn" onclick="POsPage.removeRow(${rowId})" title="Remove row">✕</button>
      </td>
    `;
    tbody.appendChild(row);
  },

  onProductChange(rowId) {
    const sel = document.getElementById(`prod-${rowId}`);
    const opt = sel.selectedOptions[0];
    if (!opt || !opt.value) {
      document.getElementById(`price-${rowId}`).textContent = '—';
      document.getElementById(`linetotal-${rowId}`).textContent = '—';
      document.getElementById(`unit-${rowId}`).textContent = '—';
      document.getElementById(`stock-${rowId}`).textContent = '—';
      this._updateTotals();
      return;
    }
    const price = parseFloat(opt.dataset.price);
    const stock = parseInt(opt.dataset.stock);
    const unit  = opt.dataset.unit;

    document.getElementById(`price-${rowId}`).textContent = UI.fmt.currency(price);
    document.getElementById(`unit-${rowId}`).textContent = unit;
    document.getElementById(`stock-${rowId}`).innerHTML = UI.fmt.stockLabel(stock);

    // Set max qty to stock level
    const qtyEl = document.getElementById(`qty-${rowId}`);
    qtyEl.max = stock;
    if (parseInt(qtyEl.value) > stock) qtyEl.value = stock;

    this.recalcRow(rowId);
  },

  recalcRow(rowId) {
    const sel = document.getElementById(`prod-${rowId}`);
    const opt = sel?.selectedOptions[0];
    if (!opt || !opt.value) { this._updateTotals(); return; }

    const price = parseFloat(opt.dataset.price);
    const qty   = parseInt(document.getElementById(`qty-${rowId}`).value) || 0;
    const lineTotal = price * qty;

    document.getElementById(`linetotal-${rowId}`).textContent = UI.fmt.currency(lineTotal);
    this._updateTotals();
  },

  removeRow(rowId) {
    const row = document.getElementById(`item-row-${rowId}`);
    if (row) row.remove();
    this._updateTotals();
  },

  /** Core client-side total calculation (mirrors backend logic: 5% tax) */
  _updateTotals() {
    const tbody = document.getElementById('itemsBody');
    if (!tbody) return;

    let subtotal = 0;
    tbody.querySelectorAll('tr').forEach(row => {
      const rowId = row.id.replace('item-row-', '');
      const sel = document.getElementById(`prod-${rowId}`);
      const opt = sel?.selectedOptions[0];
      if (!opt || !opt.value) return;
      const price = parseFloat(opt.dataset.price) || 0;
      const qty   = parseInt(document.getElementById(`qty-${rowId}`)?.value) || 0;
      subtotal += price * qty;
    });

    const taxRate   = 0.05;
    const tax       = subtotal * taxRate;
    const total     = subtotal + tax;

    const f = (v) => '₹' + v.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    document.getElementById('totalSubtotal').textContent = f(subtotal);
    document.getElementById('totalTax').textContent      = f(tax);
    document.getElementById('totalGrand').textContent    = f(total);
  },

  async submitCreate() {
    const errEl = document.getElementById('poFormError');
    errEl.classList.add('hidden');

    const vendorId = parseInt(document.getElementById('poVendor').value);
    if (!vendorId) {
      errEl.textContent = 'Please select a vendor.';
      errEl.classList.remove('hidden'); return;
    }

    // Collect line items
    const tbody = document.getElementById('itemsBody');
    const items = [];
    let hasError = false;

    tbody.querySelectorAll('tr').forEach(row => {
      const rowId = row.id.replace('item-row-', '');
      const sel = document.getElementById(`prod-${rowId}`);
      const opt = sel?.selectedOptions[0];
      if (!opt || !opt.value) return;

      const productId = parseInt(opt.value);
      const qty       = parseInt(document.getElementById(`qty-${rowId}`)?.value) || 0;
      const stock     = parseInt(opt.dataset.stock);

      if (qty <= 0) { hasError = true; return; }
      if (qty > stock) {
        errEl.textContent = `Quantity for "${opt.text.split('(')[0].trim()}" exceeds stock (${stock}).`;
        errEl.classList.remove('hidden'); hasError = true; return;
      }
      items.push({ product_id: productId, quantity: qty });
    });

    if (hasError) return;

    if (items.length === 0) {
      errEl.textContent = 'Please add at least one product to the order.';
      errEl.classList.remove('hidden'); return;
    }

    // Check duplicate products
    const ids = items.map(i => i.product_id);
    if (new Set(ids).size !== ids.length) {
      errEl.textContent = 'Duplicate products detected. Merge quantities instead.';
      errEl.classList.remove('hidden'); return;
    }

    const deliveryVal = document.getElementById('poDelivery').value;
    const body = {
      vendor_id: vendorId,
      items,
      notes: document.getElementById('poNotes').value.trim() || null,
      expected_delivery: deliveryVal ? new Date(deliveryVal).toISOString() : null,
    };

    try {
      const po = await Api.POs.create(body);
      UI.toast(`PO ${po.reference_no} created successfully!`, 'success');
      POsPage.viewPO(po.id);
    } catch (e) {
      errEl.textContent = e.message;
      errEl.classList.remove('hidden');
    }
  },
  // View purchase order details
  async viewPO(id) {
    const area = document.getElementById('contentArea');
    area.innerHTML = UI.pageLoader();

    try {
      const po = await Api.POs.get(id);
      this._renderDetail(po, area);
    } catch (e) {
      area.innerHTML = `<div class="alert alert-error">${e.message}</div>`;
    }
  },

  _renderDetail(po, area) {
    const user = Api.Auth.getUser();
    const canManage = user && ['admin', 'manager'].includes(user.role);

    // Status transition buttons
    const transitions = {
      DRAFT:    [{ label: 'Submit for Approval', status: 'PENDING', cls: 'btn-warning' }, { label: 'Cancel', status: 'CANCELLED', cls: 'btn-danger' }],
      PENDING:  [{ label: 'Approve', status: 'APPROVED', cls: 'btn-success' }, { label: 'Reject', status: 'REJECTED', cls: 'btn-danger' }, { label: 'Cancel', status: 'CANCELLED', cls: 'btn-ghost' }],
      APPROVED: [{ label: 'Mark Received', status: 'RECEIVED', cls: 'btn-success' }, { label: 'Cancel', status: 'CANCELLED', cls: 'btn-danger' }],
      REJECTED: [{ label: 'Revert to Draft', status: 'DRAFT', cls: 'btn-ghost' }],
      RECEIVED: [],
      CANCELLED: [],
    };

    const actionBtns = canManage
      ? (transitions[po.status] || []).map(t =>
          `<button class="btn ${t.cls} btn-sm" onclick="POsPage.changeStatus(${po.id}, '${t.status}', '${po.reference_no}')">${t.label}</button>`
        ).join('')
      : '<span class="text-muted text-sm">View only — manager role required to update</span>';

    const itemRows = po.items.map(item => `
      <tr>
        <td class="td-name">${item.product?.name || `Product #${item.product_id}`}</td>
        <td class="td-mono">${item.product?.sku || '—'}</td>
        <td class="font-mono text-sm">${item.quantity} ${item.product?.unit || 'pcs'}</td>
        <td class="amount">${UI.fmt.currency(item.unit_price)}</td>
        <td class="amount-large">${UI.fmt.currency(item.line_total)}</td>
      </tr>
    `).join('');

    area.innerHTML = `
      <div class="back-link" onclick="POsPage.render()">← Back to Purchase Orders</div>

      <!-- STATUS ACTION BAR -->
      <div class="status-action-bar">
        <span class="label">Status:</span>
        ${UI.fmt.statusBadge(po.status)}
        <span style="flex:1"></span>
        ${actionBtns}
      </div>

      <!-- PO META GRID -->
      <div class="po-detail-grid">
        <div class="detail-card">
          <div class="section-title">Order Information</div>
          <div class="detail-field">
            <div class="label">Reference No.</div>
            <div class="value mono">${po.reference_no}</div>
          </div>
          <div class="detail-field">
            <div class="label">Status</div>
            <div class="value">${UI.fmt.statusBadge(po.status)}</div>
          </div>
          <div class="detail-field">
            <div class="label">Created By</div>
            <div class="value">${po.created_by || '—'}</div>
          </div>
          <div class="detail-field">
            <div class="label">Created At</div>
            <div class="value">${UI.fmt.datetime(po.created_at)}</div>
          </div>
          <div class="detail-field">
            <div class="label">Expected Delivery</div>
            <div class="value">${UI.fmt.date(po.expected_delivery)}</div>
          </div>
          ${po.notes ? `<div class="detail-field"><div class="label">Notes</div><div class="value" style="color:var(--text2)">${po.notes}</div></div>` : ''}
        </div>

        <div class="detail-card">
          <div class="section-title">Vendor Details</div>
          <div class="detail-field">
            <div class="label">Vendor</div>
            <div class="value">${po.vendor?.name || '—'}</div>
          </div>
          <div class="detail-field">
            <div class="label">Contact</div>
            <div class="value">${po.vendor?.contact_name || '—'}</div>
          </div>
          <div class="detail-field">
            <div class="label">Email</div>
            <div class="value"><a href="mailto:${po.vendor?.email}" style="color:var(--info)">${po.vendor?.email || '—'}</a></div>
          </div>
          <div class="detail-field">
            <div class="label">Phone</div>
            <div class="value">${po.vendor?.phone || '—'}</div>
          </div>
          <div class="detail-field">
            <div class="label">Rating</div>
            <div class="value">${UI.fmt.stars(po.vendor?.rating || 0)}</div>
          </div>
        </div>
      </div>

      <!-- LINE ITEMS TABLE -->
      <div class="table-card" style="margin-bottom:24px">
        <div class="table-header">
          <div class="table-header-title">Line Items (${po.items.length})</div>
        </div>
        <table class="data-table">
          <thead>
            <tr><th>Product</th><th>SKU</th><th>Quantity</th><th>Unit Price</th><th>Line Total</th></tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>
      </div>

      <!-- TOTALS -->
      <div class="totals-box">
        <div class="total-row">
          <span class="label">Subtotal</span>
          <span class="value amount">${UI.fmt.currency(po.subtotal)}</span>
        </div>
        <div class="total-row">
          <span class="label">Tax (${po.tax_rate}%)</span>
          <span class="value amount">${UI.fmt.currency(po.tax_amount)}</span>
        </div>
        <div class="total-row grand">
          <span class="label">TOTAL AMOUNT</span>
          <span class="value">${UI.fmt.currency(po.total_amount)}</span>
        </div>
      </div>
    `;
  },
  // Change status
  changeStatus(id, newStatus, refNo) {
    const labels = {
      PENDING:   'Submit this PO for approval?',
      APPROVED:  'Approve this PO? Stock will be deducted automatically.',
      REJECTED:  'Reject this PO?',
      RECEIVED:  'Mark this PO as Received?',
      CANCELLED: 'Cancel this PO? If approved, stock will be restored.',
      DRAFT:     'Revert to Draft?',
    };

    const isDanger = ['REJECTED', 'CANCELLED'].includes(newStatus);
    UI.confirm(
      `Update PO Status → ${newStatus}`,
      `<strong>${refNo}</strong><br><br>${labels[newStatus] || 'Update status?'}`,
      async () => {
        try {
          await Api.POs.updateStatus(id, { status: newStatus });
          UI.toast(`Status updated to ${newStatus}`, 'success');
          POsPage.viewPO(id);
        } catch (e) {
          UI.toast(e.message, 'error');
        }
      },
      isDanger
    );
  },
  // Delete purchase order
  deletePO(id, refNo) {
    UI.confirm('Delete Purchase Order', `Permanently delete <strong>${refNo}</strong>? This action cannot be undone.`, async () => {
      try {
        await Api.POs.delete(id);
        UI.toast(`${refNo} deleted`, 'info');
        POsPage.render();
      } catch (e) { UI.toast(e.message, 'error'); }
    });
  },
};



