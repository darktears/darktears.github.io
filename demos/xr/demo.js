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
    this._checkForXR();
  }

  _checkForXR () {
    navigator.xr.requestDevice().then(device => {
      this._onXRAvailable(device);
    }, err => {
      if (err.message === 'NotFoundError') {
        // No XRDevices available.
        console.error('No XR devices available :', err);
      } else {
        // An error occurred while requesting an XRDevice.
        console.error('Requesting XR device failed :', err);
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
    this._loadViveMeshes();
    this._loadDaydreamMeshes();
    this._xrDevice.supportsSession({ exclusive: true }).then(() => {
      this._createPresentationButton();
      this._checkMagicWindowSupport();
    }).catch((err) => {
      console.log("VR not supported: " + err);
    });  
  }

  _loadViveMeshes() {
    let mesh = null;
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
    let mesh = null;
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
    var webxr = new new THREE.TextureLoader().load('webxr.jpg');
    var webxrGray = new new THREE.TextureLoader().load('webxr-gray.jpg');

    this._boxMaterial = new THREE.MeshBasicMaterial({map:webxr, side:THREE.DoubleSide});
    this._boxMaterialGray = new THREE.MeshBasicMaterial({map:webxrGray, side:THREE.DoubleSide});

    this._box = new THREE.Mesh(boxGeometry, this._boxMaterial);
    this._box.position.z = 5;
    this._box.position.y = 1;

    // Room.
    var roofTexture = new THREE.TextureLoader().load('ceiling.jpg');
    roofTexture.wrapS = roofTexture.wrapT = THREE.RepeatWrapping;
    roofTexture.repeat.set( 8, 8 );

    var wallTexture = new THREE.TextureLoader().load('wall1.jpg' );
    wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
    wallTexture.repeat.set( 3, 1 );

    var floorTexture = new THREE.TextureLoader().load('floor.jpg');
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
    const roomGeometry = new THREE.BoxGeometry(10, 3, 10, 10, 3, 10);
    const room = new THREE.Mesh(roomGeometry, materials);
    room.position.z = 2;
    room.position.y = 1;

    let light = new THREE.PointLight('#ffffff', 1, 2, 0.5);
    light.position.y = 2;
    this._scene.add(light);

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
      this._xrFrameOfRef = await this._xrSession.requestFrameOfReference("eyeLevel");

      // Create the WebGL layer.
      await this._renderer.vr.setDevice(this._xrDevice);
      this._renderer.domElement.hidden = true;
      this._magicWindowCanvas.hidden = false;
      this._xrSession.baseLayer = new XRWebGLLayer(this._xrSession, this._renderer.context);

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
      // ‘Exclusive’ means rendering into the HMD.
      this._xrSession = await this._xrDevice.requestSession({ exclusive: true });
      this._xrSession.addEventListener('end', _ => { this._onSessionEnded(); });

      this._xrSession.depthNear = Demo.CAMERA_SETTINGS.near;
      this._xrSession.depthFar = Demo.CAMERA_SETTINGS.far;

      // Reference frame for VR: stage vs headModel.
      this._xrFrameOfRef = await this._xrSession.requestFrameOfReference("stage");

      // Create the WebGL layer.
      await this._renderer.vr.setDevice(this._xrDevice);
      this._renderer.domElement.hidden = false;
      if (this._magicWindowCanvas)
        this._magicWindowCanvas.hidden = true;
      this._xrSession.baseLayer = new XRWebGLLayer(this._xrSession, this._renderer.context);
      
      // Enter the rendering loop.
      this._xrSession.requestAnimationFrame(this._update);
    
    } catch (error) {
      console.log("Error while requesting the exclusive session : " + error);
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

  _updateInput(xrFrame) {
    let inputSources = this._xrSession.getInputSources();
    let intersected = false;
    for (let inputSource of inputSources) {
      let inputPose = xrFrame.getInputPose(inputSource, this._xrFrameOfRef);

      if (!inputPose)
        continue;

      if (inputPose.gripMatrix) {
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
        controller.matrix.fromArray(inputPose.gripMatrix);
        controller.updateMatrixWorld(true);
      }
      if (inputPose.pointerMatrix) {
        if (inputSource.pointerOrigin == 'hand') {
          let laser = null;
          if (this._activeLasers < this._lasers.length) {
            laser = this._lasers[this._activeLasers];
          } else {
            var material = new THREE.LineBasicMaterial({
              color: this._getRandomColor()
            });

            var geometry = new THREE.Geometry();
            geometry.vertices.push(
              new THREE.Vector3( 0, 0, 0 ),
              new THREE.Vector3( 0, 0, -5 ),
            );

            laser = new THREE.Line( geometry, material );
            this._lasers.push(laser);
            this._scene.add(laser);
          }
          this._activeLasers = this._activeLasers + 1;
          laser.visible = true;
          laser.matrixAutoUpdate = false;
          laser.matrix.fromArray(inputPose.pointerMatrix);
          laser.updateMatrixWorld(true);

          let destination = new THREE.Vector3(0, 0, -1);
          let rot = new THREE.Quaternion();
          laser.getWorldQuaternion(rot);
          destination.applyQuaternion(rot);

          let raycaster = new THREE.Raycaster();
          raycaster.set(laser.position, destination);
          let intersects = raycaster.intersectObject(this._box, true);
          if (intersects.length > 0) {
            intersected = true;
          }
        }
      }
    }
    this._activeControllers = 0;
    this._activeLasers = 0;
    if (intersected) {
      this._box.material = this._boxMaterialGray;
    } else {
      this._box.material = this._boxMaterial;
    }
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
}

new Demo();
