/* Crea Nature — Service Worker (a deployer a cote de index.html) */
var CACHE = "creanature-v2";

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(["./", "./index.html"]).catch(function () {});
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  // Ne pas intercepter Firebase/Firestore (gere sa propre persistance)
  if (
    url.hostname.indexOf("firestore") >= 0 ||
    url.hostname.indexOf("googleapis") >= 0 ||
    url.hostname.indexOf("firebaseio") >= 0
  ) return;

  // Reseau d'abord, cache en secours (l'app reste a jour, mais marche hors-ligne)
  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.status === 200 && (url.origin === location.origin || url.hostname.indexOf("gstatic") >= 0)) {
        var copy = res.clone();
        caches.open(CACHE).then(function (cache) {
          try { cache.put(req, copy); } catch (err) {}
        });
      }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (cached) {
        return cached || caches.match("./");
      });
    })
  );
});
