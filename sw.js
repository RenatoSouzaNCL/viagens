/* Guarda o app no aparelho para funcionar sem internet.
   Ao publicar uma alteração no app, aumente o número da VERSAO. */
const VERSAO = 'vs-app-v2';
const ARQUIVOS = ['./', 'index.html', 'styles.css', 'config.js', 'api.js', 'app.js', 'manifest.webmanifest',
  'bricolage-latin.woff2', 'figtree-latin.woff2',
  'icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Só o app do cliente é guardado; a área da agência e os dados (Supabase) sempre vêm da internet.
self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (/admin|modelo-/.test(url.pathname)) return;
  e.respondWith(caches.open(VERSAO).then(async cache => {
    const salvo = await cache.match(req, {ignoreSearch: true});
    const rede = fetch(req).then(r => { if (r.ok) cache.put(req, r.clone()); return r; }).catch(() => null);
    return salvo || (await rede) || cache.match('index.html');
  }));
});
