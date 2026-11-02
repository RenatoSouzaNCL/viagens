/* Via Singularis Travel · área da agência
   Cadastro de viagens por cliente, roteiro dia a dia, vouchers e envio ao cliente. */
'use strict';

const API = window.VS_API;
const AG = (window.VS_CONFIG || {}).agency || {};
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const MES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const WD = ['dom','seg','ter','qua','qui','sex','sáb'];
const PALETTE = ['#1D4E9E', '#B4472F', '#8E1F2F', '#A64B12', '#13223F', '#1E7B4A', '#6B3FA0', '#0E7C86'];
const MAX_FILE = 5 * 1024 * 1024;

const S = { view: 'login', trips: [], trip: null, data: null, meta: null, vouchers: [], tab: 'geral', dirty: false, open: new Set(), filter: '' };

/* ---------- utilidades ---------- */
const parse = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);
const fmt = s => { if (!s) return ''; const d = parse(s); return `${String(d.getDate()).padStart(2, '0')} ${MES[d.getMonth()]} · ${WD[d.getDay()]}`; };
const fmtFull = s => s ? parse(s).toLocaleDateString('pt-BR') : '';
const dayDate = i => S.data.start ? addDays(S.data.start, i) : '';
const clone = o => JSON.parse(JSON.stringify(o));
const rid = () => Math.random().toString(36).slice(2, 9);

function toast(msg, kind = '') {
  const el = document.createElement('div'); el.className = 'toast ' + kind; el.textContent = msg;
  $('#toasts').append(el); setTimeout(() => el.remove(), 3200);
}
async function guard(fn, okMsg) {
  try { const r = await fn(); if (okMsg) toast(okMsg, 'ok'); return r; }
  catch (e) {
    if (e.status === 401) { S.view = 'login'; render(); }
    toast(e.message || 'Algo deu errado', 'err'); throw e;
  }
}
function getP(path, obj = S.data) { return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj); }
function setP(path, val, obj = S.data) {
  const ks = path.split('.'); const last = ks.pop();
  const parent = ks.reduce((o, k) => o[k], obj); parent[last] = val;
}
function markDirty(v = true) {
  S.dirty = v;
  const b = $('#save'); if (b) { b.disabled = !v; b.textContent = v ? 'Salvar alterações' : 'Tudo salvo'; }
}
addEventListener('beforeunload', e => { if (S.dirty) { e.preventDefault(); e.returnValue = ''; } });

function emptyTrip(title = '', start = '') {
  return { title, headline: [title, ''], summary: '', start, notice: '', stats: [],
    trechos: [{ id: 1, name: title || 'Viagem', cities: '', color: PALETTE[0] }],
    days: [], transfers: [], stays: [], checklist: [], cards: [], timed: [] };
}
function normalizeData(d) {
  const t = Object.assign(emptyTrip(), d || {});
  ['stats', 'trechos', 'days', 'transfers', 'stays', 'checklist', 'cards', 'timed'].forEach(k => { if (!Array.isArray(t[k])) t[k] = []; });
  if (!Array.isArray(t.headline)) t.headline = [t.title || '', ''];
  while (t.headline.length < 2) t.headline.push('');
  t.days.forEach(day => { if (!Array.isArray(day.blocks)) day.blocks = []; day.blocks.forEach(b => { if (b.type !== 'note' && !Array.isArray(b.items)) b.items = []; }); });
  if (!t.trechos.length) t.trechos.push({ id: 1, name: t.title || 'Viagem', cities: '', color: PALETTE[0] });
  return t;
}
// datas fixas (hospedagens, trajetos) acompanham a mudança da data de início
function shiftDates(data, newStart) {
  if (!data.start || !newStart || data.start === newStart) { data.start = newStart || data.start; return; }
  const n = diffDays(data.start, newStart);
  const sh = v => (v ? addDays(v, n) : v);
  data.stays.forEach(s => { s.from = sh(s.from); s.to = sh(s.to); });
  data.transfers.forEach(t => { t.date = sh(t.date); });
  data.start = newStart;
}
function cleanForSave(d) {
  const t = clone(d);
  t.days = t.days.map((day, i) => ({ ...day, n: i + 1, date: t.start ? addDays(t.start, i) : '' }));
  return t;
}
function stats(d) {
  const nights = d.stays.reduce((a, s) => a + ((s.from && s.to) ? Math.max(0, diffDays(s.from, s.to)) : 0), 0);
  return { dias: d.days.length, hospedagens: d.stays.length, noites: nights };
}
const clientLink = code => new URL('index.html?v=' + encodeURIComponent(code), location.href).toString();

