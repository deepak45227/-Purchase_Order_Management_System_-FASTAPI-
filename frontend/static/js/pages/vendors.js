/**
 * Vendors Page
 */
const VendorsPage = {
  async render() {
    const area = document.getElementById('contentArea');
    area.innerHTML = UI.pageLoader();
    try {
      const vendors = await Api.Vendors.list();
      this._renderList(vendors, area);
    } catch (e) {
      area.innerHTML = `<div class="alert alert-error">${e.message}</div>`;
    }
  },

  _renderList(vendors, area) {
    const rows = vendors.map(v => `
      <tr>
        <td class="td-name">${v.name}</td>
        <td>${v.contact_name || '—'}</td>
        <td><a href="mailto:${v.email}" style="color:var(--info)">${v.email}</a></td>
        <td>${v.phone || '—'}</td>
        <td>${UI.fmt.stars(v.rating || 0)}</td>
        <td><span class="badge ${v.is_active ? 'badge-approved' : 'badge-cancelled'}">${v.is_active ? 'Active' : 'Inactive'}</span></td>
        <td class="td-actions">
          <button class="btn btn-ghost btn-sm" onclick="VendorsPage.showEdit(${v.id})">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="VendorsPage.deactivate(${v.id}, '${v.name}')">Deactivate</button>
        </td>
      </tr>
    `).join('');

    area.innerHTML = `
      <div class="table-card">
        <div class="table-header">
          <div class="table-header-title">Vendors <span class="text-muted text-sm">(${vendors.length})</span></div>
          <div class="table-actions">
            <input class="search-input" placeholder="Search vendors..." id="vendorSearch" oninput="VendorsPage.search(this.value)"/>
            <button class="btn btn-primary" onclick="VendorsPage.showCreate()">+ Add Vendor</button>
          </div>
        </div>
        ${vendors.length ? `
          <table class="data-table" id="vendorsTable">
            <thead>
              <tr>
                <th>Name</th><th>Contact</th><th>Email</th><th>Phone</th><th>Rating</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        ` : `<div class="empty-state"><span class="empty-icon">◉</span>No vendors found. Add your first vendor.</div>`}
      </div>
    `;
  },

  async search(q) {
    try {
      const vendors = await Api.Vendors.list(q ? `search=${encodeURIComponent(q)}` : '');
      const tbody = document.querySelector('#vendorsTable tbody');
      if (!tbody) return;
      if (!vendors.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No vendors found.</td></tr>'; return; }
      tbody.innerHTML = vendors.map(v => `
        <tr>
          <td class="td-name">${v.name}</td>
          <td>${v.contact_name || '—'}</td>
          <td><a href="mailto:${v.email}" style="color:var(--info)">${v.email}</a></td>
          <td>${v.phone || '—'}</td>
          <td>${UI.fmt.stars(v.rating || 0)}</td>
          <td><span class="badge ${v.is_active ? 'badge-approved' : 'badge-cancelled'}">${v.is_active ? 'Active' : 'Inactive'}</span></td>
          <td class="td-actions">
            <button class="btn btn-ghost btn-sm" onclick="VendorsPage.showEdit(${v.id})">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="VendorsPage.deactivate(${v.id}, '${v.name}')">Deactivate</button>
          </td>
        </tr>
      `).join('');
    } catch(e) {}
  },

  _formHtml(vendor = {}) {
    return `
      <div class="form-group">
        <label class="form-label">Company Name *</label>
        <input class="form-input" id="vName" value="${vendor.name || ''}" placeholder="e.g. TechSupply Co."/>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Contact Person</label>
          <input class="form-input" id="vContact" value="${vendor.contact_name || ''}" placeholder="Full name"/>
        </div>
        <div class="form-group">
          <label class="form-label">Email *</label>
          <input class="form-input" type="email" id="vEmail" value="${vendor.email || ''}" placeholder="vendor@company.com"/>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Phone</label>
          <input class="form-input" id="vPhone" value="${vendor.phone || ''}" placeholder="+91-XXXXXXXXXX"/>
        </div>
        <div class="form-group">
          <label class="form-label">Rating (0–5)</label>
          <input class="form-input" type="number" id="vRating" min="0" max="5" step="0.1" value="${vendor.rating || 0}"/>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Address</label>
        <textarea class="form-textarea" id="vAddress" placeholder="Full address">${vendor.address || ''}</textarea>
      </div>
      <div id="vendorFormError" class="alert alert-error hidden"></div>
    `;
  },

  showCreate() {
    UI.Modal.open('Add New Vendor', this._formHtml(),
      `<button class="btn btn-ghost" onclick="UI.Modal.close()">Cancel</button>
       <button class="btn btn-primary" onclick="VendorsPage.submitCreate()">Create Vendor</button>`
    );
  },

  async submitCreate() {
    const errEl = document.getElementById('vendorFormError');
    const body = {
      name: document.getElementById('vName').value.trim(),
      contact_name: document.getElementById('vContact').value.trim(),
      email: document.getElementById('vEmail').value.trim(),
      phone: document.getElementById('vPhone').value.trim(),
      address: document.getElementById('vAddress').value.trim(),
      rating: parseFloat(document.getElementById('vRating').value) || 0,
    };
    if (!body.name || !body.email) {
      errEl.textContent = 'Name and Email are required.';
      errEl.classList.remove('hidden'); return;
    }
    try {
      await Api.Vendors.create(body);
      UI.Modal.close();
      UI.toast('Vendor created successfully!', 'success');
      VendorsPage.render();
    } catch (e) {
      errEl.textContent = e.message; errEl.classList.remove('hidden');
    }
  },

  async showEdit(id) {
    try {
      const vendor = await Api.Vendors.get(id);
      UI.Modal.open(`Edit Vendor — ${vendor.name}`, this._formHtml(vendor),
        `<button class="btn btn-ghost" onclick="UI.Modal.close()">Cancel</button>
         <button class="btn btn-primary" onclick="VendorsPage.submitEdit(${id})">Save Changes</button>`
      );
    } catch (e) { UI.toast(e.message, 'error'); }
  },

  async submitEdit(id) {
    const errEl = document.getElementById('vendorFormError');
    const body = {
      name: document.getElementById('vName').value.trim(),
      contact_name: document.getElementById('vContact').value.trim(),
      email: document.getElementById('vEmail').value.trim(),
      phone: document.getElementById('vPhone').value.trim(),
      address: document.getElementById('vAddress').value.trim(),
      rating: parseFloat(document.getElementById('vRating').value) || 0,
    };
    try {
      await Api.Vendors.update(id, body);
      UI.Modal.close();
      UI.toast('Vendor updated!', 'success');
      VendorsPage.render();
    } catch (e) {
      errEl.textContent = e.message; errEl.classList.remove('hidden');
    }
  },

  deactivate(id, name) {
    UI.confirm('Deactivate Vendor', `Are you sure you want to deactivate <strong>${name}</strong>? They won't appear in new POs.`, async () => {
      try {
        await Api.Vendors.delete(id);
        UI.toast(`${name} deactivated`, 'info');
        VendorsPage.render();
      } catch (e) { UI.toast(e.message, 'error'); }
    });
  },
};


