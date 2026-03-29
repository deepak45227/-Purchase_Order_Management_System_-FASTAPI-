/**
 * Products Page — with AI Auto-Description feature
 */
const ProductsPage = {
  _aiEnabled: null,

  async render() {
    const area = document.getElementById('contentArea');
    area.innerHTML = UI.pageLoader();
    try {
      const products = await Api.Products.list();
      // Check AI status once per page load (non-blocking)
      Api.AI.status().then(s => { this._aiEnabled = s.ai_enabled; }).catch(() => {});
      this._renderList(products, area);
    } catch (e) {
      area.innerHTML = `<div class="alert alert-error">${e.message}</div>`;
    }
  },

  _renderList(products, area) {
    const rows = products.map(p => `
      <tr>
        <td class="td-name">${p.name}</td>
        <td class="td-mono">${p.sku}</td>
        <td>${p.category || '—'}</td>
        <td class="amount">${UI.fmt.currency(p.unit_price)}</td>
        <td>${UI.fmt.stockLabel(p.stock_level)} ${p.unit}</td>
        <td><span class="badge ${p.is_active ? 'badge-approved' : 'badge-cancelled'}">${p.is_active ? 'Active' : 'Inactive'}</span></td>
        <td class="td-actions">
          <button class="btn btn-ghost btn-sm" onclick="ProductsPage.showEdit(${p.id})">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="ProductsPage.deactivate(${p.id}, '${p.name.replace(/'/g,"\\'")}')">Remove</button>
        </td>
      </tr>
    `).join('');

    area.innerHTML = `
      <div class="table-card">
        <div class="table-header">
          <div class="table-header-title">Products <span class="text-muted text-sm">(${products.length})</span></div>
          <div class="table-actions">
            <input class="search-input" placeholder="Search products or SKU..." id="productSearch" oninput="ProductsPage.search(this.value)"/>
            <button class="btn btn-primary" onclick="ProductsPage.showCreate()">+ Add Product</button>
          </div>
        </div>
        ${products.length ? `
          <table class="data-table" id="productsTable">
            <thead>
              <tr>
                <th>Name</th><th>SKU</th><th>Category</th><th>Unit Price</th><th>Stock</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        ` : `<div class="empty-state"><span class="empty-icon">◈</span>No products found.</div>`}
      </div>
    `;
  },

  async search(q) {
    try {
      const products = await Api.Products.list(q ? `search=${encodeURIComponent(q)}` : '');
      const tbody = document.querySelector('#productsTable tbody');
      if (!tbody) return;
      tbody.innerHTML = products.map(p => `
        <tr>
          <td class="td-name">${p.name}</td>
          <td class="td-mono">${p.sku}</td>
          <td>${p.category || '—'}</td>
          <td class="amount">${UI.fmt.currency(p.unit_price)}</td>
          <td>${UI.fmt.stockLabel(p.stock_level)} ${p.unit}</td>
          <td><span class="badge ${p.is_active ? 'badge-approved' : 'badge-cancelled'}">${p.is_active ? 'Active' : 'Inactive'}</span></td>
          <td class="td-actions">
            <button class="btn btn-ghost btn-sm" onclick="ProductsPage.showEdit(${p.id})">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="ProductsPage.deactivate(${p.id}, '${p.name.replace(/'/g,"\\'")}')">Remove</button>
          </td>
        </tr>
      `).join('') || '<tr><td colspan="7" class="empty-state">No products found.</td></tr>';
    } catch(e) {}
  },
  // AI auto-description
  async generateAIDescription() {
    const name     = document.getElementById('pName').value.trim();
    const category = document.getElementById('pCategory').value.trim() || 'General';
    const sku      = document.getElementById('pSku').value.trim();
    const btn      = document.getElementById('aiDescBtn');
    const descEl   = document.getElementById('pDesc');
    const aiStatus = document.getElementById('aiStatus');

    if (!name) {
      UI.toast('Enter a product name first to generate a description.', 'warning');
      return;
    }

    btn.disabled = true;
    btn.textContent = '✦ Generating...';
    aiStatus.textContent = '';

    try {
      const result = await Api.AI.generateDescription({ product_name: name, category, sku });
      descEl.value = result.description;

      if (result.generated) {
        aiStatus.innerHTML = '<span style="color:var(--accent2)">✦ AI-generated description applied</span>';
      } else {
        aiStatus.innerHTML = '<span style="color:var(--text3)">✦ Template description applied (set ANTHROPIC_API_KEY for AI)</span>';
      }

      // Highlight the textarea briefly
      descEl.style.borderColor = 'var(--accent2)';
      setTimeout(() => { descEl.style.borderColor = ''; }, 2000);
    } catch (e) {
      UI.toast('Description generation failed: ' + e.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '✦ Auto-Description';
    }
  },
  // Product form UI
  _formHtml(product = {}) {
    return `
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Product Name *</label>
          <input class="form-input" id="pName" value="${product.name || ''}" placeholder="e.g. Laptop Dell Inspiron"/>
        </div>
        <div class="form-group">
          <label class="form-label">SKU *</label>
          <input class="form-input" id="pSku" value="${product.sku || ''}" placeholder="e.g. SKU-LAP-001" ${product.id ? 'readonly style="opacity:0.6"' : ''}/>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Category</label>
          <input class="form-input" id="pCategory" value="${product.category || ''}" placeholder="e.g. Electronics"/>
        </div>
        <div class="form-group">
          <label class="form-label">Unit</label>
          <input class="form-input" id="pUnit" value="${product.unit || 'pcs'}" placeholder="pcs, kg, box…"/>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Unit Price (₹) *</label>
          <input class="form-input" type="number" id="pPrice" min="0.01" step="0.01" value="${product.unit_price || ''}" placeholder="0.00"/>
        </div>
        <div class="form-group">
          <label class="form-label">Stock Level</label>
          <input class="form-input" type="number" id="pStock" min="0" value="${product.stock_level ?? 0}"/>
        </div>
      </div>
      <div class="form-group">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
          <label class="form-label" style="margin:0">Description</label>
          <button type="button" id="aiDescBtn" class="btn btn-ai btn-sm" onclick="ProductsPage.generateAIDescription()">
            ✦ Auto-Description
          </button>
        </div>
        <textarea class="form-textarea" id="pDesc" placeholder="Product description...">${product.description || ''}</textarea>
        <div id="aiStatus" style="font-size:0.75rem;margin-top:4px;min-height:18px"></div>
      </div>
      <div id="productFormError" class="alert alert-error hidden"></div>
    `;
  },

  showCreate() {
    UI.Modal.open('Add New Product', this._formHtml(),
      `<button class="btn btn-ghost" onclick="UI.Modal.close()">Cancel</button>
       <button class="btn btn-primary" onclick="ProductsPage.submitCreate()">Create Product</button>`
    );
  },

  async submitCreate() {
    const errEl = document.getElementById('productFormError');
    const body = {
      name:        document.getElementById('pName').value.trim(),
      sku:         document.getElementById('pSku').value.trim(),
      category:    document.getElementById('pCategory').value.trim() || null,
      unit:        document.getElementById('pUnit').value.trim() || 'pcs',
      unit_price:  parseFloat(document.getElementById('pPrice').value),
      stock_level: parseInt(document.getElementById('pStock').value) || 0,
      description: document.getElementById('pDesc').value.trim() || null,
    };
    if (!body.name || !body.sku || !body.unit_price) {
      errEl.textContent = 'Name, SKU and Unit Price are required.';
      errEl.classList.remove('hidden'); return;
    }
    try {
      await Api.Products.create(body);
      UI.Modal.close();
      UI.toast('Product created!', 'success');
      ProductsPage.render();
    } catch (e) {
      errEl.textContent = e.message; errEl.classList.remove('hidden');
    }
  },

  async showEdit(id) {
    try {
      const product = await Api.Products.get(id);
      UI.Modal.open(`Edit Product — ${product.name}`, this._formHtml(product),
        `<button class="btn btn-ghost" onclick="UI.Modal.close()">Cancel</button>
         <button class="btn btn-primary" onclick="ProductsPage.submitEdit(${id})">Save Changes</button>`
      );
    } catch (e) { UI.toast(e.message, 'error'); }
  },

  async submitEdit(id) {
    const errEl = document.getElementById('productFormError');
    const body = {
      name:        document.getElementById('pName').value.trim(),
      category:    document.getElementById('pCategory').value.trim() || null,
      unit:        document.getElementById('pUnit').value.trim() || 'pcs',
      unit_price:  parseFloat(document.getElementById('pPrice').value),
      stock_level: parseInt(document.getElementById('pStock').value) || 0,
      description: document.getElementById('pDesc').value.trim() || null,
    };
    try {
      await Api.Products.update(id, body);
      UI.Modal.close();
      UI.toast('Product updated!', 'success');
      ProductsPage.render();
    } catch (e) {
      errEl.textContent = e.message; errEl.classList.remove('hidden');
    }
  },

  deactivate(id, name) {
    UI.confirm('Remove Product', `Deactivate <strong>${name}</strong>? It won't appear in new purchase orders.`, async () => {
      try {
        await Api.Products.delete(id);
        UI.toast(`${name} removed`, 'info');
        ProductsPage.render();
      } catch (e) { UI.toast(e.message, 'error'); }
    });
  },
};



