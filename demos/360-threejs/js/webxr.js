// Copyright (c) 2018, Dongseong Hwang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';
class WebXR {

  constructor() {
    this._isUserInteracting = false;
    this._lon = 0;
    this._lat = 0;
    this._distance = 50;
    this._onPointerDownPointerX = 0;
    this._onPointerDownPointerY = 0;
    this._onPointerDownLon = 0;
    this._onPointerDownLat = 0;
    this._isVideoPlaying = false;
    this._firstTimeUpdate = false;
    this._xrSession= null;
    this._xrReferenceSpace = null;

    this.onWindowResize = this.onWindowResize.bind(this);
    this.render = this.render.bind(this);
    this.onDocumentMouseDown = this.onDocumentMouseDown.bind(this);
    this.onDocumentMouseMove = this.onDocumentMouseMove.bind(this);
    this.onDocumentMouseUp = this.onDocumentMouseUp.bind(this);
    this.onDocumentMouseWheel = this.onDocumentMouseWheel.bind(this);
    this.onVideoPlaying = this.onVideoPlaying.bind(this);
    this.onTimeUpdate = this.onTimeUpdate.bind(this);

    this._camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1100);
    this._camera.target = new THREE.Vector3(0, 0, 0);
    this._scene = new THREE.Scene();

    let geometry = new THREE.SphereBufferGeometry(500, 60, 40);
    // invert the geometry on the x-axis so that all of the faces point inward
    geometry.scale(- 1, 1, 1);

    let video = document.createElement('video');
    video.loop = true;
    video.muted = true;
    video.src = 'videos/elephants-hd.mp4';
    video.addEventListener("playing", this.onVideoPlaying, false);
    video.addEventListener("timeupdate", this.onTimeUpdate, false);
    video.setAttribute( 'webkit-playsinline', 'webkit-playsinline' );
    video.play();

    let texture = new THREE.VideoTexture(video);
    let material = new THREE.MeshBasicMaterial({ map: texture });
    let mesh = new THREE.Mesh(geometry, material);
    this._scene.add(mesh);

    this._renderer = new THREE.WebGLRenderer();
    //this._renderer.setPixelRatio(window.devicePixelRatio);
    this._renderer.setSize(window.innerWidth, window.innerHeight);

    let container = document.getElementById('container');
    container.appendChild(this._renderer.domElement);
    document.addEventListener('mousedown', this.onDocumentMouseDown, false);
    document.addEventListener('mousemove', this.onDocumentMouseMove, false);
    document.addEventListener('mouseup', this.onDocumentMouseUp, false);
    document.addEventListener('wheel', this.onDocumentMouseWheel, false);
    window.addEventListener('resize', this.onWindowResize, false);

