importScripts('/node_modules/workbox-sw/build/workbox-sw.js');

if (workbox) {
  console.log('Workbox is loaded.');
} else {
  console.log('Workbox didn\'t load.');
}

// Cache the Google Fonts stylesheets with a stale-while-revalidate strategy.
workbox.routing.registerRoute(
  /^https:\/\/fonts\.googleapis\.com/,
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: 'google-fonts-stylesheets',
  })
);

workbox.routing.registerRoute(
  // Cache CSS files.
  /\.css$/,
  // Use cache but update in the background.
  new workbox.strategies.StaleWhileRevalidate({
    // Use a custom cache name.
    cacheName: 'css-cache',
  })
);

workbox.routing.registerRoute(
  /\.js$/,
  new workbox.strategies.StaleWhileRevalidate({
    // Use a custom cache name.
    cacheName: 'js-cache',
  })
);

workbox.routing.registerRoute(
  // Cache image files.
  /\.(?:png|jpg|jpeg|svg|gif)$/,
  // Use the cache if it's available.
  new workbox.strategies.CacheFirst({
    cacheName: 'image-cache',
    plugins: [
      new workbox.expiration.Plugin({
        maxEntries: 50,
        // Cache for a maximum of 3 weeks.
        maxAgeSeconds: 21 * 24 * 60 * 60,
      })
    ],
  })
);
workbox.routing.registerRoute(
  // Cache assets files.
  /\.(?:gltf|bin)$/,
  // Use the cache if it's available.
  new workbox.strategies.CacheFirst({
    cacheName: 'asset-cache',
    plugins: [
      new workbox.expiration.Plugin({
        maxEntries: 15,
        // Cache for a maximum of 3 weeks.
        maxAgeSeconds: 21 * 24 * 60 * 60,
      })
    ],
  })
);