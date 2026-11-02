/* Via Singularis Travel · app do cliente (PWA)
   A viagem vem do Supabase (código do link + PIN) e fica salva no aparelho para uso offline. */
'use strict';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const AG = (window.VS_CONFIG || {}).agency || {};

let T = null;               // dados da viagem
const MES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const WD = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'];

/* ---------- ícones (traço) ---------- */
const P = {
  plane:'<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
  train:'<rect x="4" y="3" width="16" height="13" rx="3"/><path d="M4 11h16M12 3v8M8 19l-2 2M16 19l2 2M8 16h.01M16 16h.01"/>',
  bus:'<path d="M8 6v6M15 6v6M2 12h19.6M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/>',
  walk:'<circle cx="13" cy="4" r="2"/><path d="m7 21 3-6 2 2v4M10 15l1-5-3 1-2 3M11 10l3 3 3 1"/>',
  car:'<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2.7-3.6A2 2 0 0 0 13.7 6H7.3a2 2 0 0 0-1.6.9L3 10.5 2.3 12A2 2 0 0 0 2 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M9 17h6"/>',
  arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  bed:'<path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/>',
  star:'<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
  moon:'<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>',
  bulb:'<path d="M9 18h6M10 22h4M15.1 14c.2-1 .7-1.7 1.4-2.5A5.5 5.5 0 0 0 12 2a5.5 5.5 0 0 0-4.5 9.5c.7.8 1.2 1.5 1.4 2.5"/>',
  alert:'<path d="m21.7 18-8-14a2 2 0 0 0-3.5 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3z"/><path d="M12 9v4M12 17h.01"/>',
  info:'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  pin:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
  ext:'<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  route:'<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
  home:'<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  cal:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  check:'<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  cart:'<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
  food:'<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>',
};
const icon = (k, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[k] || P.arrow}</svg>`;

function stepIcon(name) {
  const n = name.toLowerCase();
  if (/voo|aeroporto/.test(n) && !/ônibus|metrô|uber/.test(n)) return 'plane';
  if (/uber|táxi|taxi/.test(n)) return 'car';
  if (/metrô|trem|comboio|avlo|ouigo|iryo/.test(n)) return 'train';
  if (/ônibus|flixbus|carris|moventis|alsa|bus/.test(n)) return 'bus';
  if (/a pé|caminhada/.test(n)) return 'walk';
  if (/restaurante|almoço|café/.test(n)) return 'food';
  return 'arrow';
}
const NOTE_ICON = {checkin:'bed', star:'star', night:'moon', tip:'bulb', alert:'alert', y2027:'alert', transport:'bus', walk:'walk', info:'info'};

/* ---------- datas ---------- */
const parse = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const fmtShort = iso => { const d = parse(iso); return `${String(d.getDate()).padStart(2, '0')} ${MES[d.getMonth()]}`; };
const fmtNum = iso => { const d = parse(iso); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`; };
const wd = iso => WD[parse(iso).getDay()];
function todayISO() {
  const q = new URLSearchParams(location.search).get('hoje');   // teste: ?hoje=2027-06-05
  if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) return q;
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
const trecho = id => T.trechos.find(t => t.id === id);
const todayDay = () => T.days.find(d => d.date === todayISO());

/* ---------- mapas ---------- */
const looksAddress = s => /\d|s\/n|^(r\.|rua|av\.|avenida|c\.|carrer|calle|pl\.|plaça|plaza|praça|pg\.|p\.º|largo|cta\.|ctra\.|camí|tv\.|estrada|calçada|escadinhas)/i.test(s || '');
function mapQuery(name, detail, city) {
  const addr = (detail || '').split(' · ').filter(looksAddress).filter(x => !/^\d+([,.]\d+)?\s?k?m\b/.test(x))[0];
  return [name, addr, city].filter(Boolean).join(', ');
}
const mapsURL = q => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
const mapLink = (q, label = 'Mapa') => `<a class="maplink" href="${mapsURL(q)}" target="_blank" rel="noopener">${icon('pin')}${label}</a>`;
function routeURL(stops, city) {
  const pts = stops.map(s => mapQuery(s.name, s.detail, city));
  const u = new URL('https://www.google.com/maps/dir/');
  u.searchParams.set('api', '1');
  u.searchParams.set('origin', pts[0]);
  u.searchParams.set('destination', pts[pts.length - 1]);
  if (pts.length > 2) u.searchParams.set('waypoints', pts.slice(1, -1).slice(0, 8).join('|'));
  u.searchParams.set('travelmode', 'walking');
  return u.toString();
}

