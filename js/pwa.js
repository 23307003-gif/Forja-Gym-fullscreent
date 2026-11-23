/* Forja Gym - PWA: registro del Service Worker, instalación e indicador de modo.
   Este archivo es IDÉNTICO en las 4 versiones; lo único que cambia es manifest.json */
(() => {
  const MODOS = ["fullscreen", "standalone", "minimal-ui", "browser"];
  const $ = id => document.getElementById(id);

  // 1. Registro del Service Worker
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js", { scope: "./" })
        .then(reg => console.log("[PWA] Service Worker registrado. Alcance:", reg.scope))
        .catch(err => console.error("[PWA] Error al registrar el Service Worker:", err));
    });
  }

  // 2. Modo de visualización real (lo que el navegador aplicó)
  function modoActual() {
    if (window.navigator.standalone === true) return "standalone"; // iOS Safari
    return MODOS.find(m => matchMedia(`(display-mode: ${m})`).matches) || "browser";
  }

  // 3. Orientación real de la pantalla
  function orientacionActual() {
    if (screen.orientation && screen.orientation.type) return screen.orientation.type;
    return matchMedia("(orientation: portrait)").matches ? "portrait" : "landscape";
  }

  // 4. Valores declarados en el manifest (se leen del propio archivo)
  let declarado = { display: "…", orientation: "…" };
  fetch("./manifest.json")
    .then(r => r.json())
    .then(m => { declarado = { display: m.display || "browser", orientation: m.orientation || "any" }; pintar(); })
    .catch(() => pintar());

  function pintar() {
    if (!$("pwaModo")) return;
    $("pwaModo").textContent = modoActual();
    $("pwaOrientacion").textContent = orientacionActual();
    $("pwaManifest").textContent = `${declarado.display} + ${declarado.orientation}`;
    $("pwaRed").textContent = navigator.onLine ? "en línea" : "sin conexión";
    $("pwaEstado").classList.toggle("pwa-estado--offline", !navigator.onLine);
  }

  document.addEventListener("DOMContentLoaded", () => {
    pintar();
    ["resize", "orientationchange", "online", "offline"].forEach(ev => window.addEventListener(ev, pintar));
    if (screen.orientation) screen.orientation.addEventListener("change", pintar);
    MODOS.forEach(m => matchMedia(`(display-mode: ${m})`).addEventListener("change", pintar));

    // Mostrar / ocultar el indicador
    $("pwaEstadoToggle").addEventListener("click", () => {
      const abierto = $("pwaEstado").classList.toggle("pwa-estado--abierto");
      $("pwaEstadoToggle").setAttribute("aria-expanded", abierto);
    });
  });

  // 5. Botón de instalación propio (Chrome/Edge en Android y escritorio)
  let eventoInstalar = null;
  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    eventoInstalar = e;
    const boton = $("pwaInstalar");
    if (boton) boton.hidden = false;
  });
  document.addEventListener("click", async e => {
    if (!e.target.closest("#pwaInstalar") || !eventoInstalar) return;
    eventoInstalar.prompt();
    const { outcome } = await eventoInstalar.userChoice;
    console.log("[PWA] Instalación:", outcome);
    eventoInstalar = null;
    $("pwaInstalar").hidden = true;
  });
  window.addEventListener("appinstalled", () => {
    const boton = $("pwaInstalar");
    if (boton) boton.hidden = true;
    console.log("[PWA] Aplicación instalada");
  });
})();
