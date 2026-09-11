// ============================================================
// APP.JS — SPA Router & Page Renderers
// ============================================================
const State = {
  user: null,
  currentPage: 'dashboard',
  settings: null
};

const MENU = [
  { key: 'dashboard',  label: 'Dashboard', icon: '🏠', roles: ['Admin','GuruMapel','WaliKelas','Kepsek','TU'] },
  { key: 'siswa',      label: 'Siswa',     icon: '🧑‍🎓', roles: ['Admin','WaliKelas','TU','Kepsek'] },
  { key: 'nilai',      label: 'Nilai',     icon: '📝', roles: ['Admin','GuruMapel','WaliKelas'] },
  { key: 'alumni',     label: 'Alumni',    icon: '🎓', roles: ['Admin','TU','Kepsek'] },
  { key: 'surat',      label: 'Surat',     icon: '✉️', roles: ['Admin','TU'] },
  { key: 'pengaturan', label: 'Pengaturan',icon: '⚙️', roles: ['Admin'] }
];

// ---------- INIT ----------
document.addEventListener('DOMContentLoaded', () => {
  const savedUser = localStorage.getItem('anh_user');
  if (Api.getToken() && savedUser) {
    State.user = JSON.parse(savedUser);
    showApp();
  } else {
    showLogin();
  }
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('btn-logout').addEventListener('click', handleLogout);
});

function showLogin() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app-shell').style.display = 'none';
}

function showApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app-shell').style.display = 'grid';
  document.getElementById('topbar-username').textContent = State.user.nama;
  document.getElementById('topbar-role').textContent = roleLabel(State.user.role);
  renderNav();
  navigateTo('dashboard');
  loadSettingsIntoTopbar();
}

function roleLabel(role) {
  return { Admin: 'Admin', GuruMapel: 'Guru Mapel', WaliKelas: 'Wali Kelas', Kepsek: 'Kepala Sekolah', TU: 'Tata Usaha' }[role] || role;
}

async function loadSettingsIntoTopbar() {
  const res = await Api.get('getSettings');
  if (res.success) {
    State.settings = res.data;
    document.getElementById('topbar-ta').textContent = 'TA ' + (res.data.tahunAjaranAktif || '—');
  }
}

// ---------- LOGIN / LOGOUT ----------
async function handleLogin(ev) {
  ev.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  errEl.style.display = 'none';
  try {
    const res = await Api.login(username, password);
    if (res.success) {
      Api.setToken(res.token);
      State.user = res.user;
      localStorage.setItem('anh_user', JSON.stringify(res.user));
      showApp();
    } else {
      errEl.textContent = res.message || 'Login gagal';
      errEl.style.display = 'block';
    }
  } catch (e) {
    errEl.textContent = 'Tidak bisa terhubung ke server. Cek koneksi internet.';
    errEl.style.display = 'block';
  }
}

function handleLogout() {
  Api.post('logout').finally(() => {
    Api.clearToken();
    localStorage.removeItem('anh_user');
    State.user = null;
    showLogin();
  });
}

// ---------- NAV ----------
function renderNav() {
  const items = MENU.filter(m => m.roles.includes(State.user.role));
  const navHtml = items.map(m => `
    <button class="nav-item" data-page="${m.key}">
      <span class="nav-icon">${m.icon}</span><span class="nav-label">${m.label}</span>
    </button>`).join('');
  document.getElementById('sidebar-nav').innerHTML = navHtml;
  document.getElementById('bottom-nav').innerHTML = navHtml;
  document.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.page));
  });
}

function setActiveNav(page) {
  document.querySelectorAll('[data-page]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === page);
  });
}

function navigateTo(page) {
  State.currentPage = page;
  setActiveNav(page);
  const renderers = {
    dashboard: renderDashboard,
    siswa: renderSiswa,
    nilai: renderPlaceholder,
    alumni: renderPlaceholder,
    surat: renderPlaceholder,
    pengaturan: renderPlaceholder
  };
  (renderers[page] || renderPlaceholder)();
}

function mainEl() { return document.getElementById('main-content'); }

// ---------- PLACEHOLDER (modul lain menyusul, pola sama seperti Siswa) ----------
function renderPlaceholder() {
  mainEl().innerHTML = `
    <div class="page-header"><h2>${MENU.find(m => m.key === State.currentPage)?.label || ''}</h2></div>
    <div class="card empty-state">
      <p>Modul ini mengikuti pola yang sama dengan modul <b>Siswa</b> (lihat <code>renderSiswa()</code> di <code>app.js</code> dan action terkait di <code>Kode.gs</code>) — tinggal dikembangkan lebih lanjut.</p>
    </div>`;
}

