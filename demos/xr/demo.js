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

    this._onResize = this._onResize.bind(this);

    this._disabled = false;
    this._firstVRFrame = false;
    this._xrDevice;
    this._xrSession;
    this._xrFrameOfRef;
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
    let magicWindowCtx = this._renderer.domElement.getContext('xrpresent');
    // Check to see if the UA can support a non-exclusive sessions with the given output context.
    return xrDevice.supportsSession({ outputContext: magicWindowCtx })
        .then(() => { console.log("Magic Window content is supported!"); })
        .catch((reason) => { console.log("Magic Window content is not supported: " + reason); });
  }

  _onXRAvailable(device) {
    this._xrDevice = device;
    this._xrDevice.supportsSession({ exclusive: true }).then(() => {
      this._createPresentationButton();
    }).catch((err) => {
      _checkMagicWindowSupport();
      console.log("VR not supported: " + err);
    });  
  }

  _addVREventListeners () {
    window.addEventListener('vrdisplayactivate', _ => {
      this._activateVR();
    });

    window.addEventListener('vrdisplaydeactivate', _ => {
      this._deactivateVR();
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
    var webvr = new THREE.ImageUtils.loadTexture("webvr.jpg"); 
    const boxMaterial = new THREE.MeshBasicMaterial({map:webvr, side:THREE.DoubleSide});

    this._box = new THREE.Mesh(boxGeometry, boxMaterial);
    this._box.position.z = -5;

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

    this._scene.add(this._box);
    this._scene.add(room);
  }

  _showNoPresentError () {
    console.error(`Unable to present with this device ${this._vr.display}`);
  }

  _showWebVRNotSupportedError () {
    console.error('WebVR not supported');
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

  _toggleVR () {
    if (this._xrSession) {
      return this._deactivateVR();
    }

    return this._activateVR();
  }

  _deactivateVR () {
    if (!this._xrDevice) {
      return;
    }

    if (!this._xrSession) {
      return;
    }

    this._xrSession.end();
    this._xrSession = undefined;
    return;
  }

  async _activateVR () {
    if (!this._xrDevice) {
      return;
    }

    try {
      // ‘Exclusive’ means rendering into the HMD.
      this._xrSession = await this._xrDevice.requestSession({ exclusive: true });

      this._xrSession.depthNear = Demo.CAMERA_SETTINGS.near;
      this._xrSession.depthFar = Demo.CAMERA_SETTINGS.far;
      
      // Reference frame for VR: stage vs headModel.
      this._xrFrameOfRef = await this._xrSession.requestFrameOfReference("headModel");

      let gl = this._renderer.domElement.getContext('webgl');
      await gl.setCompatibleXRDevice(this._xrDevice);
  
      // Create the WebGL layer.
      this._xrSession.baseLayer = new XRWebGLLayer(this._xrSession, gl);
      
      // Enter the rendering loop.
      this._xrSession.requestAnimationFrame(this._update);
    
    } catch (error) {
      console.log("Error : " + error);
    };
  }

    _render (timestamp, xrFrame) {
    if (this._disabled || !(this._xrSession)) {
      // Ensure that we switch everything back to auto for non-VR mode.
      this._onResize();
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
    console.log(xrFrame);
    let pose = xrFrame.getDevicePose(this._xrFrameOfRef);
    let xrLayer = this._xrSession.baseLayer;
  
    const gl = this._renderer.domElement.getContext('webgl');
    gl.bindFramebuffer(gl.FRAMEBUFFER, xrLayer.framebuffer);

    for (let view of xrFrame.views) {
      let viewport = xrLayer.getViewport(view);
      this._renderEye(
        pose.getViewMatrix(view),
        view.projectionMatrix,
        {
          x: viewport.x,
          y: viewport.y,
          w: viewport.width,
          h: viewport.height
      });
      // Ensure that left eye calcs aren't going to interfere.
      this._renderer.clearDepth();
    }

    // Use the VR display's in-built rAF (which can be a diff refresh rate to
    // the default browser one).
    this._xrSession.requestAnimationFrame(this._update);

  }

  _renderEye (viewMatrix, projectionMatrix, viewport) {
    // Set the left or right eye half.
    console.log(viewport)
    this._renderer.setViewport(viewport.x, viewport.y, viewport.w, viewport.h);

    // Update the scene and camera matrices.
    this._camera.projectionMatrix.fromArray(projectionMatrix);
    this._scene.matrix.fromArray(viewMatrix);

    // Tell the scene to update (otherwise it will ignore the change of matrix).
    this._scene.updateMatrixWorld(true);
    this._renderer.render(this._scene, this._camera);
  }
}

new Demo();
