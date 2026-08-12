/* Keep the whole app — template included — on the phone.
 *
 * The shell is tiny and versioned, so cache-first is right: a pump station in
 * a paddock is exactly where a network round trip fails, and there is nothing
 * here that goes stale between visits. A new CACHE name is what ships an
 * update; the old one is dropped on activate.
 */
var CACHE = "sps-assess-v1";

var SHELL = [
  "./",
  "index.html",
  "app.css",
  "app.js",
  "docx.js",
  "schema.js",
  "template.docx",
  "manifest.webmanifest",
  "icon-180.png",
  "icon-512.png",
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(function (cache) {
        return cache.addAll(SHELL);
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (names) {
        return Promise.all(
          names
            .filter(function (name) {
              return name !== CACHE;
            })
            .map(function (name) {
              return caches.delete(name);
            })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

self.addEventListener("fetch", function (event) {
  var request = event.request;
  if (request.method !== "GET") return;

  var url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(new URL("./", self.location.href).pathname)) return;

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then(function (hit) {
      if (hit) {
        // Refresh in the background so the next launch is current, but never
        // make the user wait on the network for something already cached.
        event.waitUntil(
          fetch(request)
            .then(function (response) {
              if (response && response.ok) {
                return caches.open(CACHE).then(function (cache) {
                  return cache.put(request, response);
                });
              }
            })
            .catch(function () {})
        );
        return hit;
      }

      return fetch(request)
        .then(function (response) {
          if (response && response.ok) {
            var copy = response.clone();
            caches.open(CACHE).then(function (cache) {
              cache.put(request, copy);
            });
          }
          return response;
        })
        .catch(function () {
          // A navigation with no cache entry and no network still has to land
          // somewhere sensible.
          if (request.mode === "navigate") return caches.match("index.html");
          throw new Error("offline and not cached: " + url.pathname);
        });
    })
  );
});
