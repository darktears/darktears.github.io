/**
 * Welcome to your Workbox-powered service worker!
 *
 * You'll need to register this file in your web app and you should
 * disable HTTP caching for this file too.
 * See https://goo.gl/nhQhGp
 *
 * The rest of the code is auto-generated. Please don't update this file
 * directly; instead, make changes to your Workbox build configuration
 * and re-run your build process.
 * See https://goo.gl/2aRDsh
 */

importScripts("https://storage.googleapis.com/workbox-cdn/releases/4.3.1/workbox-sw.js");

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/**
 * The workboxSW.precacheAndRoute() method efficiently caches and responds to
 * requests for URLs in the manifest.
 * See https://goo.gl/S9QRab
 */
self.__precacheManifest = [
  {
    "url": "images/ar.png",
    "revision": "838260bf7f392bfbddc865a745940d42"
  },
  {
    "url": "images/astronaut.png",
    "revision": "36020f9e97ec1340a22c6ba3516ff3c1"
  },
  {
    "url": "images/check.png",
    "revision": "25ffec9e00d9339653da68ccbb7132b1"
  },
  {
    "url": "images/cross.png",
    "revision": "370b0cb8b825681913d15561b9973a3d"
  },
  {
    "url": "images/drop-shadow.png",
    "revision": "084f2d64024cb080c410f77e30b43b25"
  },
  {
    "url": "images/flower.png",
    "revision": "715e39702ecb79521f85ede1dd429abc"
  },
  {
    "url": "images/manifest/apple-touch-icon.png",
    "revision": "5289a09802e2e00898ac35118e6cec22"
  },
  {
    "url": "images/manifest/icon-128x128.png",
    "revision": "f03a07d997adced8cef0480623102fb0"
  },
  {
    "url": "images/manifest/icon-144x144.png",
    "revision": "0d5a36ffac598d3dfd48be33508a1481"
  },
  {
    "url": "images/manifest/icon-152x152.png",
    "revision": "fa5b9a9ff749938a86c02aacaf8fa5cb"
  },
  {
    "url": "images/manifest/icon-16x16.png",
    "revision": "c409250013cdd60552aaa513304a9c9e"
  },
  {
    "url": "images/manifest/icon-192x192.png",
    "revision": "b9421cba35932513a9bf0beb9b552af6"
  },
  {
    "url": "images/manifest/icon-32x32.png",
    "revision": "f45ba06cd6081e53d8fb29bc4ccad014"
  },
  {
    "url": "images/manifest/icon-384x384.png",
    "revision": "10a2c11b6c7c9cf76b3425e26623532e"
  },
  {
    "url": "images/manifest/icon-512x512.png",
    "revision": "788b41c0e37e2d41a6b63c869da9de8b"
  },
  {
    "url": "images/manifest/icon-72x72.png",
    "revision": "4c69d83f68d36839b4c5346ca9312dc9"
  },
  {
    "url": "images/manifest/icon-96x96.png",
    "revision": "c1bae4cc4bec6eef728e3352f88f8a5b"
  },
  {
    "url": "images/plane.png",
    "revision": "e880a802590ac53868f974baf5d77d70"
  },
  {
    "url": "images/velociraptor.png",
    "revision": "8c4f6254be7634820e59a61174ef8d4b"
  },
  {
    "url": "images/white-arrow.png",
    "revision": "c7c77dbfcdedb0623e641eb17fd91060"
  },
  {
    "url": "index.html",
    "revision": "9e7b9dfb491be00480b8f7bfee2bfa8b"
  },
  {
    "url": "main-app-317faa47.js",
    "revision": "101e3015c3550c17d872b7559a13d348"
  },
  {
    "url": "models/gltf/astronaut/textures/material_0_normal.png",
    "revision": "4d33826a745f845d029c3361bac27950"
  },
  {
    "url": "models/gltf/astronaut/textures/material_0_occlusion.png",
    "revision": "904bc0429a80880a9eae1bc3f0505500"
  },
  {
    "url": "models/gltf/astronaut/textures/material_0_specularGlossiness.png",
    "revision": "e95a5dec36a9e60f4f998388e0c8348b"
  },
  {
    "url": "models/gltf/astronaut/textures/material_2_occlusion.png",
    "revision": "629cbe3d90dc422ecef90e70de31570c"
  },
  {
    "url": "models/gltf/astronaut/textures/material_2_specularGlossiness.png",
    "revision": "8209a256107c02873540bf9a972074bd"
  },
  {
    "url": "models/gltf/velociraptor/textures/Material_baseColor.png",
    "revision": "1d3d4df5f568abd083c35a916697dbc2"
  },
  {
    "url": "models/gltf/velociraptor/textures/Material.001_baseColor.png",
    "revision": "bd719b6d817559fedefc86a1abd31599"
  },
  {
    "url": "polyfills/custom-elements-es5-adapter.84b300ee818dce8b351c7cc7c100bcf7.js",
    "revision": "cff507bc95ad1d6bf1a415cc9c8852b0"
  },
  {
    "url": "polyfills/dynamic-import.b745cfc9384367cc18b42bbef2bbdcd9.js",
    "revision": "ed55766050be285197b8f511eacedb62"
  },
  {
    "url": "polyfills/webcomponents.dae9f79d9d6992b6582e204c3dd953d3.js",
    "revision": "fe4a22f36087db029cd3f476a1935410"
  },
  {
    "url": "style.css",
    "revision": "3a19ffa726e523fd9875e1bb076f6ec3"
  },
  {
    "url": "textures/cube/basic-light/nx.png",
    "revision": "58423437cebc6da2f4356d67a3e4f06c"
  },
  {
    "url": "textures/cube/basic-light/ny.png",
    "revision": "58423437cebc6da2f4356d67a3e4f06c"
  },
  {
    "url": "textures/cube/basic-light/nz.png",
    "revision": "58423437cebc6da2f4356d67a3e4f06c"
  },
  {
    "url": "textures/cube/basic-light/px.png",
    "revision": "58423437cebc6da2f4356d67a3e4f06c"
  },
  {
    "url": "textures/cube/basic-light/py.png",
    "revision": "58423437cebc6da2f4356d67a3e4f06c"
  },
  {
    "url": "textures/cube/basic-light/pz.png",
    "revision": "58423437cebc6da2f4356d67a3e4f06c"
  },
  {
    "url": "textures/cube/stars/nx.png",
    "revision": "6a2d42bcb36611d2b1bdafe46906a1e1"
  },
  {
    "url": "textures/cube/stars/ny.png",
    "revision": "cdec5a693399ced29fc3a03d5233c4ab"
  },
  {
    "url": "textures/cube/stars/nz.png",
    "revision": "5be13478ab7df3649c6ca2cc6f3ee2fd"
  },
  {
    "url": "textures/cube/stars/px.png",
    "revision": "c8af6a534b1e3d7abcec34a87efdf74c"
  },
  {
    "url": "textures/cube/stars/py.png",
    "revision": "19597a0e91ff97919bc036360e77a018"
  },
  {
    "url": "textures/cube/stars/pz.png",
    "revision": "e48e6c264df0d2e02eff19ef153e161c"
  }
].concat(self.__precacheManifest || []);
workbox.precaching.precacheAndRoute(self.__precacheManifest, {});
