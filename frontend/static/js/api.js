const API_BASE = '/api';

const Api = (() => {
  const getToken = () => localStorage.getItem('po_token');
  const setToken = (token) => localStorage.setItem('po_token', token);
  const clearToken = () => localStorage.removeItem('po_token');
  const getUser = () => JSON.parse(localStorage.getItem('po_user') || 'null');
  const setUser = (user) => localStorage.setItem('po_user', JSON.stringify(user));
  const clearUser = () => localStorage.removeItem('po_user');

  async function request(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`${API_BASE}${path}`, opts);

    if (res.status === 401) {
      clearToken();
      clearUser();
      window.location.reload();
      return;
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.detail || data.message || `Request failed (${res.status})`;
      throw new Error(msg);
    }

    return data;
  }

  const get = (path) => request('GET', path);
  const post = (path, body) => request('POST', path, body);
  const put = (path, body) => request('PUT', path, body);
  const del = (path) => request('DELETE', path);

  const Auth = {
    async login(username, password) {
      const data = await post('/auth/login', { username, password });
      setToken(data.access_token);
      setUser(data.user);
      return data;
    },
    logout() {
      clearToken();
      clearUser();
    },
    getUser,
    isLoggedIn() {
      return !!getToken();
    },
  };

  const Vendors = {
    list: (params = '') => get(`/vendors/?${params}`),
    get: (id) => get(`/vendors/${id}`),
    create: (body) => post('/vendors/', body),
    update: (id, body) => put(`/vendors/${id}`, body),
    delete: (id) => del(`/vendors/${id}`),
  };

  const Products = {
    list: (params = '') => get(`/products/?${params}`),
    get: (id) => get(`/products/${id}`),
    create: (body) => post('/products/', body),
    update: (id, body) => put(`/products/${id}`, body),
    delete: (id) => del(`/products/${id}`),
  };

  const POs = {
    list: (params = '') => get(`/purchase-orders/?${params}`),
    get: (id) => get(`/purchase-orders/${id}`),
    stats: () => get('/purchase-orders/stats'),
    create: (body) => post('/purchase-orders/', body),
    updateStatus: (id, body) => put(`/purchase-orders/${id}/status`, body),
    delete: (id) => del(`/purchase-orders/${id}`),
  };

  const AI = {
    generateDescription: (body) => post('/ai/generate-description', body),
    status: () => get('/ai/status'),
  };

  return { Auth, Vendors, Products, POs, AI };
})();