/* ---------- blocos do dia ---------- */
function renderBlock(b, day) {
  if (b.type === 'note') {
    const kind = b.kind || 'info';
    const isCheckin = kind === 'checkin';
    const extra = isCheckin ? `<div>${mapLink(b.title.split(' · ').slice(1).join(', ') + ', ' + day.mapCity, 'Ver no mapa')}</div>` : '';
    return `<div class="note ${kind}"><span class="ico">${icon(NOTE_ICON[kind] || 'info')}</span><div>
      ${b.label ? `<div class="lbl">${esc(b.label)}</div>` : ''}
      <div class="tt">${esc(b.title)}</div>${b.text ? `<div class="tx">${esc(b.text)}</div>` : ''}${extra}</div></div>`;
  }
  let inner = `<h3 class="sec-title">${esc(b.title)}</h3>`;
  if (b.intro) inner += `<div class="walk">${esc(b.intro)}</div>`;
  if (b.type === 'steps') {
    inner += b.items.map(it => `<div class="step"><span class="ico">${icon(stepIcon(it.name))}</span><div class="body">
      <div class="name">${esc(it.name)}</div>${it.detail ? `<div class="detail">${esc(it.detail)}</div>` : ''}
      ${it.time ? `<span class="time${it.pending ? ' pending' : ''}">${esc(it.time)}</span>` : ''}</div></div>`).join('');
  } else if (b.type === 'stops') {
    inner += '<ol class="stops">' + b.items.map((it, i) => `<li><span class="num">${i + 1}</span><div>
      <div class="name">${esc(it.name)}</div>${it.detail ? `<div class="detail">${esc(it.detail)}</div>` : ''}
      ${mapLink(mapQuery(it.name, it.detail, day.mapCity))}</div></li>`).join('') + '</ol>';
    if (b.items.length > 1) inner += `<a class="routebtn" href="${routeURL(b.items, day.mapCity)}" target="_blank" rel="noopener">${icon('route')}Abrir rota a pé no Google Maps</a>`;
  } else {
    inner += b.items.map(it => `<div class="place"><div class="name">${esc(it.name)}</div>
      ${it.detail ? `<div class="detail">${esc(it.detail)}</div>` : ''}${mapLink(mapQuery(it.name, it.detail, day.mapCity))}</div>`).join('');
  }
  return `<section class="card">${inner}</section>`;
}


Object.assign(P, {
  file:'<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  ticket:'<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/><path d="M13 5v2M13 17v2M13 11v2"/>',
  lock:'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  down:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  chat:'<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 21l2-5.2A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z"/>',
  sync:'<path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M3 21v-5h5"/>',
});

/* ---------- estado da viagem aberta ---------- */
let TRIP = null;   // { code, pin, client_name, updated_at, vouchers: [...] }
const API = window.VS_API;
const LS = API.ls;
const PARAMS = new URLSearchParams(location.search);
const PREVIEW = PARAMS.has('preview');
const tripKey = code => 'vs-trip-' + code;
const STORE_KEY = () => 'vs-reservas-' + (TRIP ? TRIP.code : 'x');
const CONF_KEY = () => 'vs-confirmacoes-' + (TRIP ? TRIP.code : 'x');

const addDays = (iso, n) => { const d = parse(iso); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };

function normalize(data) {
  const t = Object.assign({ title: '', headline: [], summary: '', start: '', notice: '', stats: [], trechos: [], days: [], transfers: [], stays: [], checklist: [], cards: [], timed: [] }, data || {});
  t.days = (t.days || []).map((d, i) => ({ blocks: [], ...d, n: i + 1, date: t.start ? addDays(t.start, i) : (d.date || '') }));
  t.end = t.days.length ? t.days[t.days.length - 1].date : t.start;
  if (!t.trechos.length) t.trechos = [{ id: 1, name: t.title || 'Viagem', cities: '', color: '#1D4E9E' }];
  t.trechos.forEach(tr => { const ds = t.days.filter(d => d.trecho === tr.id); tr.from = ds[0]?.date; tr.to = ds[ds.length - 1]?.date; });
  t.brand = AG.name || 'Via Singularis Travel';
  t.passenger = TRIP?.client_name || '';
  t.year = t.start ? t.start.slice(0, 4) : '';
  return t;
}
const nightsOf = s => (s.from && s.to) ? Math.max(0, daysBetween(s.from, s.to)) : 0;
const trechoOf = id => T.trechos.find(t => t.id === id) || T.trechos[0];
// substitui a função anterior, tolerante a trechos ausentes
const trechoSafe = trechoOf;

