// Service Worker para modo offline
const CACHE_NAME = 'bdo-cache-v1';
const STATIC_CACHE_NAME = 'bdo-static-v1';

// Recursos estáticos a cachear
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Estrategia: Cache First para recursos estáticos
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      // Usar Promise.all con cache.add individual para mejor control de errores
      return Promise.all(
        STATIC_ASSETS.map(url => {
          return cache.add(url).catch(error => {
            console.warn('[SW] Failed to cache:', url, error);
          });
        })
      );
    })
  );
  self.skipWaiting();
});

// Activar y limpiar caches antiguos
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  return self.clients.claim();
});

// Interceptar peticiones
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo cachear peticiones GET y del mismo origen
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Para recursos estáticos (JS, CSS, imágenes), usar Cache First
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/) ||
    url.pathname.startsWith('/assets/')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          // Solo cachear respuestas exitosas
          if (response.status === 200) {
            const responseToCache = response.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Para HTML, usar Network First con fallback a cache
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cachear respuesta exitosa
          if (response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Si falla, intentar desde cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Si no hay cache, devolver página offline
            return caches.match('/index.html');
          });
        })
    );
    return;
  }
});

// Escuchar mensajes del cliente para sincronización
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});