// ---------- DASHBOARD ----------
async function renderDashboard() {
  mainEl().innerHTML = `<div class="page-header"><h2>Dashboard</h2></div><div id="dash-stats" class="stat-grid"><p>Memuat statistik...</p></div>`;
  const res = await Api.get('getDashboardStats');
  if (!res.success) { mainEl().querySelector('#dash-stats').innerHTML = `<p class="error-text">${res.message}</p>`; return; }
  const s = res.data;
  const cards = [
    ['Siswa Aktif', s.totalAktif, '🧑‍🎓'],
    ['Mutasi Masuk', s.totalMutasiMasuk, '↩️'],
    ['Mutasi Keluar', s.totalMutasiKeluar, '↪️'],
    ['Lulus / Alumni', s.totalLulus, '🎓'],
    ['Total Guru', s.totalGuru, '👩‍🏫']
  ];
  document.getElementById('dash-stats').innerHTML = cards.map(([label, val, icon]) => `
    <div class="stat-card">
      <div class="stat-icon">${icon}</div>
      <div class="stat-value">${val}</div>
      <div class="stat-label">${label}</div>
    </div>`).join('');
}

// ---------- DATA SISWA ----------
async function renderSiswa(query = '') {
  mainEl().innerHTML = `
    <div class="page-header">
      <h2>Data Siswa</h2>
      ${['Admin','TU'].includes(State.user.role) ? '<button class="btn btn-primary" id="btn-add-siswa">+ Tambah Siswa</button>' : ''}
    </div>
    <div class="card">
      <input type="text" id="siswa-search" class="field-input" placeholder="Cari Nama, NISN, atau NIS..." value="${query}">
    </div>
    <div class="card" id="siswa-table-wrap"><p>Memuat data...</p></div>`;

  document.getElementById('siswa-search').addEventListener('input', debounce(e => renderSiswaTable(e.target.value), 350));
  if (document.getElementById('btn-add-siswa')) {
    document.getElementById('btn-add-siswa').addEventListener('click', openAddSiswaForm);
  }
  renderSiswaTable(query);
}

async function renderSiswaTable(q) {
  const res = await Api.get('getSiswa', { q });
  const wrap = document.getElementById('siswa-table-wrap');
  if (!res.success) { wrap.innerHTML = `<p class="error-text">${res.message}</p>`; return; }
  if (res.data.length === 0) { wrap.innerHTML = `<p>Tidak ada data siswa.</p>`; return; }
  wrap.innerHTML = `
    <table class="data-table">
      <thead><tr><th>Nama</th><th>NIS</th><th>NISN</th><th>Kelas</th><th>Status</th></tr></thead>
      <tbody>
        ${res.data.map(s => `
          <tr>
            <td>${s.Nama || ''}</td>
            <td>${s.NIS || ''}</td>
            <td>${s.NISN || ''}</td>
            <td>${s.Kelas || ''}</td>
            <td><span class="badge badge-${(s.Status||'').toLowerCase()}">${s.Status || ''}</span></td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

function openAddSiswaForm() {
  mainEl().insertAdjacentHTML('beforeend', `
    <div class="modal-overlay" id="modal-siswa">
      <div class="modal-box">
        <h3>Tambah Siswa Baru</h3>
        <form id="form-add-siswa">
          <label class="field-label">Nama</label><input class="field-input" name="Nama" required>
          <label class="field-label">NIS</label><input class="field-input" name="NIS">
          <label class="field-label">NISN</label><input class="field-input" name="NISN">
          <label class="field-label">Kelas</label><input class="field-input" name="Kelas">
          <div class="modal-actions">
            <button type="button" class="btn btn-ghost" id="btn-cancel-siswa">Batal</button>
            <button type="submit" class="btn btn-primary">Simpan</button>
          </div>
        </form>
      </div>
    </div>`);
  document.getElementById('btn-cancel-siswa').addEventListener('click', () => document.getElementById('modal-siswa').remove());
  document.getElementById('form-add-siswa').addEventListener('submit', async ev => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const data = Object.fromEntries(fd.entries());
    const res = await Api.post('addSiswa', data);
    if (res.success) {
      document.getElementById('modal-siswa').remove();
      renderSiswaTable('');
    } else {
      alert(res.message);
    }
  });
}

// ---------- UTIL ----------
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
