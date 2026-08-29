/* Pet Farm · service worker
   - deixa o app instalável no celular (ícone na tela inicial)
   - guarda a tela pra abrir mesmo sem internet
   - NUNCA guarda chamadas do Supabase: dados sempre frescos */
const VERSAO = 'petfarm-v1';
const ESSENCIAL = ['./', './index.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ESSENCIAL)).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if (e.data === 'atualizar') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                      // salvamentos vão direto pra rede

  const url = new URL(req.url);
  // Supabase (dados e login) nunca é guardado
  if (url.hostname.endsWith('.supabase.co')) return;

  // navegação: tenta a rede, se não tiver internet abre a versão guardada
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(r => {
          const copia = r.clone();
          caches.open(VERSAO).then(c => c.put('./index.html', copia)).catch(() => {});
          return r;
        })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // demais arquivos (biblioteca, fontes): usa o guardado e atualiza por trás
  e.respondWith(
    caches.match(req).then(cache => {
      const rede = fetch(req).then(r => {
        if (r && (r.status === 200 || r.type === 'opaque')) {
          const copia = r.clone();
          caches.open(VERSAO).then(c => c.put(req, copia)).catch(() => {});
        }
        return r;
      }).catch(() => cache);
      return cache || rede;
    })
  );
});
