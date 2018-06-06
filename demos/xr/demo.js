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

  constructor () {
    this._width;
    this._height;
    this._renderer;
    this._camera;
    this._aspect;
    this._settings;
    this._box;
    this._container = document.querySelector('#container');

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
    this._checkForXR();
  }

  _checkForXR () {
    navigator.xr.requestDevice().then(device => {
      this._onXRAvailable(device);
    }, err => {
      if (err.name === 'NotFoundError') {
        // No XRDevices available.
        console.error('No XR devices available:', err);
      } else {
        // An error occurred while requesting an XRDevice.
        console.error('Requesting XR device failed:', err);
      }
    });
  }

  _checkMagicWindowSupport() {
    this._magicWindowCanvas = document.createElement("canvas");
    let magicWindowContext = this._magicWindowCanvas.getContext('xrpresent');
    // Check to see if the UA can support a non-exclusive sessions with the given output context.
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
    this._xrDevice.supportsSession({ exclusive: true }).then(() => {
      this._createPresentationButton();
      //this._checkMagicWindowSupport();
    }).catch((err) => {
      console.log("VR not supported: " + err);
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
    const WIDTH = 2;
    const HEIGHT = 1;
    const DEPTH = 1;

    // Box.
    const boxGeometry = new THREE.BoxGeometry(WIDTH, HEIGHT, DEPTH);
    var webxr = new THREE.ImageUtils.loadTexture("webxr.jpg");
    const boxMaterial = new THREE.MeshBasicMaterial({map:webxr, side:THREE.DoubleSide});

    this._box = new THREE.Mesh(boxGeometry, boxMaterial);
    this._box.position.z = -5;
    this._box.position.y = 1;

    // Room.
    var roofTexture = new THREE.ImageUtils.loadTexture( 'ceiling.jpg' );
    roofTexture.wrapS = roofTexture.wrapT = THREE.RepeatWrapping;
    roofTexture.repeat.set( 8, 8 );

    var wallTexture = new THREE.ImageUtils.loadTexture( 'wall1.jpg' );
    wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
    wallTexture.repeat.set( 3, 1 );

    var floorTexture = new THREE.ImageUtils.loadTexture( 'floor.jpg' );
    floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set( 20, 20 );

    var materials = [
       new THREE.MeshBasicMaterial({
           map: wallTexture,
           side: THREE.BackSide
       }),
       new THREE.MeshBasicMaterial({
           map: wallTexture,
           side: THREE.BackSide
       }),
       new THREE.MeshBasicMaterial({
           map: roofTexture,
           side: THREE.BackSide
       }),
       new THREE.MeshBasicMaterial({
           map: floorTexture,
           side: THREE.BackSide
       }),
       new THREE.MeshBasicMaterial({
           map: wallTexture,
           side: THREE.BackSide
       }),
       new THREE.MeshBasicMaterial({
           map: wallTexture,
           side: THREE.BackSide
       })
    ];

    var multiMaterial = new THREE.MultiMaterial( materials );

    const roomGeometry = new THREE.BoxGeometry(10, 3, 10, 10, 3, 10);
    const room = new THREE.Mesh(roomGeometry, multiMaterial);
    room.position.z = -2;
    room.position.y = 1;

    this._scene.add(this._box);
    this._scene.add(room);
  }

  _createPresentationButton () {
      this._button = document.createElement('button');
      this._button.classList.add('vr-toggle');
      this._button.textContent = 'Enter VR';
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
    console.log("_deactivateVR")
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
    requestAnimationFrame(this._update);
    if (this._magicWindowCanvas)
      this._activateMagicWindow(this._magicWindowCanvas.getContext('xrpresent'));
  }

  async _activateMagicWindow (ctx) {
    if (!this._xrDevice) {
      return;
    }

    try {
      // ‘Exclusive’ means rendering into the HMD.
      this._xrSession = await this._xrDevice.requestSession({ outputContext: ctx });

      this._xrSession.depthNear = Demo.CAMERA_SETTINGS.near;
      this._xrSession.depthFar = Demo.CAMERA_SETTINGS.far;
      
      // Reference frame for VR: stage vs headModel.
      this._xrFrameOfRef = await this._xrSession.requestFrameOfReference("eyeLevel");

      // Create the WebGL layer.
      this._renderer.vr.setDevice(this._xrDevice);
      this._renderer.domElement.hidden = true;
      if (this._magicWindowCanvas)
        this._magicWindowCanvas.hidden = false;
      this._xrSession.baseLayer = new XRWebGLLayer(this._xrSession, this._renderer.context);

      // Enter the rendering loop.
      this._xrSession.requestAnimationFrame(this._update);

    } catch (error) {
      console.log("Error : " + error);
    };
  }

  async _activateVR () {
    if (!this._xrDevice) {
      return;
    }

    try {
      // ‘Exclusive’ means rendering into the HMD.
      this._xrSession = await this._xrDevice.requestSession({ exclusive: true });
      this._xrSession.addEventListener('end', this._onSessionEnded.bind(this));

      this._xrSession.depthNear = Demo.CAMERA_SETTINGS.near;
      this._xrSession.depthFar = Demo.CAMERA_SETTINGS.far;

      // Reference frame for VR: stage vs headModel.
      this._xrFrameOfRef = await this._xrSession.requestFrameOfReference("stage");

      // Create the WebGL layer.
      this._renderer.vr.setDevice(this._xrDevice);
      this._renderer.domElement.hidden = false;
      if (this._magicWindowCanvas)
        this._magicWindowCanvas.hidden = true;
      this._xrSession.baseLayer = new XRWebGLLayer(this._xrSession, this._renderer.context);
      this._renderer.setSize(this._xrSession.baseLayer.framebufferWidth, this._xrSession.baseLayer.framebufferHeight, false);
      
      // Enter the rendering loop.
      this._xrSession.requestAnimationFrame(this._update);
    
    } catch (error) {
      console.log("Error : " + error);
    };
  }

  _render (timestamp, xrFrame) {
    if (!this._xrSession) {
      // Ensure that we switch everything back to auto for non-VR mode.
      this._onResize();
      this._renderer.setViewport(0, 0, this._width, this._height);
      this._renderer.autoClear = true;
      this._scene.matrixAutoUpdate = true;
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
    let xrLayer = this._xrSession.baseLayer;

    this._renderer.context.bindFramebuffer(this._renderer.context.FRAMEBUFFER, xrLayer.framebuffer);

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

  _renderEye (viewMatrix, projectionMatrix, viewport) {
    // Set the left or right eye half.
    this._renderer.setViewport(viewport.x, viewport.y, viewport.width, viewport.height);

    // Update the scene and camera matrices.
    this._camera.projectionMatrix.fromArray(projectionMatrix);
    this._camera.matrixWorldInverse.fromArray(viewMatrix);
    this._scene.matrix.fromArray(viewMatrix);

    // Tell the scene to update (otherwise it will ignore the change of matrix).
    this._scene.updateMatrixWorld(true);
    this._renderer.render(this._scene, this._camera);
    // Ensure that left eye calcs aren't going to interfere.
    this._renderer.clearDepth();
  }
}

new Demo();