/* ---------- campos ---------- */
const fText = (p, label, o = {}) => `<label class="f ${o.cls || ''}"><span>${label}</span><input type="${o.type || 'text'}" data-p="${p}" value="${esc(getP(p) ?? '')}" placeholder="${esc(o.ph || '')}"${o.list ? ` list="${o.list}"` : ''}></label>`;
const fArea = (p, label, o = {}) => `<label class="f ${o.cls || ''}"><span>${label}</span><textarea data-p="${p}" rows="${o.rows || 2}" placeholder="${esc(o.ph || '')}">${esc(getP(p) ?? '')}</textarea></label>`;
const fSel = (p, label, opts, o = {}) => `<label class="f ${o.cls || ''}"><span>${label}</span><select data-p="${p}"${o.num ? ' data-num' : ''}>${opts.map(([v, t]) => `<option value="${esc(v)}"${String(getP(p) ?? '') === String(v) ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
const btn = (act, p, label, cls = '', extra = '') => `<button type="button" class="b ${cls}" data-act="${act}" data-p="${p}"${extra}>${label}</button>`;
const moveBtns = (p, i, len) => `<span class="mv">${btn('up', p, '↑', 'ghost sm', i === 0 ? ' disabled' : '')}${btn('down', p, '↓', 'ghost sm', i === len - 1 ? ' disabled' : '')}</span>`;

/* ---------- telas ---------- */
function render() {
  const v = S.view;
  $('#root').innerHTML = v === 'login' ? viewLogin() : v === 'list' ? viewList() : viewEditor();
  if (v === 'edit') markDirty(S.dirty);
}

function demoBanner() {
  return API.demo ? `<div class="demo"><b>Modo demonstração.</b> Os dados ficam só neste navegador. Para usar com clientes, configure o Supabase no arquivo <code>config.js</code> (veja o guia).</div>` : '';
}

function viewLogin() {
  return `<div class="login"><form id="loginForm" class="panel">
    <div class="brand"><img src="icon.svg" alt=""><div><b>${esc(AG.name || 'Via Singularis Travel')}</b><span>Área da agência</span></div></div>
    ${demoBanner()}
    <label class="f"><span>E-mail</span><input type="email" id="email" autocomplete="username" required value="${esc(API.session()?.email || '')}"></label>
    <label class="f"><span>Senha</span><input type="password" id="password" autocomplete="current-password" ${API.demo ? '' : 'required'}></label>
    <button class="b primary big" type="submit">Entrar</button>
    <p class="hint">${API.demo ? 'Na demonstração, qualquer e-mail e senha funcionam.' : 'Use o e-mail e a senha cadastrados no Supabase.'}</p>
  </form></div>`;
}

function topbar(inner) {
  return `<header class="top"><div class="in"><a class="logo" href="#" data-act="home"><img src="icon.svg" alt=""><span>${esc(AG.name || 'Via Singularis Travel')}</span></a>${inner}
    <button class="b ghost sm" data-act="logout">Sair</button></div></header>`;
}

function viewList() {
  const q = S.filter.toLowerCase();
  const rows = S.trips.filter(t => !q || (t.client_name + ' ' + t.title).toLowerCase().includes(q));
  return topbar('<span class="crumb">Viagens</span>') + `<main class="page">${demoBanner()}
    <div class="listhead"><h1>Viagens dos clientes</h1><button class="b primary" data-act="new">+ Nova viagem</button></div>
    ${S.trips.length > 3 ? `<input class="search" id="search" placeholder="Buscar cliente ou viagem" value="${esc(S.filter)}">` : ''}
    <div id="newbox"></div>
    ${rows.length ? `<div class="trips">${rows.map(t => `<div class="tripcard">
      <div class="who"><b>${esc(t.client_name || 'Sem nome')}</b><span>${esc(t.title || 'Sem título')}</span>
      <small>${t.start_date ? 'Embarque ' + fmtFull(t.start_date) + ' · ' : ''}atualizada ${new Date(t.updated_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</small></div>
      <div class="acts"><button class="b primary sm" data-act="edit" data-id="${t.id}">Editar</button>
      <button class="b sm" data-act="share" data-id="${t.id}">Enviar ao cliente</button>
      <button class="b ghost sm" data-act="dupTrip" data-id="${t.id}">Duplicar</button>
      <button class="b ghost sm danger" data-act="delTrip" data-id="${t.id}">Excluir</button></div></div>`).join('')}</div>`
      : `<div class="empty">${S.trips.length ? 'Nenhuma viagem encontrada.' : 'Nenhuma viagem ainda. Clique em <b>+ Nova viagem</b> para começar (dá para partir do modelo da Península Ibérica).'}</div>`}
  </main>`;
}

function newTripForm() {
  return `<form class="panel newtrip" id="newForm">
    <h2>Nova viagem</h2>
    <div class="grid3">
      <label class="f"><span>Nome do cliente</span><input name="client" required placeholder="Ex.: Maria e João Silva"></label>
      <label class="f"><span>Nome da viagem</span><input name="title" required placeholder="Ex.: Península Ibérica 2027"></label>
      <label class="f"><span>Data de início</span><input type="date" name="start"></label>
    </div>
    <label class="f"><span>Começar a partir de</span><select name="base">
      <option value="blank">Roteiro em branco</option>
      <option value="model:peninsula-iberica-2027">Modelo · Península Ibérica 2027 (24 dias)</option>
      ${S.trips.map(t => `<option value="trip:${t.id}">Copiar de: ${esc(t.client_name)} · ${esc(t.title)}</option>`).join('')}
      <option value="file">Importar arquivo de roteiro (.json)</option>
    </select></label>
    <label class="f" id="fileField" hidden><span>Arquivo de roteiro</span><input type="file" name="file" accept=".json,application/json"></label>
    <p class="hint">Ao usar um modelo ou copiar uma viagem, as datas são ajustadas para a nova data de início. Os vouchers não são copiados.</p>
    <div class="row"><button class="b primary" type="submit">Criar viagem</button><button class="b ghost" type="button" data-act="cancelNew">Cancelar</button></div>
  </form>`;
}

/* ---------- editor ---------- */
const TABS = [['geral', 'Geral'], ['dias', 'Dias'], ['trechos', 'Trechos'], ['hosp', 'Hospedagens'], ['traj', 'Trajetos'], ['antes', 'Antes de embarcar'], ['vouchers', 'Vouchers'], ['enviar', 'Enviar ao cliente']];

function viewEditor() {
  const d = S.data, st = stats(d);
  return topbar(`<span class="crumb"><a href="#" data-act="home">Viagens</a> › ${esc(S.meta.client_name || 'Sem nome')}</span>`) + `
  <div class="edbar"><div class="in">
    <div class="ttl"><b>${esc(d.title || 'Sem título')}</b><span>${esc(S.meta.client_name)} · ${st.dias} dias${d.start ? ' · ' + fmtFull(d.start) : ''} · ${S.vouchers.length} voucher${S.vouchers.length === 1 ? '' : 's'}</span></div>
    <div class="row"><button class="b ghost" data-act="preview">Prévia</button><button class="b primary" id="save" data-act="save" disabled>Tudo salvo</button></div>
  </div>
  <nav class="tabs">${TABS.map(([k, l]) => `<button class="tab${S.tab === k ? ' on' : ''}" data-act="tab" data-tab="${k}">${l}${k === 'dias' ? ` <i>${st.dias}</i>` : k === 'vouchers' ? ` <i>${S.vouchers.length}</i>` : k === 'hosp' ? ` <i>${st.hospedagens}</i>` : ''}</button>`).join('')}</nav></div>
  <main class="page">${demoBanner()}${({ geral: tabGeral, dias: tabDias, trechos: tabTrechos, hosp: tabHosp, traj: tabTraj, antes: tabAntes, vouchers: tabVouchers, enviar: tabEnviar })[S.tab]()}</main>
  <datalist id="dl-dates">${d.days.map((_, i) => `<option value="${dayDate(i)}">Dia ${i + 1}</option>`).join('')}</datalist>`;
}

function tabGeral() {
  return `<section class="panel"><h2>Cliente e viagem</h2>
    <div class="grid2">
      <label class="f"><span>Nome do cliente (aparece no app)</span><input data-meta="client_name" value="${esc(S.meta.client_name)}"></label>
      ${fText('title', 'Nome da viagem')}
      <label class="f"><span>Data de início (dia 1)</span><input type="date" data-start value="${esc(S.data.start || '')}"></label>
      <div class="f"><span>Fim</span><div class="ro">${S.data.days.length ? fmtFull(dayDate(S.data.days.length - 1)) + ` (dia ${S.data.days.length})` : 'Adicione os dias na aba Dias'}</div></div>
    </div>
    <p class="hint">Mudar a data de início ajusta automaticamente as datas de todos os dias, hospedagens e trajetos.</p></section>
  <section class="panel"><h2>Capa do app</h2>
    <div class="grid2">${fText('headline.0', 'Título grande · linha 1', { ph: 'Portugal' })}${fText('headline.1', 'Título grande · linha 2 (em dourado)', { ph: '& Espanha' })}</div>
    ${fArea('summary', 'Resumo da viagem', { rows: 3 })}
    ${fArea('notice', 'Aviso importante (faixa amarela, opcional)', { rows: 2 })}
    <h3>Números da capa</h3><p class="hint">Ex.: 24 dias · 10 cidades · 8 hospedagens · 2 países.</p>
    ${S.data.stats.map((s, i) => `<div class="line">${fText(`stats.${i}.value`, 'Número', { cls: 'w1' })}${fText(`stats.${i}.label`, 'Legenda')}${moveBtns('stats.' + i, i, S.data.stats.length)}${btn('del', 'stats.' + i, '✕', 'ghost sm danger')}</div>`).join('')}
    <div class="row">${btn('add', 'stats', '+ Número', 'sm')}${btn('autoStats', '', 'Preencher automaticamente', 'ghost sm')}</div></section>
  <section class="panel"><h2>Arquivo do roteiro</h2><p class="hint">Guarde uma cópia de segurança ou traga um roteiro preparado em outro lugar.</p>
    <div class="row">${btn('export', '', 'Baixar cópia (.json)', 'sm')}<label class="b sm ghost filebtn">Substituir por arquivo…<input type="file" id="importFile" accept=".json,application/json"></label></div></section>`;
}

const NOTE_KINDS = [['tip', 'Dica'], ['alert', 'Atenção'], ['star', 'Destaque'], ['night', 'À noite'], ['checkin', 'Check-in'], ['transport', 'Transporte'], ['info', 'Informação'], ['walk', 'Caminhada']];
const BLOCK_NAMES = { steps: 'Como chegar / deslocamento', stops: 'Roteiro do dia (paradas numeradas)', places: 'Lista de lugares (onde comer, supermercados…)', note: 'Destaque / dica / aviso' };

function blockEditor(p, b, i, len) {
  const head = `<div class="bhead"><span class="btype">${BLOCK_NAMES[b.type] || b.type}</span>${moveBtns(p, i, len)}${btn('dup', p, 'Duplicar', 'ghost sm')}${btn('del', p, '✕', 'ghost sm danger')}</div>`;
  if (b.type === 'note') {
    if (b.kind === 'y2027') b.kind = 'alert';
    return `<div class="block note">${head}<div class="grid3">${fSel(p + '.kind', 'Tipo', NOTE_KINDS)}${fText(p + '.label', 'Etiqueta', { ph: 'Dica' })}${fText(p + '.title', 'Título')}</div>${fArea(p + '.text', 'Texto')}</div>`;
  }
  const isSteps = b.type === 'steps';
  const items = b.items.map((it, k) => `<div class="item">
      <span class="num">${b.type === 'stops' ? k + 1 : '•'}</span>
      ${fText(`${p}.items.${k}.name`, b.type === 'stops' ? 'Lugar' : isSteps ? 'O quê' : 'Nome', { cls: 'grow' })}
      ${fText(`${p}.items.${k}.detail`, isSteps ? 'Detalhe' : 'Endereço / detalhe', { cls: 'grow2' })}
      ${isSteps ? fText(`${p}.items.${k}.time`, 'Horário', { cls: 'w2', ph: '17:00 → 20:15' }) : ''}
      ${moveBtns(`${p}.items.${k}`, k, b.items.length)}${btn('del', `${p}.items.${k}`, '✕', 'ghost sm danger')}</div>`).join('');
  return `<div class="block">${head}<div class="grid2">${fText(p + '.title', 'Título da seção')}${b.type === 'stops' ? fText(p + '.intro', 'Resumo da caminhada (opcional)', { ph: 'Roteiro a pé · 2,5 km · 35 min' }) : ''}</div>
    <div class="items">${items}</div>${btn('add', p + '.items', '+ ' + (b.type === 'stops' ? 'Parada' : isSteps ? 'Etapa' : 'Lugar'), 'sm')}
    ${b.type !== 'steps' ? '<p class="hint">Endereço ajuda o link do Google Maps a achar o lugar certo.</p>' : ''}</div>`;
}

function daySummary(i) {
  const day = S.data.days[i];
  return `<b>Dia ${i + 1}</b>${S.data.start ? ` · ${fmt(dayDate(i))}` : ''} · ${esc(day.place || 'sem local')}<em>${esc(day.title || '')}</em>`;
}
function tabDias() {
  const d = S.data;
  const trOpts = d.trechos.map(t => [t.id, `${String(t.id).padStart(2, '0')} · ${t.name || 'Trecho'}`]);
  return `<div class="listhead"><h2>Roteiro dia a dia</h2><div class="row">${btn('expandAll', '', 'Abrir todos', 'ghost sm')}${btn('collapseAll', '', 'Fechar todos', 'ghost sm')}</div></div>
  ${d.start ? '' : '<div class="demo">Defina a <b>data de início</b> na aba Geral para as datas aparecerem.</div>'}
  ${d.days.map((day, i) => { const p = 'days.' + i; const c = (d.trechos.find(t => t.id === day.trecho) || d.trechos[0] || {}).color;
    return `<details class="day" data-i="${i}" style="--c:${esc(c)}"${S.open.has(i) ? ' open' : ''}><summary data-sum="${i}">${daySummary(i)}</summary>
    <div class="daybody">
      <div class="row end">${moveBtns(p, i, d.days.length)}${btn('dup', p, 'Duplicar dia', 'ghost sm')}${btn('del', p, 'Excluir dia', 'ghost sm danger')}</div>
      <div class="grid4">${fSel(p + '.trecho', 'Trecho', trOpts, { num: true })}${fText(p + '.place', 'Local (etiqueta)', { ph: 'Lisboa → Porto' })}${fText(p + '.mapCity', 'Cidade para o mapa', { ph: 'Porto' })}</div>
      ${fText(p + '.title', 'Frase do dia', { ph: 'Bem-vindo a Portugal! Hoje é dia de subir até o Porto' })}
      <div class="blocks">${day.blocks.map((b, k) => blockEditor(`${p}.blocks.${k}`, b, k, day.blocks.length)).join('')}</div>
      <div class="addblocks"><span>Adicionar:</span>${btn('addBlock', p + '.blocks', 'Como chegar', 'sm', ' data-type="steps"')}${btn('addBlock', p + '.blocks', 'Roteiro do dia', 'sm', ' data-type="stops"')}${btn('addBlock', p + '.blocks', 'Onde comer / lugares', 'sm', ' data-type="places"')}${btn('addBlock', p + '.blocks', 'Dica / aviso', 'sm', ' data-type="note"')}</div>
    </div></details>`; }).join('')}
  <div class="row">${btn('addDay', 'days', '+ Adicionar dia', 'primary')}</div>`;
}

function tabTrechos() {
  const d = S.data;
  return `<section class="panel"><h2>Trechos da viagem</h2><p class="hint">Cada trecho tem uma cor no app (ex.: Portugal, Barcelona, Andaluzia). Escolha o trecho de cada dia na aba Dias.</p>
  ${d.trechos.map((t, i) => { const p = 'trechos.' + i; const n = d.days.filter(x => x.trecho === t.id).length;
    return `<div class="line"><span class="swatch" style="background:${esc(t.color)}">${String(t.id).padStart(2, '0')}</span>${fText(p + '.name', 'Nome', { ph: 'Portugal' })}${fText(p + '.cities', 'Cidades', { ph: 'Porto · Lisboa · Sintra' })}
      <label class="f w2"><span>Cor</span><select data-p="${p}.color">${PALETTE.map(c => `<option value="${c}"${c === t.color ? ' selected' : ''} style="background:${c};color:#fff">${c}</option>`).join('')}</select></label>
      <span class="cnt">${n} dia${n === 1 ? '' : 's'}</span>${btn('delTrecho', p, '✕', 'ghost sm danger', d.trechos.length === 1 ? ' disabled' : '')}</div>`; }).join('')}
  ${btn('addTrecho', 'trechos', '+ Trecho', 'sm')}</section>`;
}

function tabHosp() {
  const d = S.data;
  return `<section class="panel"><h2>Hospedagens</h2>
  ${d.stays.map((s, i) => { const p = 'stays.' + i; const n = s.from && s.to ? diffDays(s.from, s.to) : 0;
    return `<div class="card"><div class="row end"><b class="grow">${esc(s.name || 'Nova hospedagem')}${n > 0 ? ` · ${n} noite${n > 1 ? 's' : ''}` : ''}</b>${moveBtns(p, i, d.stays.length)}${btn('del', p, '✕', 'ghost sm danger')}</div>
    <div class="grid3">${fText(p + '.city', 'Cidade')}${fText(p + '.name', 'Hotel / hostel')}${fText(p + '.address', 'Endereço')}
    ${fText(p + '.from', 'Check-in', { type: 'date' })}${fText(p + '.to', 'Check-out', { type: 'date' })}${fText(p + '.confirmation', 'Nº da reserva (aparece para o cliente)')}
    ${fText(p + '.url', 'Link (site ou reserva)', { ph: 'https://' })}${fText(p + '.site', 'Nome do link', { ph: 'Booking' })}</div></div>`; }).join('') || '<p class="hint">Nenhuma hospedagem.</p>'}
  ${btn('add', 'stays', '+ Hospedagem', 'sm')}</section>`;
}

function tabTraj() {
  const d = S.data;
  return `<section class="panel"><h2>Deslocamentos entre cidades</h2><p class="hint">Aparecem na aba "Trajetos" do app, em ordem de data.</p>
  ${d.transfers.map((t, i) => { const p = 'transfers.' + i;
    return `<div class="line">${fText(p + '.date', 'Data', { type: 'date', cls: 'w2' })}${fText(p + '.route', 'Trajeto', { ph: 'Lisboa Oriente → Porto Campanhã', cls: 'grow' })}${fText(p + '.mode', 'Transporte', { ph: 'Ônibus Flixbus' })}${fText(p + '.time', 'Horário', { ph: '17:00 → 20:15', cls: 'w2' })}${moveBtns(p, i, d.transfers.length)}${btn('del', p, '✕', 'ghost sm danger')}</div>`; }).join('') || '<p class="hint">Nenhum deslocamento.</p>'}
  ${btn('add', 'transfers', '+ Deslocamento', 'sm')}</section>`;
}

function tabAntes() {
  const d = S.data;
  return `<section class="panel"><h2>Lista "Antes de embarcar"</h2><p class="hint">O cliente marca cada item no app e pode colar o código da confirmação. Deixe vazio se a agência cuida de tudo.</p>
  ${d.checklist.map((c, i) => { const p = 'checklist.' + i;
    return `<div class="line">${fText(p + '.text', 'Item', { cls: 'grow' })}${fText(p + '.url', 'Link de compra', { ph: 'https://' })}${fText(p + '.site', 'Nome do link', { cls: 'w2' })}${moveBtns(p, i, d.checklist.length)}${btn('del', p, '✕', 'ghost sm danger')}</div>`; }).join('') || '<p class="hint">Lista vazia.</p>'}
  ${btn('add', 'checklist', '+ Item', 'sm')}</section>
  <section class="panel"><h2>Cartões de transporte</h2>
  ${d.cards.map((c, i) => `<div class="line">${fText(`cards.${i}.city`, 'Cidade', { cls: 'w2' })}${fText(`cards.${i}.text`, 'Orientação', { cls: 'grow' })}${btn('del', 'cards.' + i, '✕', 'ghost sm danger')}</div>`).join('')}
  ${btn('add', 'cards', '+ Cartão', 'sm')}</section>
  <section class="panel"><h2>Atrações com horário marcado</h2>
  ${d.timed.map((c, i) => `<div class="line">${fText('timed.' + i, 'Atração', { cls: 'grow' })}${btn('del', 'timed.' + i, '✕', 'ghost sm danger')}</div>`).join('')}
  ${btn('add', 'timed', '+ Atração', 'sm')}</section>`;
}

function dayOptions(sel) {
  return `<option value="">Viagem toda (sem dia)</option>` + S.data.days.map((day, i) => `<option value="${i + 1}"${sel === i + 1 ? ' selected' : ''}>Dia ${i + 1}${S.data.start ? ' · ' + fmt(dayDate(i)) : ''} · ${esc(day.place)}</option>`).join('');
}
function tabVouchers() {
  const vs = S.vouchers;
  return `<section class="panel"><h2>Enviar voucher</h2>
    <form id="vForm" class="grid3">
      <label class="f"><span>Arquivo (PDF ou imagem, até 5 MB)</span><input type="file" name="file" accept="application/pdf,image/*" required></label>
      <label class="f"><span>Título</span><input name="title" placeholder="Ex.: Ingresso Alhambra"></label>
      <label class="f"><span>Dia da viagem</span><select name="day">${dayOptions(null)}</select></label>
      <div class="row"><button class="b primary" type="submit">Enviar voucher</button></div>
    </form>
    <p class="hint">O voucher aparece na aba "Vouchers" do app e, se tiver dia, também no roteiro daquele dia. Fica salvo no celular do cliente para abrir sem internet.</p></section>
  <section class="panel"><h2>Vouchers desta viagem (${vs.length})</h2>
    ${vs.map(v => `<div class="line voucher" data-vid="${v.id}">
      <span class="vic">${/pdf/.test(v.mime) ? 'PDF' : 'IMG'}</span>
      <label class="f grow"><span>Título</span><input data-vtitle="${v.id}" value="${esc(v.title)}"></label>
      <label class="f"><span>Dia</span><select data-vday="${v.id}">${dayOptions(v.day_n)}</select></label>
      <span class="cnt">${esc(v.file_name || '')}<br>${v.size ? Math.max(1, Math.round(v.size / 1024)) + ' KB' : ''}</span>
      <button class="b ghost sm" data-act="viewV" data-id="${v.id}">Ver</button>
      <button class="b ghost sm danger" data-act="delV" data-id="${v.id}">✕</button></div>`).join('') || '<p class="hint">Nenhum voucher enviado ainda.</p>'}
  </section>`;
}

function shareMessage() {
  const t = S.trip;
  return `Olá, ${S.meta.client_name || ''}! Sua viagem "${S.data.title}" já está no app da ${AG.name || 'Via Singularis Travel'} ✈️

1) Abra este link no celular:
${clientLink(t.code)}

2) Digite o código de acesso: ${t.pin}

3) Adicione à tela inicial:
• Android (Chrome): menu ⋮ › Adicionar à tela inicial
• iPhone (Safari): Compartilhar › Adicionar à Tela de Início

O roteiro e os vouchers ficam salvos no celular e funcionam sem internet.`;
}
function tabEnviar() {
  const t = S.trip;
  return `<section class="panel"><h2>Enviar ao cliente</h2>
    ${S.dirty ? '<div class="demo">Há alterações não salvas. Clique em <b>Salvar alterações</b> antes de enviar.</div>' : ''}
    <div class="grid2"><div class="f"><span>Link exclusivo</span><div class="ro mono">${esc(clientLink(t.code))}</div></div>
    <div class="f"><span>Código de acesso</span><div class="ro mono pin">${esc(t.pin)}</div></div></div>
    <label class="f"><span>Mensagem pronta</span><textarea id="msg" rows="13" readonly>${esc(shareMessage())}</textarea></label>
    <div class="row">${btn('copyMsg', '', 'Copiar mensagem', 'primary')}<a class="b" href="https://wa.me/?text=${encodeURIComponent(shareMessage())}" target="_blank" rel="noopener">Abrir no WhatsApp</a>${btn('copyLink', '', 'Copiar só o link', 'ghost')}<a class="b ghost" href="${esc(clientLink(t.code))}" target="_blank" rel="noopener">Abrir como cliente</a></div></section>
  <section class="panel"><h2>Segurança do acesso</h2><p class="hint">Se o link ou o código forem parar com quem não deveria, gere novos. O acesso antigo deixa de funcionar e o cliente precisa receber a mensagem de novo.</p>
    <div class="row">${btn('newPin', '', 'Gerar novo código', 'ghost')}${btn('newCode', '', 'Gerar novo link', 'ghost danger')}</div></section>`;
}

/* ---------- carregamento ---------- */
async function loadList() {
  S.trips = await guard(() => API.listTrips());
  S.view = 'list'; render();
}
async function openTrip(id, tab = 'geral') {
  const row = await guard(() => API.getTrip(id));
  S.trip = row; S.data = normalizeData(row.data); S.meta = { client_name: row.client_name };
  S.vouchers = await guard(() => API.listVouchers(id));
  S.tab = tab; S.dirty = false; S.open = new Set(); S.view = 'edit'; render(); scrollTo(0, 0);
}
async function save() {
  const data = cleanForSave(S.data);
  const row = await guard(() => API.updateTrip(S.trip.id, { client_name: S.meta.client_name.trim(), title: data.title, start_date: data.start || null, data }), 'Viagem salva');
  S.trip = row; markDirty(false);
  if (S.tab === 'enviar') render();
}
function leaveOk() { return !S.dirty || confirm('Há alterações não salvas. Sair mesmo assim?'); }

async function createTrip(form) {
  const f = new FormData(form);
  const client = f.get('client').trim(), title = f.get('title').trim(), start = f.get('start') || '', base = f.get('base');
  let data;
  if (base === 'blank') data = emptyTrip(title, start);
  else if (base.startsWith('model:')) {
    const r = await fetch('modelo-' + base.slice(6) + '.json'); if (!r.ok) return toast('Modelo não encontrado', 'err');
    data = normalizeData(await r.json());
  } else if (base.startsWith('trip:')) data = normalizeData((await guard(() => API.getTrip(base.slice(5)))).data);
  else {
    const file = f.get('file'); if (!file || !file.size) return toast('Escolha o arquivo de roteiro', 'err');
    try { data = normalizeData(JSON.parse(await file.text())); } catch { return toast('Arquivo inválido', 'err'); }
  }
  if (base !== 'blank') { data.title = title; if (data.headline[0] === '' && data.headline[1] === '') data.headline = [title, '']; if (start) shiftDates(data, start); }
  const row = await guard(() => API.createTrip({ code: API.newCode(), pin: API.newPin(), client_name: client, title, start_date: data.start || null, data: cleanForSave(data) }), 'Viagem criada');
  await openTrip(row.id, base === 'blank' ? 'geral' : 'dias');
}

/* ---------- ações ---------- */
const TPL = {
  stats: () => ({ value: '', label: '' }),
  stays: () => ({ city: '', name: '', address: '', from: '', to: '', confirmation: '', url: '', site: '' }),
  transfers: () => ({ date: '', route: '', mode: '', time: '' }),
  checklist: () => ({ id: 'i' + rid(), text: '', url: '', site: '' }),
  cards: () => ({ city: '', text: '' }),
  timed: () => '',
  items: () => ({ name: '', detail: '', time: '' }),
  steps: () => ({ type: 'steps', title: 'Como chegar', items: [TPL.items()] }),
  stops: () => ({ type: 'stops', title: 'Roteiro do dia', intro: '', items: [{ name: '', detail: '' }] }),
  places: () => ({ type: 'places', title: 'Onde comer', items: [{ name: '', detail: '' }] }),
  note: () => ({ type: 'note', kind: 'tip', label: 'Dica', title: '', text: '' }),
};
const parentOf = p => { const ks = p.split('.'); const i = +ks.pop(); return { arr: getP(ks.join('.')), i }; };

const ACTIONS = {
  async home() { if (S.view === 'edit' && !leaveOk()) return; S.dirty = false; await loadList(); },
  async logout() { if (!leaveOk()) return; S.dirty = false; await API.logout(); S.view = 'login'; render(); },
  new() { $('#newbox').innerHTML = newTripForm(); $('#newForm [name=client]').focus(); },
  cancelNew() { $('#newbox').innerHTML = ''; },
  async edit(el) { await openTrip(el.dataset.id); },
  async share(el) { await openTrip(el.dataset.id, 'enviar'); },
  async dupTrip(el) {
    const src = await guard(() => API.getTrip(el.dataset.id));
    const row = await guard(() => API.createTrip({ code: API.newCode(), pin: API.newPin(), client_name: src.client_name + ' (cópia)', title: src.title, start_date: src.start_date, data: src.data }), 'Viagem duplicada (sem vouchers)');
    await openTrip(row.id);
  },
  async delTrip(el) {
    const t = S.trips.find(x => x.id === el.dataset.id);
    if (!confirm(`Excluir a viagem de ${t.client_name} (${t.title})? Os vouchers também serão apagados e o link deixa de funcionar.`)) return;
    await guard(() => API.deleteTrip(t.id), 'Viagem excluída'); await loadList();
  },
  tab(el) { S.tab = el.dataset.tab; render(); scrollTo(0, 0); },
  save,
  preview() {
    API.ls.set('vs-preview', { data: cleanForSave(S.data), client_name: S.meta.client_name, vouchers: S.vouchers });
    window.open('index.html?preview=1#/', '_blank');
  },
  add(el) { const arr = getP(el.dataset.p); const key = el.dataset.p.split('.').pop(); arr.push(TPL[key] ? TPL[key]() : {}); markDirty(); render(); },
  addBlock(el) { getP(el.dataset.p).push(TPL[el.dataset.type]()); markDirty(); render(); },
  addDay() {
    const d = S.data; const last = d.days[d.days.length - 1];
    d.days.push({ trecho: last ? last.trecho : d.trechos[0].id, place: last ? last.place : '', mapCity: last ? last.mapCity : '', title: '', blocks: [TPL.stops()] });
    S.open.add(d.days.length - 1); markDirty(); render();
    document.querySelector(`details.day[data-i="${d.days.length - 1}"]`)?.scrollIntoView({ block: 'start' });
  },
  del(el) {
    const { arr, i } = parentOf(el.dataset.p);
    const isDay = /^days\.\d+$/.test(el.dataset.p), isBlock = /\.blocks\.\d+$/.test(el.dataset.p);
    if ((isDay || isBlock) && !confirm(isDay ? `Excluir o dia ${i + 1} inteiro?` : 'Excluir esta seção do dia?')) return;
    arr.splice(i, 1);
    if (isDay) { S.open = new Set([...S.open].filter(x => x !== i).map(x => (x > i ? x - 1 : x))); fixVoucherDays(i + 1, null); }
    markDirty(); render();
  },
  dup(el) {
    const { arr, i } = parentOf(el.dataset.p); arr.splice(i + 1, 0, clone(arr[i]));
    if (/^days\.\d+$/.test(el.dataset.p)) { S.open = new Set([...S.open].map(x => (x > i ? x + 1 : x))); S.open.add(i + 1); }
    markDirty(); render();
  },
  up(el) { move(el.dataset.p, -1); },
  down(el) { move(el.dataset.p, 1); },
  addTrecho() { const d = S.data; const id = Math.max(0, ...d.trechos.map(t => t.id)) + 1; d.trechos.push({ id, name: '', cities: '', color: PALETTE[(id - 1) % PALETTE.length] }); markDirty(); render(); },
  delTrecho(el) {
    const { arr, i } = parentOf(el.dataset.p); const gone = arr[i];
    if (!confirm(`Excluir o trecho "${gone.name}"? Os dias dele passam para o trecho anterior.`)) return;
    arr.splice(i, 1); const to = (arr[Math.max(0, i - 1)] || arr[0]).id;
    S.data.days.forEach(day => { if (day.trecho === gone.id) day.trecho = to; });
    markDirty(); render();
  },
  autoStats() {
    const d = S.data, st = stats(d);
    const cities = new Set(d.stays.map(s => s.city).filter(Boolean)).size;
    const pl = (n, a, b) => ({ value: String(n), label: n === 1 ? a : b });
    d.stats = [pl(st.dias, 'dia', 'dias')];
    if (cities) d.stats.push(pl(cities, 'cidade', 'cidades'));
    if (st.hospedagens) d.stats.push(pl(st.hospedagens, 'hospedagem', 'hospedagens'));
    if (st.noites) d.stats.push(pl(st.noites, 'noite', 'noites'));
    markDirty(); render();
  },
  expandAll() { S.open = new Set(S.data.days.map((_, i) => i)); render(); },
  collapseAll() { S.open = new Set(); render(); },
  export() {
    const blob = new Blob([JSON.stringify(cleanForSave(S.data), null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `roteiro-${(S.meta.client_name || 'cliente').replace(/\W+/g, '-').toLowerCase()}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  },
  async viewV(el) {
    const w = window.open('', '_blank');
    const v = S.vouchers.find(x => x.id === el.dataset.id);
    const b64 = await guard(() => API.voucherContent(v.id));
    const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([u], { type: v.mime }));
    if (w) w.location = url; else window.open(url, '_blank');
  },
  async delV(el) {
    const v = S.vouchers.find(x => x.id === el.dataset.id);
    if (!confirm(`Excluir o voucher "${v.title}"?`)) return;
    await guard(() => API.deleteVoucher(v.id), 'Voucher excluído');
    S.vouchers = S.vouchers.filter(x => x.id !== v.id); render();
  },
  async copyMsg() { await copy(shareMessage(), 'Mensagem copiada'); },
  async copyLink() { await copy(clientLink(S.trip.code), 'Link copiado'); },
  async newPin() {
    if (!confirm('Gerar um novo código de acesso? O código atual deixa de funcionar.')) return;
    S.trip = await guard(() => API.updateTrip(S.trip.id, { pin: API.newPin() }), 'Novo código gerado'); render();
  },
  async newCode() {
    if (!confirm('Gerar um novo link? O link atual deixa de funcionar e o cliente precisa receber o novo.')) return;
    S.trip = await guard(() => API.updateTrip(S.trip.id, { code: API.newCode() }), 'Novo link gerado'); render();
  },
};
function move(p, dir) {
  const { arr, i } = parentOf(p); const j = i + dir; if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
  if (/^days\.\d+$/.test(p)) {
    const oi = S.open.has(i), oj = S.open.has(j); S.open.delete(i); S.open.delete(j); if (oi) S.open.add(j); if (oj) S.open.add(i);
    swapVoucherDays(i + 1, j + 1);
  }
  markDirty(); render();
}
// vouchers acompanham o dia quando dias são movidos ou excluídos
function swapVoucherDays(a, b) {
  S.vouchers.forEach(v => {
    const nd = v.day_n === a ? b : v.day_n === b ? a : null;
    if (nd) { v.day_n = nd; API.updateVoucher(v.id, { day_n: nd }).catch(() => toast('Não foi possível atualizar o dia de um voucher', 'err')); }
  });
}
function fixVoucherDays(removed) {
  S.vouchers.forEach(v => {
    if (v.day_n == null) return;
    const nd = v.day_n === removed ? null : v.day_n > removed ? v.day_n - 1 : v.day_n;
    if (nd !== v.day_n) { v.day_n = nd; API.updateVoucher(v.id, { day_n: nd }).catch(() => toast('Não foi possível atualizar o dia de um voucher', 'err')); }
  });
}
async function copy(text, ok) {
  try { await navigator.clipboard.writeText(text); toast(ok, 'ok'); }
  catch { const m = $('#msg'); if (m) { m.select(); document.execCommand('copy'); toast(ok, 'ok'); } else toast('Copie manualmente', 'err'); }
}
const fileToB64 = file => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(file); });

/* ---------- eventos ---------- */
document.addEventListener('click', async e => {
  const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
  e.preventDefault();
  const fn = ACTIONS[el.dataset.act]; if (!fn) return;
  el.disabled = true;
  try { await fn(el); } catch { /* aviso já mostrado */ } finally { if (document.body.contains(el)) el.disabled = false; }
});
document.addEventListener('input', e => {
  const el = e.target;
  if (el.id === 'search') { S.filter = el.value; const pos = el.selectionStart; render(); const s = $('#search'); s.focus(); s.setSelectionRange(pos, pos); return; }
  if (el.dataset.meta) { S.meta[el.dataset.meta] = el.value; markDirty(); return; }
  if (el.dataset.p && el.tagName !== 'SELECT') {
    setP(el.dataset.p, el.value); markDirty();
    const m = el.dataset.p.match(/^days\.(\d+)\.(place|title)$/); if (m) { const s = document.querySelector(`[data-sum="${m[1]}"]`); if (s) s.innerHTML = daySummary(+m[1]); }
  }
});
document.addEventListener('change', async e => {
  const el = e.target;
  if (el.dataset.p && el.tagName === 'SELECT') {
    const v = el.hasAttribute('data-num') ? Number(el.value) : el.value; setP(el.dataset.p, v); markDirty();
    if (/\.kind$/.test(el.dataset.p)) { const lp = el.dataset.p.replace(/kind$/, 'label'); const k = NOTE_KINDS.find(x => x[0] === v); if (k) { setP(lp, k[1]); } }
    if (/\.trecho$|\.color$|\.kind$/.test(el.dataset.p)) render();
    return;
  }
  if (el.hasAttribute('data-start')) { shiftDates(S.data, el.value); markDirty(); render(); toast('Datas ajustadas para o novo início', 'ok'); return; }
  if (el.name === 'base') { const ff = $('#fileField'); if (ff) ff.hidden = el.value !== 'file'; return; }
  if (el.id === 'importFile' && el.files[0]) {
    try {
      const data = normalizeData(JSON.parse(await el.files[0].text()));
      if (!confirm('Substituir o roteiro desta viagem pelo conteúdo do arquivo? (Os vouchers continuam.)')) return;
      S.data = data; markDirty(); render(); toast('Roteiro importado. Confira e salve.', 'ok');
    } catch { toast('Arquivo inválido', 'err'); }
    return;
  }
  if (el.dataset.vtitle) { const id = el.dataset.vtitle; const r = await guard(() => API.updateVoucher(id, { title: el.value.trim() || 'Voucher' }), 'Voucher atualizado'); Object.assign(S.vouchers.find(v => v.id === id), r); return; }
  if (el.dataset.vday !== undefined && el.matches('[data-vday]')) { const id = el.dataset.vday; const n = el.value ? Number(el.value) : null; const r = await guard(() => API.updateVoucher(id, { day_n: n }), 'Voucher atualizado'); Object.assign(S.vouchers.find(v => v.id === id), r); return; }
});
document.addEventListener('toggle', e => {
  const d = e.target; if (!d.matches || !d.matches('details.day')) return;
  const i = +d.dataset.i; if (d.open) S.open.add(i); else S.open.delete(i);
}, true);
document.addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target, b = f.querySelector('[type=submit]'); if (b) b.disabled = true;
  try {
    if (f.id === 'loginForm') {
      await guard(() => API.login($('#email').value.trim(), $('#password').value));
      if (!(await guard(() => API.isAdmin()))) { await API.logout(); toast('Este e-mail não tem acesso à área da agência.', 'err'); render(); return; }
      await loadList();
    } else if (f.id === 'newForm') await createTrip(f);
    else if (f.id === 'vForm') await uploadVoucher(f);
  } catch { /* aviso já mostrado */ } finally { if (b && document.body.contains(b)) b.disabled = false; }
});
async function uploadVoucher(f) {
  const fd = new FormData(f); const file = fd.get('file');
  if (!file || !file.size) return toast('Escolha um arquivo', 'err');
  if (file.size > MAX_FILE) return toast('Arquivo maior que 5 MB. Reduza o tamanho e tente de novo.', 'err');
  const b64 = await fileToB64(file);
  const title = (fd.get('title') || '').trim() || file.name.replace(/\.[^.]+$/, '');
  const row = await guard(() => API.addVoucher({ trip_id: S.trip.id, title, day_n: fd.get('day') ? Number(fd.get('day')) : null, file_name: file.name, mime: file.type || 'application/octet-stream', size: file.size, content_b64: b64 }), 'Voucher enviado');
  S.vouchers.push(row); S.vouchers.sort((a, b) => (a.day_n ?? -1) - (b.day_n ?? -1)); render();
}

/* ---------- início ---------- */
(async function boot() {
  if (API.session()) { try { if (await API.isAdmin()) return loadList(); } catch { /* sessão vencida */ } }
  S.view = 'login'; render();
})();
