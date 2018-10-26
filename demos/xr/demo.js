/*!
 *
 * Copyright 2016 Google Inc. All rights reserved.
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

'use strict';

var polyfill = new WebXRPolyfill();

class Demo {

  static get CAMERA_SETTINGS () {
    return {
      viewAngle: 45,
      near: 0.1,
      far: 10000
    };
  }

  static get VIVE_CONTROLLER_MODEL_URL () { return 'https://cdn.aframe.io/controllers/vive/'; }
  static get DAYDREAM_CONTROLLER_MODEL_URL () { return 'https://cdn.aframe.io/controllers/google/'; }

  constructor () {
    this._width;
    this._height;
    this._renderer;
    this._camera;
    this._aspect;
    this._settings;
    this._box;
    this._boxMaterial;
    this._boxMaterialGray;
    this._container = document.querySelector('#container');
    this._startMessage = document.querySelector('#start');
    this._touchControls = document.querySelector('#touchControls');

    this.clearContainer();
    this.createRenderer();

    this._onResize = this._onResize.bind(this);
    this._update = this._update.bind(this);
    this._onResize();

    this.createCamera();
    this.createScene();
    this.createMeshes();

    this._addEventListeners();
    requestAnimationFrame(this._update);

    this._firstVRFrame = false;
    this._xrDevice;
    this._xrSession;
    this._xrFrameOfRef;
    this._magicWindowCanvas;
    this._activeControllers = 0;
    this._controllers = [];
    this._controllersMeshes = [];
    this._activeLasers = 0;
    this._lasers = [];
    this._cursors = [];
    this._activeCursors = 0;
    this._prevTime = performance.now();
    this._velocity = new THREE.Vector3();
    this._userPosition = new THREE.Vector3();
    this._moveForward = false;
    this._moveBackward = false;
    this._moveRight = false;
    this._moveLeft = false;
    this._checkForXR();
  }

  _checkForXR () {
    navigator.xr.requestDevice().then(device => {
      this._onXRAvailable(device);
    }, err => {
      // Let's provide a mouse/keyboard based interaction.
      this._enableKeyboardMouse();
      if (err.message === 'NotFoundError') {
        // No XRDevices available.
        console.error('No XR devices available :', err);
      } else {
        // An error occurred while requesting an XRDevice.
        console.error('Requesting XR device failed :', err);
      }
    });
  }

  _enableKeyboardMouse() {
    if (!this._hasPointerLock())
      return;
    this._controls = new THREE.PointerLockControls(this._camera);
    this._scene.add(this._controls.getObject());
    this._controls.getObject().position.y = 1;
    this._camera.lookAt(new THREE.Vector3(0, 0, 1));
    // Hook pointer lock state change events
    document.addEventListener('pointerlockchange', _ => { this._pointerLockChanged() }, false );
    document.addEventListener('mozpointerlockchange', _ => { this._pointerLockChanged() }, false );
    document.addEventListener('webkitpointerlockchange', _ => { this._pointerLockChanged() }, false );
    document.addEventListener('keydown', event => { this._onKeyDown(event) }, false );
    document.addEventListener('keyup', event => { this._onKeyUp(event) }, false );

    document.body.addEventListener( 'click', _ => {
      // Ask the browser to lock the pointer
      document.body.requestPointerLock = document.body.requestPointerLock || document.body.mozRequestPointerLock || document.body.webkitRequestPointerLock;
      document.body.requestPointerLock();
    }, false);
  }

  _onKeyDown(event) {
    switch ( event.keyCode ) {
      case 38: // up
      case 87: // w
        this._moveForward = true;
        break;
      case 37: // left
      case 65: // a
        this._moveLeft = true; break;
      case 40: // down
      case 83: // s
        this._moveBackward = true;
        break;
      case 39: // right
      case 68: // d
        this._moveRight = true;
        break;
    }
  }

  _onKeyUp(event) {
    switch( event.keyCode ) {
      case 38: // up
      case 87: // w
        this._moveForward = false;
        break;
      case 37: // left
      case 65: // a
        this._moveLeft = false;
        break;
      case 40: // down
      case 83: // s
        this._moveBackward = false;
        break;
      case 39: // right
      case 68: // d
        this._moveRight = false;
        break;
    }
  }

  _hideStartMessage() {
    this._startMessage.style.display = 'none';
  }

  _showStartMessage() {
    this._startMessage.style.display = 'flex';
  }

  _hideTouchControls() {
    this._touchControls.style.display = 'none';
  }

  _showTouchControls() {
    this._touchControls.style.display = 'inline';
  }

  _pointerLockChanged() {
    if (document.pointerLockElement === document.body || document.mozPointerLockElement === document.body || document.webkitPointerLockElement === document.body) {
      this._controls.enabled = true;
      this._hideStartMessage();
    } else {
      this._showStartMessage();
      this._controls.enabled = false;
    }
  }

  _checkMagicWindowSupport() {
    this._magicWindowCanvas = document.createElement("canvas");
    let magicWindowContext = this._magicWindowCanvas.getContext('xrpresent');
    // Check to see if the UA can support a non-immersive sessions with the given output context.
    return this._xrDevice.supportsSession({ outputContext: magicWindowContext })
        .then(() => {
          this._activateMagicWindow(magicWindowContext);
          this._magicWindowCanvas.width = this._width;
          this._magicWindowCanvas.height = this._height;
          this._container.appendChild(this._magicWindowCanvas);
        })
        .catch((reason) => { console.log("Magic Window content is not supported: " + reason); });
  }

  _onXRAvailable(device) {
    this._xrDevice = device;
    this._hideStartMessage();
    this._loadViveMeshes();
    this._loadDaydreamMeshes();
    this._xrDevice.supportsSession({ immersive: true }).then(() => {
      this._createPresentationButton();
      this._checkMagicWindowSupport();
    }).catch((err) => {
      console.log("VR not supported: " + err);
    });
  }

  _loadViveMeshes() {
    let mtlLoader = new THREE.MTLLoader();
    mtlLoader.crossOrigin = '';
    mtlLoader.setPath(Demo.VIVE_CONTROLLER_MODEL_URL);
    mtlLoader.load('vr_controller_vive.mtl', (materials) => {
      materials.preload();
      let objLoader = new THREE.OBJLoader();
      objLoader.setMaterials( materials );
      objLoader.setPath(Demo.VIVE_CONTROLLER_MODEL_URL);
      objLoader.load('vr_controller_vive.obj', (object) => {
        this._controllersMeshes['vive'] = object;
      });
    });
  }

  _loadDaydreamMeshes() {
    let mtlLoader = new THREE.MTLLoader();
    mtlLoader.crossOrigin = '';
    mtlLoader.setPath(Demo.DAYDREAM_CONTROLLER_MODEL_URL);
    mtlLoader.load('vr_controller_daydream.mtl', (materials) => {
      materials.preload();

      var objLoader = new THREE.OBJLoader();
      objLoader.setMaterials( materials );
      objLoader.setPath(Demo.DAYDREAM_CONTROLLER_MODEL_URL);
      objLoader.load('vr_controller_daydream.obj', (object) => {
        this._controllersMeshes['daydream'] = object;
      });
    });
  }

  _update (timestamp, xrFrame) {
    const ROTATION_VALUE = 4;
    const time = window.performance.now() * 0.0001;

    this._box.rotation.x = Math.sin(time) * ROTATION_VALUE;
    this._box.rotation.y = Math.cos(time) * ROTATION_VALUE;

    this._render(timestamp, xrFrame);
  }

  _onResize () {
    this._width = window.innerWidth;
    this._height = window.innerHeight;
    this._aspect = this._width / this._height;

    this._renderer.setSize(this._width, this._height);

    if (this._magicWindowCanvas) {
      this._magicWindowCanvas.width = this._width;
      this._magicWindowCanvas.height = this._height;
    }

    if (!this._camera) {
      return;
    }

    this._camera.aspect = this._aspect;
    this._camera.updateProjectionMatrix();
  }

  _addEventListeners () {
    window.addEventListener('resize', this._onResize);
  }

  clearContainer () {
    this._container.innerHTML = '';
  }

  createRenderer () {
    this._renderer = new THREE.WebGLRenderer({ antialias : true });
    this._container.appendChild(this._renderer.domElement);
  }

  createCamera () {
    this._settings = Demo.CAMERA_SETTINGS;
    this._camera = new THREE.PerspectiveCamera(
        this._settings.viewAngle,
        this._aspect,
        this._settings.near,
        this._settings.far
    );
  }

  createScene () {
    this._scene = new THREE.Scene();
  }

  createMeshes () {
    // Box.
    const boxGeometry = new THREE.BoxGeometry(2, 1, 1);
    let webxr = new new THREE.TextureLoader().load('webxr.jpg');
    let webxrGray = new new THREE.TextureLoader().load('webxr-gray.jpg');

    this._boxMaterial = new THREE.MeshBasicMaterial({map:webxr, side:THREE.DoubleSide});
    this._boxMaterialGray = new THREE.MeshBasicMaterial({map:webxrGray, side:THREE.DoubleSide});

    this._box = new THREE.Mesh(boxGeometry, this._boxMaterial);
    this._box.name = "box";
    this._box.position.z = 5;
    this._box.position.y = 1;
    this._scene.add(this._box);

    // Room.
    let roofTexture = new THREE.TextureLoader().load('ceiling.jpg');
    roofTexture.wrapS = roofTexture.wrapT = THREE.RepeatWrapping;
    roofTexture.repeat.set(8, 8);

    let wallTexture = new THREE.TextureLoader().load('wall1.jpg' );
    wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
    wallTexture.repeat.set(3, 1);

    let floorTexture = new THREE.TextureLoader().load('floor.jpg');
    floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(20, 20);

    let wallMaterial = [
      new THREE.MeshBasicMaterial({
          map: wallTexture,
          side: THREE.DoubleSide
      })
    ];

    let roofMaterial = [
      new THREE.MeshBasicMaterial({
          map: roofTexture,
          side: THREE.DoubleSide
      })
    ];

    let floorMaterial = [
      new THREE.MeshBasicMaterial({
          map: floorTexture,
          side: THREE.BackSide
      })
    ];

    //Build the walls.
    const roomGeometry = new THREE.PlaneGeometry(10, 3);
    let wall = new THREE.Mesh(roomGeometry, wallMaterial);
    wall.position.z = 7;
    wall.position.y = 1;
    this._scene.add(wall);

    wall = new THREE.Mesh(roomGeometry, wallMaterial);
    wall.position.z = 2;
    wall.position.y = 1;
    wall.position.x = 5;
    wall.rotation.y = -Math.PI / 2;
    this._scene.add(wall);

    wall = new THREE.Mesh(roomGeometry, wallMaterial);
    wall.position.z = -3;
    wall.position.y = 1;
    this._scene.add(wall);

    wall = new THREE.Mesh(roomGeometry, wallMaterial);
    wall.position.z = 2;
    wall.position.x = -5;
    wall.position.y = 1;
    wall.rotation.y = -Math.PI / 2;
    this._scene.add(wall);

    const squareGeometry = new THREE.PlaneGeometry(10, 10);
    this._floor = new THREE.Mesh(squareGeometry, floorMaterial);
    this._floor.position.z = 2;
    this._floor.position.y = -0.5;
    this._floor.rotation.x = Math.PI / 2;
    this._floor.name = "floor";
    this._scene.add(this._floor);

    let roof = new THREE.Mesh(squareGeometry, roofMaterial);
    roof.position.z = 2;
    roof.position.y = 2.5;
    roof.rotation.x = Math.PI / 2;
    this._scene.add(roof);

    let light = new THREE.PointLight('#ffffff', 1, 0, 0.5 );
    light.position.y = 2;
    light.name = "light";
    this._scene.add(light);
  }

  _createPresentationButton () {
      this._button = document.createElement('button');
      this._button.classList.add('vr-toggle');
      this._button.textContent = 'Switch to XR';
      this._button.addEventListener('click', _ => {
        this._toggleVR();
      });
      document.body.appendChild(this._button);
  }

  async _toggleVR () {
    if (!this._renderer.domElement.hidden && this._xrSession) {
      return this._deactivateVR();
    }

    if (this._renderer.domElement.hidden && this._xrSession) {
      await this._xrSession.end();
      this._xrSession = null;
      this._xrFrameOfRef = null;
    }

    return this._activateVR();
  }

  async _deactivateVR () {
    if (!this._xrDevice) {
      return;
    }

    if (!this._xrSession) {
      return;
    }

    await this._xrSession.end();
  }

  async _onSessionEnded () {
    this._xrSession = null;
    this._xrFrameOfRef = null;
    this._renderer.context.bindFramebuffer(this._renderer.context.FRAMEBUFFER, null);
    this._activeControllers = 0;
    for (let controller of this._controllers) {
      this._scene.remove(controller);
    }
    this._controllers = [];
    this._activeLasers = 0;
    for (let laser of this._lasers) {
      this._scene.remove(laser);
    }
    this._lasers = [];
    this._activeCursors = 0;
    for (let cursor of this._cursors) {
      this._scene.remove(cursor);
    }
    this._cursors = [];
    requestAnimationFrame(this._update);
    if (this._magicWindowCanvas)
      this._activateMagicWindow(this._magicWindowCanvas.getContext('xrpresent'));
  }

  async _activateMagicWindow (ctx) {
    if (!this._xrDevice) {
      return;
    }

    try {
      this._xrSession = await this._xrDevice.requestSession({ outputContext: ctx });

      this._xrSession.depthNear = Demo.CAMERA_SETTINGS.near;
      this._xrSession.depthFar = Demo.CAMERA_SETTINGS.far;

      // Reference frame for VR: stage vs headModel.
      this._xrFrameOfRef = await this._xrSession.requestFrameOfReference("eye-level");

      // Create the WebGL layer.
      await this._renderer.vr.setDevice(this._xrDevice);
      this._renderer.domElement.hidden = true;
      this._magicWindowCanvas.hidden = false;
      this._xrSession.baseLayer = new XRWebGLLayer(this._xrSession, this._renderer.context);
      this._userPosition.set(0, 0 ,0);

      this._showTouchControls();
      if (window.PointerEvent) {
        const left = document.querySelector('#left');
        left.addEventListener('pointerdown', ev => {
          this._moveLeft = true;
          left.style.borderRightColor = "#e00d26";
        });
        ['pointerup', 'pointerout'].forEach(ev => left.addEventListener(ev, _ => {
          this._moveLeft = false;
          left.style.borderRightColor = "black";
        }));
        const up = document.querySelector('#up');
        up.addEventListener('pointerdown', ev => {
          this._moveForward = true;
          up.style.borderBottomColor = "#e00d26";
        });
        ['pointerup', 'pointerout'].forEach(ev => up.addEventListener(ev, _ => {
          this._moveForward = false;
          up.style.borderBottomColor = "black";
        }));
        const down = document.querySelector('#down');
        down.addEventListener('pointerdown', ev => {
          this._moveBackward = true;
          down.style.borderTopColor = "#e00d26";
        });
        ['pointerup', 'pointerout'].forEach(ev => down.addEventListener(ev, _ => {
          this._moveBackward = false;
          down.style.borderTopColor = "black";
        }));
        const right = document.querySelector('#right');
        right.addEventListener('pointerdown', ev => {
          this._moveRight = true;
          right.style.borderLeftColor = "#e00d26";
        });
        ['pointerup', 'pointerout'].forEach(ev => right.addEventListener(ev, _ => {
          this._moveRight = false;
          right.style.borderLeftColor = "black";
        }));
      } else {
        // FIXME: touch events for iOS.
      }

      // Enter the rendering loop.
      this._xrSession.requestAnimationFrame(this._update);

    } catch (error) {
      console.log("Error while requesting magic window session : " + error);
    };
  }

  async _activateVR () {
    if (!this._xrDevice) {
      return;
    }

    try {
      // ‘Immersive’ means rendering into the HMD.
      this._xrSession = await this._xrDevice.requestSession({ immersive: true });
      this._xrSession.addEventListener('end', _ => { this._onSessionEnded(); });

      this._xrSession.depthNear = Demo.CAMERA_SETTINGS.near;
      this._xrSession.depthFar = Demo.CAMERA_SETTINGS.far;

      // Reference frame for VR: stage vs headModel.
      this._xrFrameOfRef = await this._xrSession.requestFrameOfReference("stage");
      this._xrSession.addEventListener('select', (ev) => {
          this._handleSelect(ev.inputSource, ev.frame, this._xrFrameOfRef);
      });

      // Create the WebGL layer.
      await this._renderer.vr.setDevice(this._xrDevice);
      this._renderer.domElement.hidden = false;
      if (this._magicWindowCanvas) {
        this._magicWindowCanvas.hidden = true;
        this._hideTouchControls();
      }
      this._xrSession.baseLayer = new XRWebGLLayer(this._xrSession, this._renderer.context);

      // Enter the rendering loop.
      this._xrSession.requestAnimationFrame(this._update);

    } catch (error) {
      console.log("Error while requesting the immersive session : " + error);
    };
  }

  _updatePosition() {
    let time = performance.now();
    let delta = (time - this._prevTime) / 1000;

    // Decrease the velocity.
    this._velocity.x -= this._velocity.x * 10.0 * delta;
		this._velocity.z -= this._velocity.z * 10.0 * delta;

    let controls_yaw = this._controls.getObject();

    if (this._moveForward) this._velocity.z += 100.0 * delta;
    if (this._moveBackward) this._velocity.z -= 100.0 * delta;
    if (this._moveLeft) this._velocity.x += 100.0 * delta;
    if (this._moveRight) this._velocity.x -= 100.0 * delta;

    controls_yaw.translateX(this._velocity.x * delta);
    controls_yaw.translateZ(this._velocity.z * delta);

    if (controls_yaw.position.z > 6)
      controls_yaw.position.z = 6;
    if (controls_yaw.position.z < -2)
      controls_yaw.position.z = -2;

    if (controls_yaw.position.x > 4)
      controls_yaw.position.x = 4;
    if (controls_yaw.position.x < -4)
      controls_yaw.position.x = -4;

    this._prevTime = time;
  }

  _render (timestamp, xrFrame) {
    if (!this._xrSession) {
      // Ensure that we switch everything back to auto for non-VR mode.
      this._onResize();
      this._renderer.setViewport(0, 0, this._width, this._height);
      this._renderer.autoClear = true;
      this._scene.matrixAutoUpdate = true;
      if (this._controls && this._controls.enabled) {
        this._updatePosition();
      }
      this._renderer.render(this._scene, this._camera);
      return requestAnimationFrame(this._update);
    }
    if (!xrFrame)
      return;

    // Disable autoupdating because these values will be coming from the
    // frameData data directly.
    this._scene.matrixAutoUpdate = false;

    // Make sure not to clear the renderer automatically, because we will need
    // to render it ourselves twice, once for each eye.
    this._renderer.autoClear = false;

    // Clear the canvas manually.
    this._renderer.clear();

    // Get pose data.
    let pose = xrFrame.getDevicePose(this._xrFrameOfRef);
    if (!pose)
      return;

    let xrLayer = this._xrSession.baseLayer;

    this._renderer.setSize(xrLayer.framebufferWidth, xrLayer.framebufferHeight, false);

    this._renderer.context.bindFramebuffer(this._renderer.context.FRAMEBUFFER, xrLayer.framebuffer);

    this._updateInput(xrFrame);

    for (let view of xrFrame.views) {
      let viewport = xrLayer.getViewport(view);
      this._renderEye(
        pose.getViewMatrix(view),
        view.projectionMatrix,
        viewport);
    }

    // Use the VR display's in-built rAF (which can be a diff refresh rate to
    // the default browser one).
    this._xrSession.requestAnimationFrame(this._update);
  }

  _renderEye (viewMatrixArray, projectionMatrix, viewport) {
    // Set the left or right eye half.
    this._renderer.setViewport(viewport.x, viewport.y, viewport.width, viewport.height);

    let viewMatrix = new THREE.Matrix4();
    viewMatrix.fromArray(viewMatrixArray);

    if (this._magicWindowCanvas && this._magicWindowCanvas.hidden === false) {
      this._calculateMagicWindowPosition(viewMatrix);
      this._translateViewMatrix(viewMatrix, this._userPosition);
    } else {
      // We need to adjust the view matrix if the user was teleported.
      let invertedTeleportTranslation = new THREE.Vector3();
      invertedTeleportTranslation.copy(this._userPosition).negate();
      this._translateViewMatrix(viewMatrix, invertedTeleportTranslation);
    }
    // Update the scene and camera matrices.
    this._camera.projectionMatrix.fromArray(projectionMatrix);
    this._camera.matrixWorldInverse.copy(viewMatrix);
    this._scene.matrix.copy(viewMatrix);

    // Tell the scene to update (otherwise it will ignore the change of matrix).
    this._scene.updateMatrixWorld(true);
    this._renderer.render(this._scene, this._camera);
    // Ensure that left eye calcs aren't going to interfere.
    this._renderer.clearDepth();
  }

  _calculateMagicWindowPosition(viewMatrix) {
    let rotation = new THREE.Quaternion();
    viewMatrix.decompose(new THREE.Vector3(), rotation, new THREE.Vector3());
    let time = performance.now();
    let delta = (time - this._prevTime) / 1000;

    // Decrease the velocity.
    this._velocity.x -= this._velocity.x * 10.0 * delta;
    this._velocity.z -= this._velocity.z * 10.0 * delta;

    let invertedRotation = rotation.inverse();
    // Extract the yaw rotation only.
    let norm = Math.sqrt(invertedRotation.w * invertedRotation.w + invertedRotation.y * invertedRotation.y);
    let invertedYawRotation = new THREE.Quaternion(0, invertedRotation.y / norm, 0, invertedRotation.w / norm);

    let delta_z = 0;
    let delta_x = 0;
    if (this._moveForward) delta_z = 100.0 * delta * delta;
    if (this._moveBackward) delta_z = -100.0 * delta * delta;
    if (this._moveLeft) delta_x = 100.0 * delta * delta;
    if (this._moveRight) delta_x = -100.0 * delta * delta;

    // Move back to view coordinates.
    let deltaPosition = new THREE.Vector3(delta_x, 0, delta_z);
    deltaPosition.applyQuaternion(invertedYawRotation);

    this._userPosition.add(deltaPosition);

    // Check bounds.
    if (this._userPosition.z > 2)
      this._userPosition.z = 2;
    if (this._userPosition.z < -6)
      this._userPosition.z = -6;
    if (this._userPosition.x > 4)
      this._userPosition.x = 4;
    if (this._userPosition.x < -4)
      this._userPosition.x = -4;

    this._prevTime = time;
  }

  _translateViewMatrix(viewMatrix, translationVector) {
    let translationInView = new THREE.Vector3();
    translationInView.copy(translationVector);
    let viewMatrixWithoutTranslation = new THREE.Matrix4();
    viewMatrixWithoutTranslation.copy(viewMatrix);
    viewMatrixWithoutTranslation.setPosition(new THREE.Vector3());
    translationInView.applyMatrix4(viewMatrixWithoutTranslation);
    let translationInViewMatrix = new THREE.Matrix4();
    translationInViewMatrix.makeTranslation(translationInView.x, translationInView.y, translationInView.z);
    viewMatrix.premultiply(translationInViewMatrix);
  }

  _handleSelect(inputSource, frame, frameOfRef) {
    let inputPose = frame.getInputPose(inputSource, frameOfRef);

    if (!inputPose) {
      return;
    }

    let raycasterOrigin = new THREE.Vector3();
    let raycasterDestination = new THREE.Vector3(0, 0, -1);
    let pointerMatrix = new THREE.Matrix4();
    let pointerWorldMatrix = new THREE.Matrix4();
    pointerMatrix.fromArray(inputPose.targetRay.transformMatrix);
    let currentPosition = new THREE.Vector3(
      this._userPosition.x,
      this._userPosition.y,
      this._userPosition.z);
    let pointerPosition = new THREE.Vector3();
    pointerMatrix.decompose(pointerPosition, new THREE.Quaternion(), new THREE.Vector3());
    currentPosition.add(pointerPosition);
    pointerMatrix.setPosition(currentPosition);
    pointerWorldMatrix.multiplyMatrices(this._scene.matrixWorld, pointerMatrix);
    raycasterOrigin.setFromMatrixPosition(pointerWorldMatrix);
    let raycaster = new THREE.Raycaster();
    raycaster.set(raycasterOrigin, raycasterDestination.transformDirection(pointerWorldMatrix).normalize());
    let intersects = raycaster.intersectObject(this._floor);
    for (let intersect of intersects) {
      let position = new THREE.Vector3();
      pointerMatrix.multiply(new THREE.Matrix4().makeTranslation(0, 0, -intersect.distance + 0.1));
      pointerMatrix.decompose(position, new THREE.Quaternion(), new THREE.Vector3());
      position.y = 0;
      this._userPosition.copy(position);
      break;
    }
  }

  _updateInput(xrFrame) {
    let inputSources = this._xrSession.getInputSources();
    let intersected = false;
    for (let inputSource of inputSources) {
      let inputPose = xrFrame.getInputPose(inputSource, this._xrFrameOfRef);

      if (!inputPose)
        continue;

      if (inputPose.gripMatrix)
        this._drawController(inputPose.gripMatrix);

      if (inputPose.targetRay) {
        let color = this._getRandomColor();
        let raycasterOrigin = new THREE.Vector3();
        let raycasterDestination = new THREE.Vector3(0, 0, -1);
        let cursor = null;

        if (this._activeCursors < this._cursors.length) {
          cursor = this._cursors[this._activeCursors];
        } else {
          let geometry = new THREE.CircleGeometry(0.05, 30);
          let material = new THREE.MeshBasicMaterial(
            {color: color, transparent: true, opacity : 0.5, side: THREE.DoubleSide});
          cursor = new THREE.Mesh(geometry, material);
          cursor.name = 'cursor';
          this._cursors.push(cursor);
          this._scene.add(cursor);
        }
        this._activeCursors = this._activeCursors + 1;

        let pointerMatrix = new THREE.Matrix4();
        let pointerWorldMatrix = new THREE.Matrix4();
        let laserLength = 0;
        pointerMatrix.fromArray(inputPose.targetRay.transformMatrix);
        let currentPosition = new THREE.Vector3(
          this._userPosition.x,
          this._userPosition.y,
          this._userPosition.z);
        let pointerPosition = new THREE.Vector3();
        pointerMatrix.decompose(pointerPosition, new THREE.Quaternion(), new THREE.Vector3());
        currentPosition.add(pointerPosition);
        pointerMatrix.setPosition(currentPosition);
        pointerWorldMatrix.multiplyMatrices(this._scene.matrixWorld, pointerMatrix);
        raycasterOrigin.setFromMatrixPosition(pointerWorldMatrix);

        let raycaster = new THREE.Raycaster();
        raycaster.set(raycasterOrigin, raycasterDestination.transformDirection(pointerWorldMatrix).normalize());
        let intersects = raycaster.intersectObjects(this._scene.children, true);

        for (let intersect of intersects) {
          if (intersect.object.name === 'laser' || intersect.object.name === 'cursor' || intersect.object.name === 'body')
            continue;

          laserLength = -intersect.distance + 0.1;
          let laser = this._getActiveLaser(color);
          if (intersect.object.name == 'floor') {
            if (inputSource.targetRayMode == 'tracked-pointer')
              this._drawTeleporter(laser, laserLength, pointerMatrix, cursor);
          } else {
            if (intersect.object.name === 'box') {
              intersected = true;
              let normalMatrix = new THREE.Matrix3().getNormalMatrix(intersect.object.matrixWorld);
              let faceDirection = intersect.face.normal.clone().applyMatrix3(normalMatrix).normalize();
              let matrix = new THREE.Matrix4().lookAt(faceDirection,new THREE.Vector3(0,0,0),new THREE.Vector3(0,0,-1));
              let quaternion = new THREE.Quaternion().setFromRotationMatrix(matrix);
              cursor.quaternion.copy(quaternion);
            }
            if (inputSource.targetRayMode == 'tracked-pointer')
              this._drawStraightLaser(laser, laserLength, pointerMatrix, cursor);
            pointerMatrix.multiply(new THREE.Matrix4().makeTranslation(0, 0, laserLength));
            let position = new THREE.Vector3();
            pointerMatrix.decompose(position, new THREE.Quaternion(), new THREE.Vector3());
            cursor.position.copy(position);
          }
          cursor.rotation.set(intersect.object.rotation.x, intersect.object.rotation.y, intersect.object.rotation.z);
          break;
        }
      }
    }

    this._activeControllers = 0;
    this._activeLasers = 0;
    this._activeCursors = 0;

    if (intersected) {
      this._box.material = this._boxMaterialGray;
    } else {
      this._box.material = this._boxMaterial;
    }
  }

  _getActiveLaser(color) {
    let laser = null;
    if (this._activeLasers < this._lasers.length) {
      laser = this._lasers[this._activeLasers];
    } else {
      var material = new THREE.MeshBasicMaterial({color: color});
      let geometry = new THREE.BufferGeometry();
      laser = new THREE.Line(geometry, material);
      laser.name = 'laser';
      laser.frustumCulled = false;
      this._lasers.push(laser);
      this._scene.add(laser);
    }
    this._activeLasers = this._activeLasers + 1;
    return laser;
  }

  _drawController(gripMatrix) {
    let controller = null;
    if (this._activeControllers < this._controllers.length) {
      controller = this._controllers[this._activeControllers];
    } else {
      // FIXME: very stupid assumption
      if (this._isMobile())
        controller = this._controllersMeshes['daydream'].clone();
      else
        controller = this._controllersMeshes['vive'].clone();
      this._controllers.push(controller);
      this._scene.add(controller);
    }
    this._activeControllers = this._activeControllers + 1;
    controller.visible = true;
    controller.matrixAutoUpdate = false;
    let grip = new THREE.Matrix4();
    grip.fromArray(gripMatrix);
    let currentPosition = new THREE.Vector3(
      this._userPosition.x,
      this._userPosition.y,
      this._userPosition.z);
    let gripPosition = new THREE.Vector3();
    grip.decompose(gripPosition, new THREE.Quaternion(), new THREE.Vector3());
    currentPosition.add(gripPosition);
    grip.setPosition(currentPosition);
    controller.matrix.copy(grip);
    controller.updateMatrixWorld(true);
  }

  _drawStraightLaser(laser, length, pointerMatrix, cursor) {
    if (!laser)
      return;
    // It's a simple straight laser, we need 2 points (each of them have 3 coordinates).
    let vertices = new Float32Array(2 * 3);
    // Z coordinate for the second point.
    vertices[5] = length;
    laser.geometry.addAttribute('position', new THREE.BufferAttribute(vertices, 3));
    laser.geometry.attributes.position.array = vertices
    laser.geometry.verticesNeedUpdate = true;
    laser.visible = true;
    laser.matrixAutoUpdate = false;
    laser.matrix.copy(pointerMatrix);
    laser.updateMatrixWorld(true);

    let geometry = new THREE.CircleGeometry(0.05, 30);
    cursor.geometry.dispose();
    cursor.geometry = geometry;
  }

  _drawTeleporter(laser, length, pointerMatrix, cursor) {
    if (!laser)
      return;

    const drawCurve = false;
    if (drawCurve) {
      // 50 points to draw a curve is visually appealing.
      const numberOfPoints = 50;
      // Each points have 3 coordinates (x, y, z).
      let vertices = new Float32Array(numberOfPoints * 3);
      let x = 0;
      let y = 0;
      let z = 0;
      let index = 0;
      const gravity = 9.8;
      // We're shooting up and in -z (front), x is not affected.
      let direction = new THREE.Vector3(0, 1, -1);
      direction.multiplyScalar(5);
      for ( var i = 0, l = numberOfPoints; i < l; i ++ ) {
        vertices[index++] = x;
        vertices[index++] = y;
        vertices[index++] = z;
        let t = i / numberOfPoints;
        // We use the following formula to calculate the motion
        // of a projectile : x = Vx * t + 1/2 * g * t *t
        y = direction.y * t + 0.5 * -gravity * t * t;
        z = direction.z * t;
      }

      laser.geometry.addAttribute('position', new THREE.BufferAttribute(vertices, 3));
      laser.geometry.attributes.position.array = vertices;
      laser.geometry.verticesNeedUpdate = true;
      this._activeLasers = this._activeLasers + 1;
      laser.visible = true;
      laser.matrixAutoUpdate = false;
      laser.matrix.copy(pointerMatrix);
      laser.updateMatrixWorld(true);
    } else {
      this._drawStraightLaser(laser, length, pointerMatrix, cursor);
    }

    let position = new THREE.Vector3();
    pointerMatrix.multiply(new THREE.Matrix4().makeTranslation(0, 0, length));
    pointerMatrix.decompose(position, new THREE.Quaternion(), new THREE.Vector3());
    let geometry = new THREE.TorusGeometry(0.3, 0.02, 30, 32, 6.29);
    cursor.geometry.dispose();
    cursor.geometry = geometry;
    cursor.geometry.verticesNeedUpdate = true;
    cursor.position.copy(position);
  }

  _getRandomColor() {
    let letters = '0123456789ABCDEF';
    let color = '#';
    for (var i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  _isMobile() {
    var check = false;
    (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
    return check;
  }

  _hasPointerLock() {
    let havePointerLock = 'pointerLockElement' in document || 'mozPointerLockElement' in document || 'webkitPointerLockElement' in document;
    return havePointerLock;
  }
}

new Demo();
