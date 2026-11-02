/* Acesso aos dados: Supabase (produção) ou navegador (modo demonstração). */
'use strict';
(function () {
  const C = window.VS_CONFIG || {};
  const URL_ = (C.supabaseUrl || '').replace(/\/+$/, '');
  const KEY = C.supabaseKey || '';
  const DEMO = !URL_ || !KEY;
  const SESSION_KEY = 'vs-admin-session';

  const ls = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch { /* ok */ } },
  };

  const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const rnd = n => { const a = new Uint32Array(n); crypto.getRandomValues(a); return a; };
  const newCode = () => Array.from(rnd(10), x => ALPHA[x % ALPHA.length]).join('');
  const newPin = () => String(rnd(1)[0] % 10000).padStart(4, '0');
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : newCode() + Date.now());

  class ApiError extends Error { constructor(msg, status) { super(msg); this.status = status; } }

  /* ---------------- Supabase (REST, sem bibliotecas) ---------------- */
  async function http(path, { method = 'GET', body, token, headers = {} } = {}) {
    const h = { apikey: KEY, ...headers };
    if (token) h.Authorization = 'Bearer ' + token;
    if (body !== undefined) h['Content-Type'] = 'application/json';
    let r;
    try { r = await fetch(URL_ + path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) }); }
    catch { throw new ApiError('Sem conexão com a internet.', 0); }
    const text = await r.text();
    const data = text ? JSON.parse(text) : null;
    if (!r.ok) throw new ApiError((data && (data.msg || data.message || data.error_description || data.error)) || ('Erro ' + r.status), r.status);
    return data;
  }

  function saveSession(s) {
    const expires = s.expires_at ? s.expires_at * 1000 : Date.now() + (s.expires_in || 3600) * 1000;
    const sess = { access_token: s.access_token, refresh_token: s.refresh_token, expires, email: s.user?.email || ls.get(SESSION_KEY, {}).email };
    ls.set(SESSION_KEY, sess); return sess;
  }
  async function token() {
    let s = ls.get(SESSION_KEY, null);
    if (!s) throw new ApiError('Sessão encerrada. Entre de novo.', 401);
    if (Date.now() > s.expires - 60000) {
      try { s = saveSession(await http('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: s.refresh_token } })); }
      catch (e) { if (e.status) { ls.del(SESSION_KEY); throw new ApiError('Sessão encerrada. Entre de novo.', 401); } throw e; }
    }
    return s.access_token;
  }
  const authed = async (path, opt = {}) => http(path, { ...opt, token: await token() });
  const one = { Accept: 'application/vnd.pgrst.object+json' };
  const rep = { Prefer: 'return=representation', ...one };
  const TRIP_LIST = 'id,code,pin,client_name,title,start_date,updated_at';
  const V_META = 'id,trip_id,title,day_n,file_name,mime,size,created_at';

  const remote = {
    demo: false,
    session: () => ls.get(SESSION_KEY, null),
    async login(email, password) { return saveSession(await http('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } })); },
    async logout() { try { await authed('/auth/v1/logout', { method: 'POST' }); } catch { /* ok */ } ls.del(SESSION_KEY); },
    async isAdmin() { const r = await authed('/rest/v1/admins?select=email'); return Array.isArray(r) && r.length > 0; },
    listTrips: () => authed(`/rest/v1/trips?select=${TRIP_LIST}&order=updated_at.desc`),
    getTrip: id => authed(`/rest/v1/trips?id=eq.${id}&select=*`, { headers: one }),
    createTrip: row => authed('/rest/v1/trips', { method: 'POST', body: row, headers: rep }),
    updateTrip: (id, patch) => authed(`/rest/v1/trips?id=eq.${id}`, { method: 'PATCH', body: patch, headers: rep }),
    deleteTrip: id => authed(`/rest/v1/trips?id=eq.${id}`, { method: 'DELETE' }),
    listVouchers: tripId => authed(`/rest/v1/vouchers?trip_id=eq.${tripId}&select=${V_META}&order=day_n.asc.nullsfirst,created_at.asc`),
    addVoucher: row => authed(`/rest/v1/vouchers?select=${V_META}`, { method: 'POST', body: row, headers: rep }),
    updateVoucher: (id, patch) => authed(`/rest/v1/vouchers?id=eq.${id}&select=${V_META}`, { method: 'PATCH', body: patch, headers: rep }),
    deleteVoucher: id => authed(`/rest/v1/vouchers?id=eq.${id}`, { method: 'DELETE' }),
    async voucherContent(id) { const r = await authed(`/rest/v1/vouchers?id=eq.${id}&select=content_b64`, { headers: one }); return r.content_b64; },
    // cliente
    clientTrip: (code, pin) => http('/rest/v1/rpc/get_trip', { method: 'POST', body: { p_code: code, p_pin: pin } }),
    clientVoucher: (code, pin, id) => http('/rest/v1/rpc/get_voucher', { method: 'POST', body: { p_code: code, p_pin: pin, p_id: id } }),
  };

  /* ---------------- Modo demonstração (dados neste navegador) ---------------- */
  const DB = 'vs-demo-db';
  const db = () => ls.get(DB, { trips: [], vouchers: [] });
  const put = d => { if (!ls.set(DB, d)) throw new ApiError('Espaço do navegador cheio (modo demonstração). Use arquivos menores ou configure o Supabase.', 413); };
  const now = () => new Date().toISOString();
  const pick = (o, keys) => Object.fromEntries(keys.split(',').map(k => [k, o[k]]));
  const touch = (d, tripId) => { const t = d.trips.find(x => x.id === tripId); if (t) t.updated_at = now(); };
  const delay = v => new Promise(r => setTimeout(() => r(v), 60));

  const demo = {
    demo: true,
    session: () => ls.get(SESSION_KEY, null),
    async login(email) { const s = { access_token: 'demo', refresh_token: 'demo', expires: Date.now() + 864e5 * 365, email }; ls.set(SESSION_KEY, s); return s; },
    async logout() { ls.del(SESSION_KEY); },
    async isAdmin() { return true; },
    async listTrips() { return delay(db().trips.map(t => pick(t, TRIP_LIST)).sort((a, b) => b.updated_at.localeCompare(a.updated_at))); },
    async getTrip(id) { const t = db().trips.find(x => x.id === id); if (!t) throw new ApiError('Viagem não encontrada', 404); return delay(structuredClone(t)); },
    async createTrip(row) { const d = db(); const t = { id: uuid(), created_at: now(), updated_at: now(), data: {}, ...row }; d.trips.push(t); put(d); return delay(structuredClone(t)); },
    async updateTrip(id, patch) { const d = db(); const t = d.trips.find(x => x.id === id); Object.assign(t, patch, { updated_at: now() }); put(d); return delay(structuredClone(t)); },
    async deleteTrip(id) { const d = db(); d.trips = d.trips.filter(x => x.id !== id); d.vouchers = d.vouchers.filter(v => v.trip_id !== id); put(d); return delay(null); },
    async listVouchers(tripId) { return delay(db().vouchers.filter(v => v.trip_id === tripId).map(v => pick(v, V_META)).sort((a, b) => (a.day_n ?? -1) - (b.day_n ?? -1) || a.created_at.localeCompare(b.created_at))); },
    async addVoucher(row) { const d = db(); const v = { id: uuid(), created_at: now(), ...row }; d.vouchers.push(v); touch(d, v.trip_id); put(d); return delay(pick(v, V_META)); },
    async updateVoucher(id, patch) { const d = db(); const v = d.vouchers.find(x => x.id === id); Object.assign(v, patch); touch(d, v.trip_id); put(d); return delay(pick(v, V_META)); },
    async deleteVoucher(id) { const d = db(); const v = d.vouchers.find(x => x.id === id); d.vouchers = d.vouchers.filter(x => x.id !== id); if (v) touch(d, v.trip_id); put(d); return delay(null); },
    async voucherContent(id) { return delay((db().vouchers.find(x => x.id === id) || {}).content_b64 || null); },
    async clientTrip(code, pin) {
      const d = db(); const t = d.trips.find(x => x.code === code && x.pin === pin); if (!t) return delay(null);
      const vs = d.vouchers.filter(v => v.trip_id === t.id).map(v => pick(v, 'id,title,day_n,file_name,mime,size'));
      return delay({ data: t.data, client_name: t.client_name, updated_at: t.updated_at, vouchers: vs });
    },
    async clientVoucher(code, pin, id) {
      const d = db(); const t = d.trips.find(x => x.code === code && x.pin === pin); if (!t) return delay(null);
      return delay((d.vouchers.find(v => v.id === id && v.trip_id === t.id) || {}).content_b64 || null);
    },
  };

  window.VS_API = Object.assign(DEMO ? demo : remote, { newCode, newPin, ApiError, ls });
})();
