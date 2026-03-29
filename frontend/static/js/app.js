const App = (() => {
  const pages = {
    dashboard: { title: 'Dashboard', breadcrumb: 'Overview', module: DashboardPage },
    'purchase-orders': { title: 'Purchase Orders', breadcrumb: 'PO Management', module: POsPage },
    vendors: { title: 'Vendors', breadcrumb: 'Vendor Registry', module: VendorsPage },
    products: { title: 'Products', breadcrumb: 'Product Catalog', module: ProductsPage },
  };

  function navigate(page) {
    const cfg = pages[page];
    if (!cfg) return;

    document.querySelectorAll('.nav-item').forEach((el) => {
      el.classList.toggle('active', el.dataset.page === page);
    });

    document.getElementById('pageTitle').textContent = cfg.title;
    document.getElementById('breadcrumb').textContent = cfg.breadcrumb;
    cfg.module.render();
  }

  function setUserUI(user) {
    if (!user) return;
    document.getElementById('userName').textContent = user.full_name || user.username;
    document.getElementById('userRole').textContent = user.role;
    document.getElementById('userAvatar').textContent = (user.full_name || user.username).charAt(0).toUpperCase();
  }

  function showApp(user) {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('appShell').classList.remove('hidden');
    setUserUI(user);
    navigate('dashboard');
  }

  function showLogin() {
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('appShell').classList.add('hidden');
  }

  function updateDate() {
    const el = document.getElementById('topbarDate');
    if (!el) return;

    el.textContent = new Date().toLocaleDateString('en-IN', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  function init() {
    if (Api.Auth.isLoggedIn()) {
      showApp(Api.Auth.getUser());
    } else {
      showLogin();
    }

    updateDate();

    // Login
    document.getElementById('loginBtn').addEventListener('click', async () => {
      const username = document.getElementById('loginUsername').value.trim();
      const password = document.getElementById('loginPassword').value;
      const errEl = document.getElementById('loginError');
      const btnText = document.querySelector('#loginBtn .btn-text');
      const btnLoad = document.querySelector('#loginBtn .btn-loader');

      errEl.classList.add('hidden');
      btnText.classList.add('hidden');
      btnLoad.classList.remove('hidden');

      try {
        const data = await Api.Auth.login(username, password);
        showApp(data.user);
      } catch (e) {
        errEl.textContent = e.message || 'Login failed. Check your credentials.';
        errEl.classList.remove('hidden');
      } finally {
        btnText.classList.remove('hidden');
        btnLoad.classList.add('hidden');
      }
    });

    // Submit on Enter from login inputs.
    ['loginUsername', 'loginPassword'].forEach((id) => {
      document.getElementById(id).addEventListener('keydown', (e) => {
        if (e.key === 'Enter') document.getElementById('loginBtn').click();
      });
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
      Api.Auth.logout();
      showLogin();
    });

    // Sidebar navigation
    document.querySelectorAll('.nav-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        navigate(btn.dataset.page);
        document.getElementById('sidebar').classList.remove('open');
      });
    });

    // Mobile sidebar
    document.getElementById('sidebarToggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });

    // Modal close handlers
    document.getElementById('modalClose').addEventListener('click', UI.Modal.close);
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
      if (e.target === document.getElementById('modalOverlay')) UI.Modal.close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') UI.Modal.close();
    });
  }

  return { init, navigate };
})();

document.addEventListener('DOMContentLoaded', App.init);