/* ---------- vouchers guardados no aparelho (IndexedDB) ---------- */
const VDB = {
  db: null,
  open() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((res, rej) => {
      let r; try { r = indexedDB.open('vs-vouchers', 1); } catch (e) { return rej(e); }
      r.onupgradeneeded = () => r.result.createObjectStore('files');
      r.onsuccess = () => { this.db = r.result; res(this.db); };
      r.onerror = () => rej(r.error);
    });
  },
  async tx(mode, fn) { const db = await this.open(); return new Promise((res, rej) => { const t = db.transaction('files', mode); const s = t.objectStore('files'); const out = fn(s); t.oncomplete = () => res(out && out.result); t.onerror = () => rej(t.error); }); },
  get(k) { return this.tx('readonly', s => s.get(k)); },
  put(k, v) { return this.tx('readwrite', s => s.put(v, k)); },
  del(k) { return this.tx('readwrite', s => s.delete(k)); },
  keys() { return this.tx('readonly', s => s.getAllKeys()); },
};
const vkey = id => TRIP.code + ':' + id;
const b64ToBlob = (b64, mime) => { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type: mime || 'application/octet-stream' }); };
const savedVouchers = new Set();

async function syncVouchers() {
  if (!TRIP || PREVIEW) return;
  try {
    const keys = await VDB.keys();
    const mine = new Set((TRIP.vouchers || []).map(v => vkey(v.id)));
    for (const k of keys) { if (String(k).startsWith(TRIP.code + ':') && !mine.has(k)) await VDB.del(k); }
    for (const v of (TRIP && TRIP.vouchers) || []) {
      if (!TRIP) break;
      const k = vkey(v.id);
      if ((await VDB.get(k))) { savedVouchers.add(v.id); continue; }
      if (!navigator.onLine) continue;
      const b64 = await API.clientVoucher(TRIP.code, TRIP.pin, v.id);
      if (b64) { await VDB.put(k, b64ToBlob(b64, v.mime)); savedVouchers.add(v.id); }
    }
  } catch { /* sem IndexedDB ou sem rede: tenta de novo depois */ }
  if (TRIP && (/^#\/(vouchers|voucher|dia)/.test(location.hash) || location.hash === '' || location.hash === '#/')) route();
}

/* ---------- telas ---------- */
function setAccent(c) { document.documentElement.style.setProperty('--accent', c || '#1D4E9E'); document.querySelector('meta[name=theme-color]').content = c || '#13223F'; }
const dayVouchers = n => (TRIP?.vouchers || []).filter(v => v.day_n === n);
const fmtSize = b => !b ? '' : b > 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
function voucherRow(v) {
  const ok = savedVouchers.has(v.id) || PREVIEW;
  const d = v.day_n ? T.days[v.day_n - 1] : null;
  return `<a class="vrow" href="#/voucher/${esc(v.id)}"><span class="ico">${icon('ticket')}</span><div class="body">
    <div class="name">${esc(v.title)}</div>
    <div class="detail">${d ? `Dia ${d.n} · ${fmtShort(d.date)} · ` : ''}${esc((v.file_name || '').split('.').pop().toUpperCase())} ${fmtSize(v.size)}</div>
    <div class="vstat ${ok ? 'ok' : ''}">${ok ? 'Salvo no aparelho' : 'Será baixado quando houver internet'}</div></div></a>`;
}

function viewDay(n) {
  const day = T.days.find(d => d.n === n);
  if (!day) return viewHome();
  const tr = trechoOf(day.trecho);
  setAccent(tr.color);
  const prev = T.days[n - 2], next = T.days[n];
  const isToday = day.date === todayISO();
  const vs = dayVouchers(n);
  document.title = `Dia ${n} · ${day.place}`;
  return `
  <header class="topbar"><div class="wrap"><a class="back" href="#/dias">‹ Dias</a><span class="t">Trecho ${String(tr.id).padStart(2,'0')} · ${esc(tr.name)}</span></div></header>
  <div class="dayhead"><div class="wrap">
    <div class="row"><div class="bignum">${day.date ? parse(day.date).getDate() : n}</div>
      <div class="meta"><div class="dn">Dia ${String(n).padStart(2,'0')} de ${T.days.length}</div><div class="wd">${day.date ? esc(MES[parse(day.date).getMonth()]) + ' · ' + esc(wd(day.date)) : ''}</div></div></div>
    ${day.place ? `<span class="pill">${esc(day.place)}</span>` : ''}${isToday ? '<span class="today-badge">Hoje</span>' : ''}
    <h2>${esc(day.title)}</h2>
  </div></div>
  <div class="wrap"><div class="cards">
    ${vs.length ? `<section class="card"><h3 class="sec-title">Seus vouchers</h3>${vs.map(voucherRow).join('')}</section>` : ''}
    ${day.blocks.map(b => renderBlock(b, day)).join('')}</div>
    <nav class="pager" aria-label="Navegar entre dias">
      ${prev ? `<a href="#/dia/${prev.n}"><small>‹ Dia ${prev.n}</small><span>${esc(prev.place)}</span></a>` : '<span class="ph"></span>'}
      ${next ? `<a class="next" href="#/dia/${next.n}"><small>Dia ${next.n} ›</small><span>${esc(next.place)}</span></a>` : '<span class="ph"></span>'}
    </nav>
    ${footer()}
  </div>`;
}

function hero(title, sub) {
  return `<header class="hero"><div class="wrap"><div class="kicker"><b>${esc(T.brand)}</b>${T.title ? ' · ' + esc(T.title) : ''}</div><h1 style="font-size:44px">${esc(title)}</h1>${sub ? `<p>${esc(sub)}</p>` : ''}</div></header>`;
}

function viewHome() {
  const td = todayDay();
  if (td) return viewDay(td.n);
  setAccent(null);
  document.title = `${T.brand} · ${T.title}`;
  const t = todayISO();
  const before = !T.start || t < T.start;
  const left = T.start ? daysBetween(t, T.start) : 0;
  const nv = (TRIP?.vouchers || []).length;
  const h = T.headline && T.headline.filter(Boolean).length ? T.headline : [T.title];
  return `
  <header class="hero"><div class="wrap">
    <div class="kicker"><b>${esc(T.brand)}</b>${T.title ? ' · ' + esc(T.title) : ''}</div>
    <h1>${esc(h[0] || '')}${h[1] ? `<span>${esc(h[1])}</span>` : ''}</h1>
    ${T.summary ? `<p>${esc(T.summary)}</p>` : ''}
    <div class="chips">${T.start ? `<div class="chip"><small>Período</small><strong>${fmtShort(T.start)} → ${fmtShort(T.end)} ${T.year}</strong></div>` : ''}
      ${T.passenger ? `<div class="chip"><small>Passageiro</small><strong>${esc(T.passenger)}</strong></div>` : ''}</div>
    ${T.stats.length ? `<div class="stats">${T.stats.map(s => `<div><strong>${esc(s.value)}</strong>${esc(s.label)}</div>`).join('')}</div>` : ''}
  </div></header>
  <div class="wrap">
    ${T.start ? (before ? `<div class="countdown"><strong>${left}</strong><div><div class="lb">${left === 1 ? 'dia para a viagem' : 'dias para a viagem'}</div>
      <div class="sm">Embarque em ${fmtNum(T.start)}/${T.year}${nv ? ` · ${nv} voucher${nv > 1 ? 's' : ''} disponíve${nv > 1 ? 'is' : 'l'}` : ''}</div></div></div>` :
      `<div class="countdown"><strong>✓</strong><div><div class="lb">Viagem concluída</div><div class="sm">Reveja o roteiro quando quiser</div></div></div>`) : ''}
    ${T.notice ? `<div class="banner">${icon('info')}<div>${esc(T.notice)}</div></div>` : ''}
    ${T.days.length ? `<div class="section"><div class="eyebrow">A viagem em ${T.trechos.length} trecho${T.trechos.length > 1 ? 's' : ''}</div><h3>Toque em um trecho</h3><p class="sub">para ver o dia a dia</p>
      ${T.trechos.map(tr => { const ds = T.days.filter(d => d.trecho === tr.id); if (!ds.length) return '';
        return `<a class="trecho" style="--c:${esc(tr.color)}" href="#/dia/${ds[0].n}"><span class="n">${String(tr.id).padStart(2,'0')}</span><div>
        <div class="nm">${esc(tr.name)}</div><div class="ct">${esc(tr.cities)}</div><div class="dt">${tr.from ? `${fmtShort(tr.from)} → ${fmtShort(tr.to)} · ` : ''}${ds.length} dia${ds.length > 1 ? 's' : ''}</div></div></a>`; }).join('')}
    </div>
    <a class="btn" href="#/dia/1">Começar pelo dia 1 →</a>` : '<p class="foot">O roteiro desta viagem ainda está sendo preparado pela agência.</p>'}
    ${footer()}
  </div>`;
}

function viewDays() {
  setAccent(null);
  document.title = 'Dias · ' + T.title;
  const t = todayISO();
  let html = hero('Dia a dia', T.start ? `${T.days.length} dias · ${fmtShort(T.start)} → ${fmtShort(T.end)} ${T.year}` : '') + '<div class="wrap">';
  for (const tr of T.trechos) {
    const ds = T.days.filter(d => d.trecho === tr.id); if (!ds.length) continue;
    html += `<div class="group-h" style="--c:${esc(tr.color)}">${String(tr.id).padStart(2,'0')} · ${esc(tr.name)}</div>`;
    html += ds.map(d => `<a class="dayrow${d.date === t ? ' is-today' : ''}${d.date < t && t <= T.end ? ' is-past' : ''}" style="--c:${esc(tr.color)}" href="#/dia/${d.n}">
      <div class="d"><strong>${d.date ? parse(d.date).getDate() : d.n}</strong><small>${d.date ? MES[parse(d.date).getMonth()] + ' · ' + wd(d.date).slice(0,3) : ''}</small></div>
      <div class="info"><div class="pl">${esc(d.place)}</div><div class="ti">Dia ${d.n} · ${esc(d.title)}</div></div></a>`).join('');
  }
  return html + footer() + '</div>';
}

function viewTransfers() {
  setAccent(null);
  document.title = 'Deslocamentos · ' + T.title;
  const color = iso => trechoOf(T.days.find(d => d.date === iso)?.trecho).color;
  const list = [...T.transfers].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  return hero('Deslocamentos', 'Horários que não podem escapar') + `<div class="wrap">
    ${list.length ? `<div class="section">${list.map(x => { const day = T.days.find(d => d.date === x.date); const tag = day ? 'a' : 'div';
      return `<${tag} class="tr" style="--c:${esc(color(x.date))}"${day ? ` href="#/dia/${day.n}"` : ''}><div class="dt">${x.date ? fmtNum(x.date).slice(0,2) : '—'}<small>${x.date ? MES[parse(x.date).getMonth()] + ' · ' + wd(x.date).slice(0,3) : ''}</small></div>
      <div><div class="rt">${esc(x.route)}</div>${x.mode ? `<div class="md">${esc(x.mode)}</div>` : ''}${x.time ? `<span class="time${/definir/i.test(x.time) ? ' pending' : ''}">${esc(x.time)}</span>` : ''}</div></${tag}>`; }).join('')}</div>` : '<p class="foot">Nenhum deslocamento cadastrado.</p>'}
    ${footer()}</div>`;
}

function viewStays() {
  setAccent(null);
  document.title = 'Hospedagens · ' + T.title;
  const nights = T.stays.reduce((a, s) => a + nightsOf(s), 0);
  const cf = loadConf();
  return hero('Onde dormir', `${T.stays.length} hospedage${T.stays.length === 1 ? 'm' : 'ns'}${nights ? ` · ${nights} noites` : ''}`) + `<div class="wrap"><div class="section">
    ${T.stays.map((s, k) => { const c = trechoOf(T.days.find(d => d.date === s.from)?.trecho).color; const n = nightsOf(s);
      const mine = cf['hosp-' + k] || '';
      return `<div class="stay" style="--c:${esc(c)}"><div class="ct">${esc(s.city)}${n ? ` · ${n} noite${n > 1 ? 's' : ''}` : ''}</div><div class="nm">${esc(s.name)}</div>
      ${s.address ? `<div class="ad">${esc(s.address)}</div>` : ''}${s.from && s.to ? `<div class="dt">${wd(s.from)}, ${fmtShort(s.from)} → ${wd(s.to)}, ${fmtShort(s.to)}</div>` : ''}
      ${s.confirmation ? `<div class="conf">Reserva: <b>${esc(s.confirmation)}</b></div>` : ''}
      ${mine ? (isURL(mine) ? `<div class="conf">Sua reserva · ${confLink(mine)}</div>` : `<div class="conf">Sua reserva: <b>${esc(mine)}</b></div>`) : ''}
      <div class="links">${mapLink(s.name + ', ' + (s.address || s.city), 'Ver no mapa')}${s.url ? `<a class="maplink" href="${esc(s.url)}" target="_blank" rel="noopener">${icon('ext')}${esc(s.site || 'Site')}</a>` : ''}</div></div>`; }).join('') || '<p class="foot">Nenhuma hospedagem cadastrada.</p>'}
    </div>${footer()}</div>`;
}

/* ---------- vouchers e reservas ---------- */
function loadChecks() { return LS.get(STORE_KEY(), {}); }
function saveChecks(o) { LS.set(STORE_KEY(), o); }
function loadConf() { return LS.get(CONF_KEY(), {}); }
function saveConf(o) { LS.set(CONF_KEY(), o); }
const isURL = v => /^https?:\/\/\S+$/i.test((v || '').trim());
const confLink = v => isURL(v) ? `<a class="maplink" href="${esc(v.trim())}" target="_blank" rel="noopener">${icon('ext')}Abrir confirmação</a>` : '';
const doneCount = () => { const c = loadChecks(); return T.checklist.filter(i => c[i.id]).length; };
function checkItem(i, c, cf) {
  const v = cf[i.id] || '';
  return `<div class="check${c[i.id] ? ' done' : ''}"><input type="checkbox" id="ck-${esc(i.id)}" data-id="${esc(i.id)}"${c[i.id] ? ' checked' : ''}>
    <div class="ckbody"><label for="ck-${esc(i.id)}">${esc(i.text)}</label>
      ${i.url ? `<a class="buy" href="${esc(i.url)}" target="_blank" rel="noopener">${icon('ext')}${esc(i.site || 'Site oficial')}</a>` : ''}
      <div class="cf"><input class="cfin" type="text" autocomplete="off" data-id="${esc(i.id)}" value="${esc(v)}" placeholder="Código ou link da confirmação" aria-label="Código ou link da confirmação: ${esc(i.text)}">
      <span class="cfl" id="cfl-${esc(i.id)}">${confLink(v)}</span></div></div></div>`;
}

function viewVouchers() {
  setAccent(null);
  document.title = 'Vouchers · ' + T.title;
  const vs = TRIP?.vouchers || [];
  const c = loadChecks(), cf = loadConf();
  const done = doneCount(), total = T.checklist.length;
  return hero('Vouchers', 'Seus documentos de viagem, salvos no aparelho') + `<div class="wrap">
    <div class="section">${vs.length ? `<div class="card">${vs.map(voucherRow).join('')}</div>` : '<p class="sub">A agência ainda não enviou vouchers para esta viagem.</p>'}</div>
    ${total ? `<div class="section"><h3>Antes de embarcar</h3><p class="sub" id="ckcount">${done} de ${total} marcados · ficam salvos neste aparelho</p>
      <div class="progress"><i id="ckbar" style="width:${Math.round(done / total * 100)}%"></i></div>
      <div style="margin-top:14px">${T.checklist.map(i => checkItem(i, c, cf)).join('')}</div></div>` : ''}
    ${T.cards.length ? `<div class="section"><h3>Cartões de transporte</h3><div class="cardlist">${T.cards.map(x => `<div><b>${esc(x.city)}</b>${esc(x.text)}</div>`).join('')}</div></div>` : ''}
    ${T.timed.length ? `<div class="section"><h3>Reserve com horário marcado</h3><p class="sub">Vendem ingressos por horário e costumam esgotar na alta temporada</p>
      <div class="tags">${T.timed.map(x => `<span>${esc(x)}</span>`).join('')}</div></div>` : ''}
    ${footer()}</div>`;
}

let lastBlobURL = null;
function viewVoucher(id) {
  const v = (TRIP?.vouchers || []).find(x => x.id === id);
  if (!v) return viewVouchers();
  setAccent(null);
  document.title = v.title;
  const back = v.day_n ? `#/dia/${v.day_n}` : '#/vouchers';
  setTimeout(() => showVoucher(v), 0);
  return `<header class="topbar"><div class="wrap"><a class="back" href="${back}">‹ Voltar</a><span class="t">Voucher</span></div></header>
    <div class="wrap"><div class="section"><h3>${esc(v.title)}</h3><p class="sub">${esc(v.file_name || '')} ${fmtSize(v.size)}</p>
    <div id="vbox" class="vbox"><p class="sub">Carregando…</p></div></div>${footer()}</div>`;
}
async function showVoucher(v) {
  const box = document.getElementById('vbox'); if (!box) return;
  let blob = null;
  try {
    if (PREVIEW) { const b64 = await API.voucherContent(v.id); if (b64) blob = b64ToBlob(b64, v.mime); }
    else {
      blob = await VDB.get(vkey(v.id));
      if (!blob && navigator.onLine) { const b64 = await API.clientVoucher(TRIP.code, TRIP.pin, v.id); if (b64) { blob = b64ToBlob(b64, v.mime); VDB.put(vkey(v.id), blob).then(() => savedVouchers.add(v.id)).catch(() => {}); } }
    }
  } catch { blob = null; }
  if (!blob) { box.innerHTML = '<div class="banner">' + icon('alert') + '<div>Este voucher ainda não foi baixado. Abra o app com internet uma vez para salvá-lo no aparelho.</div></div>'; return; }
  if (lastBlobURL) URL.revokeObjectURL(lastBlobURL);
  const url = lastBlobURL = URL.createObjectURL(blob);
  const isImg = /^image\//.test(v.mime || blob.type);
  box.innerHTML = `${isImg ? `<img class="vimg" src="${url}" alt="${esc(v.title)}">` : ''}
    <a class="btn" href="${url}" target="_blank" rel="noopener">${icon('file')} Abrir ${isImg ? 'imagem' : 'documento'}</a>
    <a class="btn alt" href="${url}" download="${esc(v.file_name || 'voucher')}">${icon('down')} Salvar no aparelho</a>`;
}

function footer() {
  const msg = encodeURIComponent(`Olá! Sou ${TRIP?.client_name || 'cliente'}, da viagem ${T.title || ''}${TRIP ? ' (' + TRIP.code + ')' : ''}.`);
  const wa = (AG.whatsapp || '').replace(/\D/g, '');
  return `<div class="foot"><b>${esc(T.brand)}</b>
    ${wa ? `<a class="btn wa" href="https://wa.me/${wa}?text=${msg}" target="_blank" rel="noopener">${icon('chat')} Falar com a agência no WhatsApp</a>` : ''}
    ${AG.email ? `<br><a href="mailto:${esc(AG.email)}">${esc(AG.email)}</a>` : ''}
    ${TRIP && !PREVIEW ? `<br><button class="linkbtn" id="refresh">${icon('sync')} Buscar atualizações</button>` : ''}
    <br>Boa viagem!</div>`;
}

/* ---------- roteamento ---------- */
const TABS = [['#/', 'Hoje', 'home'], ['#/dias', 'Dias', 'cal'], ['#/trajetos', 'Trajetos', 'bus'], ['#/hospedagens', 'Estadia', 'bed'], ['#/vouchers', 'Vouchers', 'ticket']];
function route() {
  if (!T) return;
  const h = location.hash || '#/';
  let html, tab = '#/', m;
  if ((m = h.match(/^#\/dia\/(\d+)/))) { html = viewDay(+m[1]); tab = (todayDay()?.n === +m[1]) ? '#/' : '#/dias'; }
  else if ((m = h.match(/^#\/voucher\/(.+)/))) { html = viewVoucher(decodeURIComponent(m[1])); tab = '#/vouchers'; }
  else if (h.startsWith('#/dias')) { html = viewDays(); tab = '#/dias'; }
  else if (h.startsWith('#/trajetos')) { html = viewTransfers(); tab = '#/trajetos'; }
  else if (h.startsWith('#/hospedagens')) { html = viewStays(); tab = '#/hospedagens'; }
  else if (h.startsWith('#/vouchers') || h.startsWith('#/reservas')) { html = viewVouchers(); tab = '#/vouchers'; }
  else html = viewHome();
  const y = window.scrollY, same = route.last === h;
  $('#app').innerHTML = (PREVIEW ? '<div class="previewbar">Prévia · é assim que o cliente vai ver</div>' : '') + html;
  $('#tabs').innerHTML = TABS.map(([href, label, ic]) => `<a href="${href}"${href === tab ? ' aria-current="page"' : ''}>${icon(ic)}${label}</a>`).join('');
  document.querySelector('.tabbar').hidden = false;
  window.scrollTo(0, same ? y : 0);
  route.last = h;
}

/* ---------- entrada: link + PIN ---------- */
function screenGate(code, msg) {
  T = null; TRIP = null;
  setAccent(null);
  document.querySelector('.tabbar').hidden = true;
  document.title = AG.name || 'Via Singularis Travel';
  $('#app').innerHTML = `<header class="hero gate"><div class="wrap">
    <div class="kicker"><b>${esc(AG.name || 'Via Singularis Travel')}</b></div>
    <h1>Sua viagem<span>começa aqui</span></h1>
    <p>${code ? 'Digite o código de 4 dígitos que a agência enviou junto com o link.' : 'Abra o link da viagem que a agência enviou para você.'}</p></div></header>
    <div class="wrap">${code ? `<form class="pinform" id="pinform" autocomplete="off">
      <label for="pin">${icon('lock')} Código de acesso</label>
      <input id="pin" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" placeholder="••••" autofocus required>
      ${msg ? `<div class="err" role="alert">${esc(msg)}</div>` : ''}
      <button class="btn" type="submit">Abrir minha viagem</button></form>` : savedTripsList()}
    </div>`;
  const f = document.getElementById('pinform');
  if (f) f.onsubmit = async e => {
    e.preventDefault();
    const pin = document.getElementById('pin').value.trim();
    const btn = f.querySelector('button'); btn.disabled = true; btn.textContent = 'Abrindo…';
    try {
      const r = await API.clientTrip(code, pin);
      if (!r) return screenGate(code, 'Código incorreto. Confira a mensagem da agência.');
      storeTrip(code, pin, r); openTrip(code);
    } catch (err) { screenGate(code, err.message || 'Não foi possível abrir agora. Tente de novo.'); }
  };
}
function savedTripsList() {
  const list = [];
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('vs-trip-')) { const t = LS.get(k); if (t) list.push(t); } } } catch { /* ok */ }
  if (!list.length) return '<p class="foot">Nenhuma viagem salva neste aparelho.</p>';
  return '<div class="section"><h3>Viagens neste aparelho</h3>' + list.map(t => `<a class="dayrow" href="?v=${esc(t.code)}"><div class="info"><div class="pl">${esc(t.payload?.data?.title || 'Viagem')}</div><div class="ti">${esc(t.payload?.client_name || '')}</div></div></a>`).join('') + '</div>';
}
function storeTrip(code, pin, payload) { LS.set(tripKey(code), { code, pin, payload }); LS.set('vs-last', code); }
function applyTrip(code, rec) {
  TRIP = { code, pin: rec.pin, client_name: rec.payload.client_name, updated_at: rec.payload.updated_at, vouchers: rec.payload.vouchers || [] };
  T = normalize(rec.payload.data);
}
function openTrip(code) {
  const rec = LS.get(tripKey(code), null);
  if (!rec) return screenGate(code);
  if (new URLSearchParams(location.search).get('v') !== code) history.replaceState(null, '', '?v=' + encodeURIComponent(code) + location.hash);
  applyTrip(code, rec);
  route();
  syncVouchers();
  refreshTrip(false);
}
async function refreshTrip(manual) {
  if (!TRIP || PREVIEW || !navigator.onLine) { if (manual) toast('Sem internet no momento'); return; }
  try {
    const r = await API.clientTrip(TRIP.code, TRIP.pin);
    if (!r) { LS.del(tripKey(TRIP.code)); return screenGate(TRIP.code, 'O acesso a esta viagem mudou. Digite o novo código enviado pela agência.'); }
    if (r.updated_at !== TRIP.updated_at) { storeTrip(TRIP.code, TRIP.pin, r); applyTrip(TRIP.code, LS.get(tripKey(TRIP.code))); route(); syncVouchers(); toast('Roteiro atualizado'); }
    else if (manual) toast('Você já está com a versão mais recente');
  } catch { if (manual) toast('Não foi possível atualizar agora'); }
}
function toast(t) { const el = document.createElement('div'); el.className = 'toast'; el.textContent = t; document.body.append(el); setTimeout(() => el.remove(), 2600); }

/* ---------- eventos ---------- */
document.addEventListener('input', e => {
  const el = e.target;
  if (!el.matches('.cfin')) return;
  const cf = loadConf(); const v = el.value.trim();
  if (v) cf[el.dataset.id] = v; else delete cf[el.dataset.id];
  saveConf(cf);
  const out = document.getElementById('cfl-' + el.dataset.id); if (out) out.innerHTML = confLink(v);
});
document.addEventListener('change', e => {
  const el = e.target;
  if (!el.matches('.check input[type=checkbox]')) return;
  const c = loadChecks(); c[el.dataset.id] = el.checked; saveChecks(c);
  el.closest('.check').classList.toggle('done', el.checked);
  const done = doneCount(), total = T.checklist.length;
  $('#ckcount').textContent = `${done} de ${total} marcados · ficam salvos neste aparelho`;
  $('#ckbar').style.width = Math.round(done / total * 100) + '%';
});
document.addEventListener('click', e => { if (e.target.closest('#refresh')) refreshTrip(true); });

let sx = null, sy = null;
document.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, {passive: true});
document.addEventListener('touchend', e => {
  if (sx === null || !T) return;
  const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = null;
  const m = (location.hash || '').match(/^#\/dia\/(\d+)/);
  if (!m || Math.abs(dx) < 70 || Math.abs(dy) > 50) return;
  const n = +m[1] + (dx < 0 ? 1 : -1);
  if (n >= 1 && n <= T.days.length) location.hash = '#/dia/' + n;
}, {passive: true});

const setOnline = () => document.body.classList.toggle('is-offline', !navigator.onLine);
addEventListener('online', () => { setOnline(); syncVouchers(); refreshTrip(false); });
addEventListener('offline', setOnline);
addEventListener('hashchange', route);
setOnline();

/* ---------- início ---------- */
(function boot() {
  if (PREVIEW) {
    const p = LS.get('vs-preview', null);
    if (!p) { $('#app').innerHTML = '<div class="wrap" style="padding-top:40px"><h2>Prévia indisponível</h2><p>Abra a prévia pela área da agência.</p></div>'; return; }
    TRIP = { code: 'PREVIA', pin: '', client_name: p.client_name, vouchers: p.vouchers || [] };
    T = normalize(p.data); route(); return;
  }
  const code = (PARAMS.get('v') || LS.get('vs-last', '') || '').trim().toUpperCase();
  if (!code) return screenGate('');
  openTrip(code);
})();

if ('serviceWorker' in navigator && !PREVIEW) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
