/* Forja Gym - Service Worker (versión: fullscreen)
   Estrategias:
   - Navegación (HTML): red primero, si falla -> caché (funciona offline).
   - Archivos propios (CSS, JS, imágenes, íconos): caché primero.
   - Fuentes e íconos externos (Google Fonts, Font Awesome): caché y actualización en segundo plano. */

const PREFIJO = "forja-fullscreen-";
const VERSION = "v1";
const CACHE_ESTATICO = PREFIJO + "estatico-" + VERSION;
const CACHE_EXTERNO  = PREFIJO + "externo-" + VERSION;

const PRECACHE = [
    "./",
    "./index.html",
    "./manifest.json",
    "./css/estilos.css",
    "./js/app.js",
    "./js/pwa.js",
    "./img/cardio.svg",
    "./img/clases.svg",
    "./img/fuerza.svg",
    "./img/funcional.svg",
    "./img/hero.svg",
    "./img/logo.svg",
    "./img/recuperacion.svg",
    "./icons/icon-192.png",
    "./icons/icon-512.png",
    "./icons/icon-maskable-512.png",
    "./icons/apple-touch-icon.png",
    "./icons/favicon-32.png"
  ];

const EXTERNOS = [
  "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Barlow:wght@400;500;600&display=swap",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
];

// Instalación: guarda el "app shell" en Cache Storage
self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const estatico = await caches.open(CACHE_ESTATICO);
    await estatico.addAll(PRECACHE);
    const externo = await caches.open(CACHE_EXTERNO);
    await Promise.all(EXTERNOS.map(url =>
      fetch(url, { mode: "no-cors" }).then(r => externo.put(url, r)).catch(() => {})));
    await self.skipWaiting();
  })());
});

// Activación: borra solo cachés viejos de ESTA versión (las otras 3 versiones comparten origen)
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const nombres = await caches.keys();
    await Promise.all(nombres
      .filter(n => n.startsWith(PREFIJO) && n !== CACHE_ESTATICO && n !== CACHE_EXTERNO)
      .map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // 1. Páginas: red primero, respaldo en caché
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const resp = await fetch(req);
        const cache = await caches.open(CACHE_ESTATICO);
        cache.put("./index.html", resp.clone());
        return resp;
      } catch {
        return (await caches.match("./index.html", { ignoreSearch: true })) ||
               new Response("<h1>Sin conexión</h1>", { headers: { "Content-Type": "text/html; charset=utf-8" } });
      }
    })());
    return;
  }

  // 2. Archivos del mismo origen: caché primero
  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const enCache = await caches.match(req, { ignoreSearch: true });
      if (enCache) return enCache;
      try {
        const resp = await fetch(req);
        if (resp.ok) (await caches.open(CACHE_ESTATICO)).put(req, resp.clone());
        return resp;
      } catch {
        return new Response("", { status: 504, statusText: "Sin conexión" });
      }
    })());
    return;
  }

  // 3. Recursos externos (fuentes, Font Awesome): stale-while-revalidate
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_EXTERNO);
    const enCache = await cache.match(req);
    const deRed = fetch(req).then(resp => {
      if (resp && (resp.ok || resp.type === "opaque")) cache.put(req, resp.clone());
      return resp;
    }).catch(() => enCache);
    return enCache || deRed;
  })());
});
