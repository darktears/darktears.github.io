/*!
 *
 * Copyright 2016 Google Inc. All rights reserved.
 * Copyright 2019 Intel Corporation. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { LitElement, html, css, property, query, customElement } from 'lit-element';
import { classMap } from 'lit-html/directives/class-map.js';
import '@material/mwc-button';
import '@material/mwc-icon';
import '@material/mwc-icon-button';
import "@material/mwc-linear-progress";
import "@material/mwc-snackbar";
import { Workbox } from 'workbox-window';
import { AmbientLight, AnimationMixer, Box3, CircleGeometry, Clock, CubeTextureLoader,
        DirectionalLight, DoubleSide, Euler, GammaEncoding, Math as ThreeMath,
        Matrix4, Mesh, MeshBasicMaterial, Object3D, PerspectiveCamera,
        PCFSoftShadowMap, PlaneBufferGeometry, PlaneGeometry,
        PMREMGenerator, Raycaster, RingGeometry, Scene, ShadowMaterial, 
        sRGBEncoding, TextureLoader, Vector3, WebGLRenderer } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

@customElement('main-app')
export class MainApplication extends LitElement {

  static styles = css`
    :host {
      --carousel-width: 35vw;
      --carousel-height: 70vh;
    }

    #canvas-container {
      width: 100%;
      height: 100%;
      z-index: 3;
    }

    .welcome-section {
      position: absolute;
      width: 100vw;
      height: 100vh;
      top: 0;
      left: 0;
      background-color: black;
      overflow: hidden;
    }

    .welcome-section .welcome-content {
      position: absolute;
      left: 50vw;
      top: 40vh;
      transform: translate3d(-50%, -50%, 0);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      transform: translate(-50%, -50%);
    }

    .welcome-section .welcome-content .fly-in-text {
      list-style: none;
    }

    .welcome-section .welcome-content .fly-in-text li {
      display: inline-block;
      margin-right: 30px;
      font-size: 5em;
      color: #fff;
      opacity: 1;
      transition: all 2s ease;
    }
    .welcome-section .welcome-content .fly-in-text li:last-child {
      margin-right: 0;
    }

    .welcome-section.hidden .welcome-content .fly-in-text li { opacity: 0; }
    .welcome-section.hidden .welcome-content .fly-in-text li:nth-child(1) { transform: translate3d(-100px, 0, 0); }
    .welcome-section.hidden .welcome-content .fly-in-text li:nth-child(2) { transform: translate3d(100px, 0, 0); }

    .compatibility-panel {
      color: white;
      font-size: 1em;
      margin: 0;
      padding: 0;
      transition-delay: 1s;
      transition-property: all;
      transition-duration: 2.5s;
      transition-timing-function: ease;
    }

    .compatibility-panel.hidden {
      opacity: 0;
    }

    .compatibility-item {
      margin: 5px;
      padding: 0;
      display: flex;
      align-items: center;
    }
    .compatibility-item img {
      width: 20px;
      margin-left: 4px;
    }

    .start {
      color: white;
      font-size: 2.5em;
      margin-top: 40px;
      padding: 0;
      cursor: pointer;
      transition-delay: 2s;
      transition-property: opacity;
      transition-duration: 2s;
      transition-timing-function: ease;
    }

    .start.hidden {
      opacity: 0;
    }

    .start:hover {
      color: rgba(29, 161, 255, 0.89);
    }

    .ar-icon {
      background-color: rgb(196, 194, 194);
      opacity: 0.8;
      border-radius: 15px;
      display: flex;
      align-items: center;
      flex-direction: row;
      justify-content: space-between;
      padding: 8px;
      cursor: pointer;
      margin-bottom: 5px;
    }

    .ar-icon.hidden, .progress-bar.hidden, .arrow-container.hidden, .welcome-section.inxr {
      display: none;
    }

    .ar-text {
      color: black;
      margin: 10px;
      font-size: 30px;
    }

    mwc-button {
      --mdc-theme-primary: rgba(29, 161, 255, 0.89);
    }

    .progress-bar {
      position:absolute;
      bottom: 0%;
      width: 100%;
      --mdc-theme-primary: rgba(29, 161, 255, 0.89);
    }

    .close {
      position: absolute;
      right: 20px;
      top: 20px;
      width: 32px;
      height: 32px;
      opacity: 0.3;
      background-color: white;
    }

    .close:hover {
      opacity: 1;
    }

    .close:before, .close:after {
      position: absolute;
      left: 15px;
      content: ' ';
      height: 33px;
      width: 2px;
      background-color: #333;
    }

    .close:before {
      transform: rotate(45deg);
    }

    .close:after {
      transform: rotate(-45deg);
    }

    .carousel-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      height: 100%;
      width: 100%;
      transition: all 0.5s linear;
      transition-timing-function: ease-out;
      bottom: 0vh;
      position: absolute;
      background-color: black;
      justify-content: space-between;
    }

    .carousel-scroller {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .carousel {
      width: var(--carousel-width);
      height: var(--carousel-height);
    }

    .carousel-container.hidden {
      bottom: -100vh;
    }

    .arrows {
      display: flex;
    }


    @keyframes arrow-left-animation {
      0% { opacity: 1; transform: translateX(0px) rotate(45deg) scale(1); }
      25% { opacity: 0; transform: translateX(-10px) rotate(45deg) scale(0.9);}
      26% { opacity: 0; transform: translateX(-10px) rotate(45deg) scale(0.9);}
      55% { opacity: 1; transform: translateX(0px) rotate(45deg) scale(1);}
    }

    .arrow-left {
      width: 30px;
      height: 30px;
      border-bottom: solid 10px white;
      border-left: solid 10px white;
      border-radius: 15%;
      transform: rotate(45deg);
    }

    .arrow-left.first {
      animation-name: arrow-left-animation;
      animation-duration: 1.4s;
      animation-delay: 0.4s;
      animation-iteration-count: infinite;
      animation-timing-function: linear;
    }

    .arrow-left.second {
      animation-name: arrow-left-animation;
      animation-duration: 1.4s;
      animation-delay: 0.2s;
      animation-iteration-count: infinite;
      animation-timing-function: linear;
    }

    .arrow-left.third {
      animation-name: arrow-left-animation;
      animation-duration: 1.4s;
      animation-iteration-count: infinite;
      animation-timing-function: linear;
    }

    .arrow-right {
      width: 30px;
      height: 30px;
      border-top: solid 10px white;
      border-right: solid 10px white;
      border-radius: 15%;
      transform: rotate(45deg);
    }

    .arrow-right.first {
      animation-name: arrow-left-animation;
      animation-duration: 1.4s;
      animation-delay: 0.4s;
      animation-iteration-count: infinite;
      animation-timing-function: linear;
    }

    .arrow-right.second {
      animation-name: arrow-left-animation;
      animation-duration: 1.4s;
      animation-delay: 0.2s;
      animation-iteration-count: infinite;
      animation-timing-function: linear;
    }

    .arrow-right.third {
      animation-name: arrow-left-animation;
      animation-duration: 1.4s;
      animation-iteration-count: infinite;
      animation-timing-function: linear;
    }


    .scroll {
      display: flex;
      align-items: center;
      overflow-x: auto;
      overflow-y: hidden;
      width: 100%;
      -webkit-overflow-scrolling: touch;
    }

    ul.scroll {
      margin: 0;
      padding: 0;
      list-style: none;
      overflow: hidden;
    }

    .scroll-item-outer {
      width: 100%;
    }

    .carrousel-image {
      object-fit: contain;
      width: var(--carousel-width);
      height: var(--carousel-height)
    }

    @supports (scroll-snap-align: start) {
      .scroll {
        scroll-snap-type: x mandatory;
      }
      .scroll-item-outer {
        scroll-snap-align: center;
      }
    }
    `;

  // FIXME : Private fields in decorated classes are not supported yet by babel
  // Can be updated later to use # to mark the property private.
  _xrSupported = false;
  _previousLoadedPercent = 0;
  _width;
  _height;
  _renderer;
  _camera;
  _aspect;
  _settings;
  _currentModel;
  _selectedModel;
  _xrSession;
  _xrReferenceSpace;
  _animationMixers = [];
  _clock = new Clock();
  _cubeMap;
  _ModelOrigin = new Vector3();

  @property({attribute: false}) _loadingBarClasses = { hidden: true };
  @property({attribute: false}) _carouselContainerClasses = { hidden: false};
  @query('#welcome') _welcomeScreen;
  @query('.compatibility-panel') _compatibilityContainer;
  @query('.start') _start;
  @query('#webxr') _webxr_img;
  @query('#webxr-ar') _webxr_ar_img;
  @query('#webxr-hit-test') _webxr_hit_test_img;
  @query('#canvas-container') _canvasContainer;
  @query('#webxr-snackbar') _webxrSnackbar;
  @query('sw-snackbar') _swSnackbar;
  @query('mwc-linear-progress') _progressBar;
  @query('#scroller') _scroller;

  constructor() {
    super();
    this._carouselContainerClasses= { hidden : true};
    this._xrSupported = (navigator.xr != undefined);
  }

  static get CAMERA_SETTINGS() {
    return {
      viewAngle: 45,
      near: 0.1,
      far: 10000
    };
  }

  firstUpdated() {
    setTimeout(() => this._revealUi(), 500);

    if (!this._xrSupported) {
      this._webxr_img.src = "images/cross.png";
      this._showXRNotSupportedSnackbar();
      return;
    }

    this._webxr_img.src = "images/check.png";
    navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
      if (supported) {
        this._webxr_ar_img.src = "images/check.png";
      } else {
        this._webxr_ar_img.src = "images/cross.png";
        this._showXRNotSupportedSnackbar();
        return;
      }
    });
    if(XRSession.prototype.requestHitTest) {
      this._webxr_hit_test_img.src = "images/check.png";
    } else {
      this._webxr_ar_img.src = "images/cross.png";
      this._showXRNotSupportedSnackbar();
      return;
    }
    this._fetchAssets();

    // Check that service workers are supported
    if ('serviceWorker' in navigator) {
      const wb = new Workbox('service-worker.js');
      // Add an event listener to detect when the registered
      // service worker has installed but is waiting to activate.
      wb.addEventListener('waiting', (event) => {
        this._swSnackbar.open();
        this._swSnackbar.addEventListener('MDCSnackbar:closed', ev => {
          if (ev.detail.reason === "reload") {
            wb.addEventListener('controlling', (event) => {
              window.location.reload();
            });
          }
        });
      });
      wb.register();
    }

    window.addEventListener('resize', () => this._onResize);
    this._createCamera();
    this._createRenderer();
    this._canvasContainer.appendChild(this._renderer.domElement);
    this._createScene();
    this._onResize();
  }

  _revealUi() {
    this._welcomeScreen.classList.remove('hidden');
    this._compatibilityContainer.classList.remove('hidden');
    this._start.classList.remove('hidden');
  }

  _showXRNotSupportedSnackbar() {
    this._webxrSnackbar.open();
    this._webxrSnackbar.addEventListener('MDCSnackbar:closed', ev => {
      if (ev.detail.reason === "action") {
        let win = window.open('https://www.w3.org/TR/webxr/', '_blank');
        win.focus();
      }
    });
  }

  _showCarousel () {
    this._carouselContainerClasses = { hidden: false};
  }

  _closeCarousel () {
    this._carouselContainerClasses = { hidden: true};
  }

  _scrollToImage (direction, event) {
    event.preventDefault();
    event.stopPropagation();
    let scroll = direction === 'previous' ? -this._scroller.scrollWidth / 4 : this._scroller.scrollWidth / 4;
    this._scroller.scrollTo({
      top : 0,
      left: this._scroller.scrollLeft + scroll,
      behavior: 'smooth'
    })
  }

  _fetchAssets() {
    let flowerLoader = new GLTFLoader();
    flowerLoader.load('models/gltf/flower/scene.gltf',
      (object) => this._flowerLoaded(object), (object) => this._updateLoadingBar(object));
  }

  _updateLoadingBar(xhr) {
    if (!xhr)
      return;

    let percentLoaded;
    // Most likely coming from the cache.
    if (xhr.total === 0)
      percentLoaded = 1;
    else
      percentLoaded = (xhr.loaded / xhr.total).toFixed(0);
    let currentLoadingWidth = this._progressBar.progress;
    let loadedPercent = percentLoaded * 0.25 - this._previousLoadedPercent;
    this._previousLoadedPercent = percentLoaded * 0.25;
    this._progressBar.progress = (currentLoadingWidth + loadedPercent);
    if (this._progressBar.progress === 1)
      this._loadingBarClasses = { hidden : true};
  }

  _createScene() {
    this._scene = new Scene();
    this._scene.background = null;

    const urls = ['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png'];
    this._cubeMap = new CubeTextureLoader()
      .setPath('./textures/cube/stars/')
      .load(urls, _ => {
        this._cubeMap.encoding = sRGBEncoding;
        let pmremGenerator = new PMREMGenerator(this._renderer);
        pmremGenerator.compileCubemapShader();
        this._cuberRenderTarget = pmremGenerator.fromCubemap(this._cubeMap);
        pmremGenerator.dispose();
        this._createLights();
      });
    this._scene.add(this._camera);
  }

  _createRenderer() {
    this._renderer = new WebGLRenderer({antialias: true});
    this._renderer.outputEncoding = GammaEncoding;
    this._renderer.gammaFactor = 2.2;
    // Make sure not to clear the renderer automatically.
    this._renderer.autoClear = false;
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = PCFSoftShadowMap;
  }

  _createCamera() {
    this._settings = MainApplication.CAMERA_SETTINGS;
    this._camera = new PerspectiveCamera(
        this._settings.viewAngle,
        this._aspect,
        this._settings.near,
        this._settings.far
    );
    // Disable autoupdating because these values will be coming from WebXR.
    this._camera.matrixAutoUpdate = false;
  }

  _createLights() {
    const light = new AmbientLight(0xffffff, 0.5);
    let directionalLight = new DirectionalLight(0xffffff, 0.3)
    directionalLight.position.set(1, 5, 2);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.01;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -2;
    directionalLight.shadow.camera.bottom = -2;
    directionalLight.shadow.camera.right = 2;
    directionalLight.shadow.camera.top = 2;
    directionalLight.shadow.radius = 2;
    this._directionalLight = directionalLight;
    this._scene.add(directionalLight);

    // Make a large plane to receive our shadows
    let planeGeometry = new PlaneGeometry(2000,2000);
    // Rotate our plane to be parallel to the floor
    planeGeometry.rotateX(-Math.PI / 2);

    let planeMaterial = new ShadowMaterial();
    planeMaterial.opacity = 0.2;

    this._shadowMesh = new Mesh(planeGeometry, planeMaterial);
    this._shadowMesh.name = 'shadowMesh';
    this._shadowMesh.receiveShadow = true;
    this._shadowMesh.position.y = -1;

    this._scene.add(this._shadowMesh);
    this._scene.add(light);
  }

  _onResize () {
    this._width = window.innerWidth;
    this._height = window.innerHeight;
    this._aspect = this._width / this._height;

    this._renderer.setSize(this._width, this._height);

    if (!this._camera)
      return;

    this._camera.aspect = this._aspect;
    this._camera.updateProjectionMatrix();
  }

  async _deactivateAR() {
    if (!this._xrSession) {
      return;
    }
    await this._xrSession.end();
    this._cleanupAfterSessionEnded();
  }

  _cleanupAfterSessionEnded() {
    this._arActivated = false;
    this._xrSession = null;
    this._xrReferenceSpace = null;
    this._renderer.setFramebuffer(null);
    this._renderer.clear();
    this._onResize();
    this._renderer.setViewport(0, 0, this._width, this._height);
    this._cleanObjects();
  }

  async _activateAR() {
    try {
      this._xrSession = await navigator.xr.requestSession('immersive-ar');

      this._xrSession.depthNear = this._settings.near;
      this._xrSession.depthFar = this._settings.far;

      this._xrReferenceSpace = await this._xrSession.requestReferenceSpace('local');
      this._xrSession.addEventListener('select', (...args) => this._handleSelect(...args));

      // Create the WebGL layer.
      let gl = this._renderer.getContext();
      await gl.makeXRCompatible();
      let layer = new XRWebGLLayer(this._xrSession, gl);
      this._xrSession.updateRenderState({ baseLayer: layer });
      this._xrSession.addEventListener('end', () => this._cleanupAfterSessionEnded());

      // Enter the rendering loop.
      this._xrSession.requestAnimationFrame((...args) => this._renderXRContent(...args));
      this._arActivated = true;
      this._selectedModel = Math.round(this._scroller.scrollLeft / (this._scroller.scrollWidth / 4));

    } catch (error) {
      console.log("Error while requesting the immersive session : " + error);
    };
  }

  _lookAtOnY(looker, target, origin) {
    const targetPos = new Vector3().setFromMatrixPosition(target.matrixWorld);

    const angle = Math.atan2(targetPos.x - looker.position.x, targetPos.z - looker.position.z);
    looker.rotation.set(0, angle, 0);
    if (origin !== null) {
      origin.applyEuler(new Euler(0, angle, 0));
    }
  }

  _renderXRContent(timestamp, xrFrame) {
    if (!xrFrame || !this._xrSession || !this._arActivated)
      return;

    // Get pose data.
    let pose = xrFrame.getViewerPose(this._xrReferenceSpace);
    if (!pose) {
      this._xrSession.requestAnimationFrame((...args) => this._renderXRContent(...args));
      return;
    }

    // Update the mixers for the 3D models animations.
    if (this._animationMixers.length > 0) {
      const delta = this._clock.getDelta();
      for (let i = 0; i < this._animationMixers.length; i ++) {
        this._animationMixers[i].update(delta);
      }
    }

    if (!this._reticle)
      this._createReticle();

    const x = 0;
    const y = 0;
    let raycaster = new Raycaster();
    raycaster.setFromCamera({ x, y }, this._camera);
    let rayOrigin = raycaster.ray.origin;
    let rayDirection = raycaster.ray.direction;
    let ray = new XRRay({x : rayOrigin.x, y : rayOrigin.y, z : rayOrigin.z},
      {x : rayDirection.x, y : rayDirection.y, z : rayDirection.z});
    if (this._currentModel) {
      let intersectsWithModel = raycaster.intersectObject(this._currentModel, true);
      if (intersectsWithModel.length == 0)
        this._requestHitTest(ray);
      else
        this._reticle.visible = false;
    } else {
      this._requestHitTest(ray);
    }

    let xrLayer = this._xrSession.renderState.baseLayer;

    this._renderer.setFramebuffer(xrLayer.framebuffer);

    for (let xrView of pose.views) {
      let viewport = xrLayer.getViewport(xrView);
      this._renderView(
        xrView,
        viewport);
    }

    // Use the XR display's in-built rAF (which can be a diff refresh rate to
    // the default browser one).
    this._xrSession.requestAnimationFrame((...args) => this._renderXRContent(...args));
  }

  _requestHitTest(ray) {
    this._xrSession.requestHitTest(ray, this._xrReferenceSpace).then((results) => {
      if (results.length) {
        let hitResult = results[0];
        this._reticle.visible = true;
        let hitMatrix = new Matrix4();
        hitMatrix.fromArray(hitResult.hitMatrix);
        this._reticle.position.setFromMatrixPosition(hitMatrix);
        this._lookAtOnY(this._reticle, this._camera, null);
      } else {
        this._reticle.visible = false;
      }
    }).catch((reason) => { console.log("Hit Test failed because : " + reason) });
  }

  _createReticle() {
    if (this._reticle)
      return;

    this._reticle = new Object3D();
    let ringGeometry = new RingGeometry(0.1, 0.11, 24, 1);
    let material = new MeshBasicMaterial({ color: 0xffffff });
    ringGeometry.applyMatrix(new Matrix4().makeRotationX(ThreeMath.degToRad(-90)));
    let circle = new Mesh(ringGeometry, material);
    circle.position.y = 0.03;


    let geometry = new PlaneBufferGeometry(0.10, 0.10);
    geometry.applyMatrix(new Matrix4().makeRotationX(ThreeMath.degToRad(-90)));
    geometry.applyMatrix(new Matrix4().makeRotationY(ThreeMath.degToRad(0)));
    material = new MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
      side: DoubleSide
    });
    let icon = new Mesh(geometry, material);
    let loader = new TextureLoader();
    loader.load('images/white-arrow.png', (texture) => {
      icon.material.opacity = 1;
      icon.material.map = texture;
      icon.translateY(0.05);
      icon.rotateX(ThreeMath.degToRad(90));
      this._reticle.add(icon);
    });

    // Let's add a drop shadow.
    let geometryShadow = new CircleGeometry(0.25, 32);
    let shadowMaterial = new MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      side: DoubleSide
    });
    let dropShadow = new Mesh(geometryShadow, shadowMaterial);
    let droploader = new TextureLoader();
    droploader.load('images/drop-shadow.png', (texture) => {
      dropShadow.material.opacity = 0.5;
      dropShadow.material.map = texture;
      dropShadow.rotateX(ThreeMath.degToRad(90))
      this._reticle.add(dropShadow);
    });

    this._reticle.add(circle);
    this._reticle.name = 'reticle';
    this._scene.add(this._reticle);
  }


  _renderView(xrView, viewport) {
    this._renderer.setViewport(viewport.x, viewport.y, viewport.width, viewport.height);
    const viewMatrix = xrView.transform.inverse.matrix;
    // Update the camera matrices.
    this._camera.projectionMatrix.fromArray(xrView.projectionMatrix);
    this._camera.matrix.fromArray(viewMatrix).getInverse(this._camera.matrix);
    this._camera.updateMatrixWorld(true);

    this._renderer.render(this._scene, this._camera);
  }


  _flowerLoaded(model) {
    this._flowerLoaded = true;
    this._flowerModel = model;

    // Let's load more.
    this._previousLoadedPercent = 0;
    let astronautLoader = new GLTFLoader();
    astronautLoader.load('models/gltf/astronaut/scene.gltf',
      (object) => this._astronautLoaded(object), (object) => this._updateLoadingBar(object));
  }

  _planeLoaded(model) {
    this._planeLoaded = true;
    this._planeModel = model;
  }

  _velociraptorLoaded(model) {
    this._velociraptorLoaded = true;
    this._velociraptorModel = model;

    this._previousLoadedPercent = 0;
    let planeLoader = new GLTFLoader();
    planeLoader.load('models/gltf/plane/scene.gltf',
      (object) => this._planeLoaded(object), (object) => this._updateLoadingBar(object));
  }

  _astronautLoaded(model) {
    this._astronautLoaded = true;
    this._astronautModel = model;

    this._previousLoadedPercent = 0;
    let velociraptorLoader = new GLTFLoader();
    velociraptorLoader.load('models/gltf/velociraptor/scene.gltf',
      (object) => this._velociraptorLoaded(object) , (object) => this._updateLoadingBar(object));
  }

  _cleanObjects() {
    this._scene.remove(this._currentModel);
    this._currentModel = null;
    this._animationMixers = [];
  }

  _fitObjectInCameraView(height) {
    const box = new Box3().setFromObject(this._currentModel);
    const size = box.getSize(new Vector3()).length();
    const center = box.getCenter(new Vector3());
    const scale = height / (box.max.y - box.min.y);
    this._currentModel.scale.set(scale, scale, scale);
    this._modelOrigin = new Vector3(center.x * scale, box.min.y * scale, center.z * scale);
    this._camera.near = size / 100;
    this._camera.far = size * 100;
    this._camera.updateProjectionMatrix();
    this._directionalLight.shadow.radius = Math.round(height * 5);
  }

  _updateObjectPosition(hitMatrix) {
    this._currentModel.position.setFromMatrixPosition(hitMatrix);
    const origin = this._modelOrigin.clone();
    this._lookAtOnY(this._currentModel, this._camera, origin);
    this._currentModel.position.sub(origin);
    this._currentModel.updateMatrixWorld();
    // Put it slightly higher than the plane so the reticle is drawn under the
    // shadow.
    this._shadowMesh.position.y = this._currentModel.position.y + 0.1;
  }

  _addFlowerToScene() {
    if (!this._currentModel) {
      let flower = this._flowerModel.scene;
      flower.name = 'flower';
      flower.traverse( (child) => {
        child.castShadow = true;
      });
      this._currentModel = flower;
    }
    this._scene.add(this._currentModel);
    this._fitObjectInCameraView(0.2);
  }

  _addVelociraptorToScene() {
    if (!this._currentModel) {
      let velociraptor = this._velociraptorModel.scene;
      velociraptor.name = 'velociraptor';
      this._velociraptorModel.animations.forEach((clip) => {
        let mixer = new AnimationMixer(velociraptor);
        this._animationMixers.push(mixer);
        if(clip.name === "ArmatureAction.001")
          mixer.clipAction(clip).play();
      });
      this._currentModel = velociraptor;
    }
    this._scene.add(this._currentModel);
    this._fitObjectInCameraView(1);
  }

  _addPlaneToScene() {
    if (!this._currentModel) {
      let plane = this._planeModel.scene;
      plane.name = 'plane';
      this._planeModel.animations.forEach((clip) => {
        let mixer = new AnimationMixer(plane);
        this._animationMixers.push(mixer);
        if(clip.name === "Cube.004|Circle.005Action")
          mixer.clipAction(clip).play();
      });
      this._currentModel = plane;
    }
    this._scene.add(this._currentModel);
    this._fitObjectInCameraView(0.1);
  }

  _addAstronautToScene() {
    if (!this._currentModel) {
      let astronaut = this._astronautModel.scene;
      astronaut.name = 'astronaut';
      astronaut.traverse( (child) => {
        if (child.isMesh) {
          child.castShadow = true;
          let material = child.material;
          if (material.map) material.map.encoding = sRGBEncoding;
          if (material.emissiveMap) material.emissiveMap.encoding = sRGBEncoding;
          if (material.map || material.emissiveMap) material.needsUpdate = true;
          if (material.isMeshStandardMaterial || material.isGLTFSpecularGlossinessMaterial) {
            material.envMap = this._cuberRenderTarget.texture;
            material.envMapIntensity = 50;
            material.needsUpdate = true;
          }
        }
      });

      this._astronautModel.animations.forEach((clip) => {
          let mixer = new AnimationMixer(astronaut);
          this._animationMixers.push(mixer);
          if(clip.name === "moon_walk")
            mixer.clipAction(clip).play();
      });
      this._currentModel = astronaut;
    }
    this._scene.add(this._currentModel);
    this._fitObjectInCameraView(1.8);
  }

  async _toggleAR() {
    if (this._arActivated) {
      return this._deactivateAR();
    }
    return this._activateAR();
  }

  _handleSelect(event) {
    const x = 0;
    const y = 0;
    let raycaster = new Raycaster();
    raycaster.setFromCamera({ x, y }, this._camera);
    let rayOrigin = raycaster.ray.origin;
    let rayDirection = raycaster.ray.direction;
    let ray = new XRRay({x : rayOrigin.x, y : rayOrigin.y, z : rayOrigin.z},
      {x : rayDirection.x, y : rayDirection.y, z : rayDirection.z});
    this._xrSession.requestHitTest(ray, this._xrReferenceSpace).then((results) => {
      if (results.length) {
        let hitResult = results[0];
        if (!this._currentModel)
          this._addModelToScene();
        let hitMatrix = new Matrix4();
        hitMatrix.fromArray(hitResult.hitMatrix);
        this._updateObjectPosition(hitMatrix);
      }
    }).catch((reason) => { console.log("Hit Test failed because : " + reason) });
  }

  _addModelToScene() {
    switch (this._selectedModel) {
      case 0:
        this._addAstronautToScene();
        break;
      case 1:
        this._addFlowerToScene();
        break;
      case 2:
        this._addVelociraptorToScene();
        break;
      case 3:
        this._addPlaneToScene();
        break;
    }
    this._currentModel.visible = true;
  }

  render() {
    return html`
    <div class="welcome-section hidden ${classMap(this._welcomeClasses)}" id="welcome">
        <div class="welcome-content">
          <ul class="fly-in-text">
              <li>Welcome to</li>
              <li>Hello AR</li>
          </ul>
          <div class="compatibility-panel hidden">
            <div class="compatibility-item">WebXR Supported : <img id="webxr" src="images/cross.png"></div>
            <div class="compatibility-item">WebXR AR Module Supported : <img id="webxr-ar" src="images/cross.png"></div>
            <div class="compatibility-item">WebXR AR Hit Test Supported : <img id="webxr-hit-test" src="images/cross.png"></div>
          </div>
          <div class="start hidden" @click="${this._showCarousel}">Get Started here...</div>
        </div>
    </div>
    <div class="carousel-container ${classMap(this._carouselContainerClasses)}">
      <div class="close" @click="${this._closeCarousel}"></div>
      <div class="carousel-scroller">
        <div class="arrows" aria-label="scroll to previous image" @click="${(ev) => this._scrollToImage('previous', ev)}">
          <div class="arrow-left first"></div>
          <div class="arrow-left second"></div>
          <div class="arrow-left third"></div>
        </div>
        <div class="carousel">
          <ul class="scroll" id="scroller">
            <li class="scroll-item-outer">
              <img src="images/astronaut.png" alt="image of an astronaut" class="carrousel-image">
            </li>
            <li class="scroll-item-outer">
              <img src="images/flower.png" alt="image of a flower" class="carrousel-image">
            </li>
            <li class="scroll-item-outer">
              <img src="images/velociraptor.png" alt="image of a velociraptor" class="carrousel-image">
            </li>
            <li class="scroll-item-outer">
              <img src="images/plane.png" alt="image of a plane" class="carrousel-image">
            </li>
          </ul>
        </div>
        <div class="arrows" aria-label="scroll to next image" @click="${(ev) => this._scrollToImage('next', ev)}">
          <div class="arrow-right third"></div>
          <div class="arrow-right second"></div>
          <div class="arrow-right first"></div>
        </div>
      </div>
      <div class="ar-icon" aria-label="enter AR icon" @click="${this._toggleAR}">
        <img src="images/ar.png">
        <div class="ar-text">See it in AR</div>
      </div>
    </div>
    <div id="canvas-container"></div>
    <mwc-linear-progress determinate="true" progress="0" buffer="1" class="progress-bar ${classMap(this._loadingBarClasses)}"></mwc-linear-progress>
    <mwc-snackbar id="webxr-snackbar" stacked labelText="WebXR Device API is not supported in this browser.">
      <mwc-button id="actionButton" slot="action">More Information</mwc-button>
      <mwc-button id="closeButton" slot="dismiss">Dismiss</mwc-button>
    </mwc-snackbar>
    <mwc-snackbar stacked id="sw-snackbar" labelText="A newer version of the app is available.">
      <mwc-button id="reloadButton" slot="reload">RELOAD</mwc-button>
      <mwc-icon-button id="dismissButton" icon="close" slot="dismiss"></mwc-icon-button>
    </mwc-snackbar>`;
  }
}