    if (navigator.xr) {
      this.checkXRSupport();
    }
  }

  checkXRSupport() {
    navigator.xr.supportsSession('immersive-vr')
    .then(() => { this.createPresentationButton(); })
    .catch((err) => { console.log("Immersive XR not supported: " + err); });
  }

  createPresentationButton() {
    this.button_ = document.createElement('button');
    this.button_.classList.add('vr-toggle');
    this.button_.textContent = 'Enable XR';
    this.button_.addEventListener('click', _ => { this.toggleVR(); });
    document.body.appendChild(this.button_);
  }

  toggleVR() {
    if (this._xrSession)
      return this.deactivateVR();

    return this.activateVR();
  }

  async activateVR() {
    navigator.xr.requestSession('immersive-vr')
        .then(
            session => {
              this._xrSession = session;
              this._xrSession.addEventListener(
                  'end', _ => { this.onSessionEnded(); });

              // Create the WebGL layer.
              this._renderer.context.makeXRCompatible();
              let layer = new XRWebGLLayer(this._xrSession, this._renderer.context);
              this._xrSession.updateRenderState({
                baseLayer: layer
               });

              this.button_.textContent = 'Disable XR';
              session.requestReferenceSpace({ type:'stationary', subtype:'eye-level'})
                  .then((referenceSpace) => {
                    this._xrReferenceSpace = referenceSpace;
                    this._camera.position.copy(new THREE.Vector3());
                    this._camera.quaternion.copy(new THREE.Quaternion());
                    // Enter the rendering loop.
                    this._xrSession.requestAnimationFrame(this.render);
                  });
            },
            error => {
              console.log("Error while requesting the immersive session : " +
                          error);
            });
  }

  async onSessionEnded() {
    this._xrSession = null;
    this._xrReferenceSpace = null;
    this._renderer.context.bindFramebuffer(this._renderer.context.FRAMEBUFFER, null);
    this.onWindowResize();
    requestAnimationFrame(this.render);
  }

  async deactivateVR() {
    if (!this._xrSession)
      return;

    await this._xrSession.end();
    this.button_.textContent = 'Enable XR';
  }

  onTimeUpdate() {
    if (this._firstTimeUpdate) return;
    this._firstTimeUpdate = true;
    if (this._isVideoPlaying)
      requestAnimationFrame(this.render);
  }

  onVideoPlaying() {
    this._isVideoPlaying = true;
  }

  onWindowResize() {
    this._camera.aspect = window.innerWidth / window.innerHeight;
    this._camera.updateProjectionMatrix();
    this._renderer.setSize(window.innerWidth, window.innerHeight);
  }

  onDocumentMouseDown(event) {
      event.preventDefault();
      this._isUserInteracting = true;
      this._onPointerDownPointerX = event.clientX;
      this._onPointerDownPointerY = event.clientY;
      this._onPointerDownLon = this._lon;
      this._onPointerDownLat = this._lat;
  }

  onDocumentMouseMove(event) {
    if (this._isUserInteracting === true ) {
      this._lon = (this._onPointerDownPointerX - event.clientX) * 0.1 + this._onPointerDownLon;
      this._lat = (event.clientY - this._onPointerDownPointerY) * 0.1 + this._onPointerDownLat;
    }
  }

  onDocumentMouseUp() {
    this._isUserInteracting = false;
  }

  onDocumentMouseWheel(event) {
    this._distance += event.deltaY * 0.05;
    this._distance = THREE.Math.clamp(this._distance, 1, 50);
  }

  render(timestamp, xrFrame) {
    if (!this._xrSession) {
      this._renderer.autoClear = true;
      this._scene.matrixAutoUpdate = true;
      this._lat = Math.max(-85, Math.min(85, this._lat));
      let phi = THREE.Math.degToRad(90 - this._lat);
      let theta = THREE.Math.degToRad(this._lon);
      this._camera.position.x = this._distance * Math.sin(phi) * Math.cos(theta);
      this._camera.position.y = this._distance * Math.cos(phi);
      this._camera.position.z = this._distance * Math.sin(phi) * Math.sin(theta);
      this._camera.lookAt(this._camera.target);
      this._renderer.render(this._scene, this._camera);
      requestAnimationFrame(this.render);
    }
    if (!xrFrame)
      return;

    this._scene.matrixAutoUpdate = false;
    this._renderer.autoClear = false;
    this._renderer.clear();

    // Get pose data.
    let pose = xrFrame.getViewerPose(this._xrReferenceSpace);
    if (pose) {
      let xrLayer = this._xrSession.renderState.baseLayer;
      this._renderer.setSize(xrLayer.framebufferWidth, xrLayer.framebufferHeight, false);
      this._renderer.context.bindFramebuffer(this._renderer.context.FRAMEBUFFER, xrLayer.framebuffer);

      for (let view of pose.views) {
        let viewport = xrLayer.getViewport(view);
        this.renderEye(view, viewport);
      }
    }

    // Use the XR display's in-built rAF (which can be a diff refresh rate to
    // the default browser one).
    this._xrSession.requestAnimationFrame(this.render);
  }

  renderEye(xrView, viewport) {
    // Set the left or right eye half.
    this._renderer.setViewport(viewport.x, viewport.y, viewport.width, viewport.height);

    let viewMatrix = new THREE.Matrix4();
    viewMatrix.fromArray(xrView.transform.inverse.matrix);

    // Update the scene and camera matrices.
    this._camera.projectionMatrix.fromArray(xrView.projectionMatrix);
    this._camera.matrixWorldInverse.copy(viewMatrix);
    this._scene.matrix.copy(viewMatrix);

    // Tell the scene to update (otherwise it will ignore the change of matrix).
    this._scene.updateMatrixWorld(true);
    this._renderer.render(this._scene, this._camera);
    // Ensure that left eye calcs aren't going to interfere.
    this._renderer.clearDepth();
  }
}

new WebXR();