// Service Worker básico para permitir la instalación de la PWA
self.addEventListener('install', (e) => {
  // Forzar al SW a activarse inmediatamente
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  // Tomar control de todos los clientes inmediatamente
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  // Estrategia simple: Network Only (para evitar problemas de caché en desarrollo)
  // Esto es suficiente para que Chrome/Safari habiliten el botón "Instalar"
  e.respondWith(fetch(e.request));
});