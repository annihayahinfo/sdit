// ============================================================
// API WRAPPER — komunikasi ke GAS via fetch() (bukan google.script.run)
// ============================================================
const Api = {
  getToken() { return localStorage.getItem('anh_token'); },
  setToken(t) { localStorage.setItem('anh_token', t); },
  clearToken() { localStorage.removeItem('anh_token'); },

  async get(action, params = {}) {
    const url = new URL(GAS_URL);
    url.searchParams.set('action', action);
    url.searchParams.set('token', this.getToken() || '');
    Object.keys(params).forEach(k => { if (params[k] !== undefined && params[k] !== '') url.searchParams.set(k, params[k]); });
    const res = await fetch(url.toString(), { method: 'GET' });
    return res.json();
  },

  async post(action, data = {}, extra = {}) {
    // PENTING: Content-Type WAJIB text/plain agar tidak kena preflight CORS di GAS
    const body = JSON.stringify({ action, token: this.getToken() || '', data, ...extra });
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body
    });
    return res.json();
  },

  async login(username, password) {
    const body = JSON.stringify({ action: 'login', username, password });
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body
    });
    return res.json();
  }
};
