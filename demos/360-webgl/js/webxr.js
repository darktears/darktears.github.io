// Copyright (c) 2018, Dongseong Hwang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

// TODO(dshwang): enable it when supported.
// import defaultExport from 'utility';

(function(stratage) {
if (!navigator.xr) {
  //var polyfill = new WebXRPolyfill();
}

const CAMERA_SETTINGS = function() {
  return {fov : 65 * Math.PI / 180, near : 0.1, far : 100};
}();


class WebXR {
  constructor() {
    this.addEventListeners();
    this.canvas_ = document.createElement('canvas');
    this.onResize();
    document.body.appendChild(this.canvas_);
    this.createGLContext({antialias : false, alpha : true});
    this.setMouseBehavior();

    if (navigator.xr) {
      this.xr_ = { session : null, referenceSpace : null};
      this.checkXRSupport();
    } else {
      this.showWebXRNotSupportedError();
    }

    this.render_ = this.render.bind(this);
  }

  showWebXRNotSupportedError() { console.error('WebXR not supported'); }

  createGLContext(option) {
    this.gl_ = this.canvas_.getContext('webgl2', option);
    const isWebGL2 = !!this.gl_;
    if (!isWebGL2) {
      document.getElementById('info').innerHTML =
          'WebGL 2 is not available.' +
          ' See <a href="https://www.khronos.org/webgl/wiki/Getting_a_WebGL_Implementation">' +
          ' How to get a WebGL 2 implementation</a>';
      return;
    }

    this.initProgram();
    this.initModelData();
    this.setVertexArray();
    this.initTexture();
    this.initRenderVariables();

  }

  initModelData() {
    var latitudeBands = 60;
    var longitudeBands = 60;
    var radius = 2;
    var ANGLE_CORRECTION_FOR_CENTER_ALIGN = -0.5 * Math.PI;
    let latIdx;
    let lngIdx;
    this.textureCoordData_ = [];
    this.vertexPositionData_ = [];
    this.indexData_ = [];
    for (latIdx = 0; latIdx <= latitudeBands; latIdx++) {
      const theta = -1.0*(latIdx / latitudeBands - 0.5) * Math.PI;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      for (lngIdx = 0; lngIdx <= longitudeBands; lngIdx++) {
        const phi = -1.0*(lngIdx / longitudeBands - 0.5) * 2 * Math.PI - ANGLE_CORRECTION_FOR_CENTER_ALIGN;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);
        const x = cosPhi * cosTheta;
        const y = sinTheta;
        const z = -sinPhi * cosTheta;
        const u = lngIdx / longitudeBands;
        const v = latIdx / latitudeBands;

        this.textureCoordData_.push(u, v);
        this.vertexPositionData_.push(radius * x, radius * y, radius * z);

        if (lngIdx !== longitudeBands && latIdx !== latitudeBands) {
          const a = latIdx * (longitudeBands + 1) + lngIdx;
          const b = a + longitudeBands + 1;
          this.indexData_.push(a, b, a + 1, b, b + 1, a + 1);
        }
      }
    }
  }

  checkXRSupport() {
          // ‘Immersive’ means rendering into the HMD.
    navigator.xr.supportsSession('immersive-vr')
        .then(() => { this.createPresentationButton(); })
        .catch((err) => { console.log("Immersive XR not supported: " + err); });
  }

  async activateVR() {
    navigator.xr.requestSession('immersive-vr')
        .then(
            session => {
              this.xr_.session = session;
              this.xr_.session.addEventListener(
                  'end', _ => { this.onSessionEnded(); });

              // Create the WebGL layer.
              this.gl_.makeXRCompatible();
              let layer = new XRWebGLLayer(this.xr_.session, this.gl_);
              this.xr_.session.updateRenderState({
                baseLayer: layer,
                depthNear: CAMERA_SETTINGS.near,
                depthFar: CAMERA_SETTINGS.far
               });

              this.button_.textContent = 'Disable XR';
              session.requestReferenceSpace({ type:'stationary', subtype:'eye-level'})
                  .then((referenceSpace) => {
                    this.xr_.referenceSpace = referenceSpace;

                    // Enter the rendering loop.
                    this.xr_.session.requestAnimationFrame(this.render_);
                  });
            },
            error => {
              console.log("Error while requesting the immersive session : " +
                          error);
            });
  }

  async onSessionEnded() {
    this.xr_.session = null;
    this.xr_.referenceSpace = null;
    this.gl_.bindFramebuffer(this.gl_.FRAMEBUFFER, null);
    requestAnimationFrame(this.render_);
  }

  async deactivateVR() {
    if (!this.xr_.session)
      return;

    await this.xr_.session.end();
    this.button_.textContent = 'Enable XR';
  }

  createPresentationButton() {
    this.button_ = document.createElement('button');
    this.button_.classList.add('vr-toggle');
    this.button_.textContent = 'Enable XR';
    this.button_.addEventListener('click', _ => { this.toggleVR(); });
    document.body.appendChild(this.button_);
  }

  toggleVR() {
    if (this.xr_.session)
      return this.deactivateVR();

    return this.activateVR();
  }

  addEventListeners() {
    window.addEventListener('resize', this.onResize.bind(this));
  }

  onResize() { this.resizeCanvas(window.innerWidth, window.innerHeight); }

  resizeCanvas(width, height) {
    this.width_ = width;
    this.height_ = height;
    this.canvas_.width = this.width_;
    this.canvas_.height = this.height_;
    this.initRenderVariables();
  }

  initProgram() {
    this.program_ = util.createProgram(this.gl_, util.getShaderSource('vs'),
                                       util.getShaderSource('fs'));
    this.mvMatrixLocation_ =
        this.gl_.getUniformLocation(this.program_, 'mvMatrix');
    this.pMatrixLocation_ =
        this.gl_.getUniformLocation(this.program_, 'pMatrix');
    this.textureLocation_ =
        this.gl_.getUniformLocation(this.program_, 'sTexture');
    this.texScaleLocation_ =
        this.gl_.getUniformLocation(this.program_, 'uTexScale');

    this.gl_.clearColor(0.0, 0.0, 0.0, 0.0);
    this.gl_.enable(this.gl_.DEPTH_TEST);
    this.gl_.enable(this.gl_.CULL_FACE);
    this.gl_.cullFace(this.gl_.BACK);
  }


  setVertexArray() {
    /* clang-format on */
    this.vertexPosBuffer_ = this.gl_.createBuffer();
    this.gl_.bindBuffer(this.gl_.ARRAY_BUFFER, this.vertexPosBuffer_);
    this.gl_.bufferData(this.gl_.ARRAY_BUFFER, new Float32Array(this.vertexPositionData_), this.gl_.STATIC_DRAW);
    this.gl_.bindBuffer(this.gl_.ARRAY_BUFFER, null);

    //const texCoords = stratage.getTexCoords();
    this.vertexTexBuffer_ = this.gl_.createBuffer();
    this.gl_.bindBuffer(this.gl_.ARRAY_BUFFER, this.vertexTexBuffer_);
    this.gl_.bufferData(this.gl_.ARRAY_BUFFER, new Float32Array(this.textureCoordData_), this.gl_.STATIC_DRAW);
    this.gl_.bindBuffer(this.gl_.ARRAY_BUFFER, null);


    // Element buffer
    this.indexBuffer_ = this.gl_.createBuffer();
    this.gl_.bindBuffer(this.gl_.ELEMENT_ARRAY_BUFFER, this.indexBuffer_);



    // Now send the element array to GL
    this.gl_.bufferData(this.gl_.ELEMENT_ARRAY_BUFFER,
                        new Uint16Array(this.indexData_),
                        this.gl_.STATIC_DRAW);

    const vertexPosLocation = 0;
    const vertexTexLocation = 1;


    this.gl_.enableVertexAttribArray(vertexPosLocation);
    this.gl_.bindBuffer(this.gl_.ARRAY_BUFFER, this.vertexPosBuffer_);
    this.gl_.vertexAttribPointer(vertexPosLocation, 3, this.gl_.FLOAT, false, 0,
                                 0);
    this.gl_.bindBuffer(this.gl_.ARRAY_BUFFER, null);

    this.gl_.enableVertexAttribArray(vertexTexLocation);
    this.gl_.bindBuffer(this.gl_.ARRAY_BUFFER, this.vertexTexBuffer_);
    this.gl_.vertexAttribPointer(vertexTexLocation, 2, this.gl_.FLOAT, false, 0,
                                 0);
    this.gl_.bindBuffer(this.gl_.ARRAY_BUFFER, null);

  }

  initTexture() { stratage.loadImageSource(this.onLoadImageSource.bind(this)); }

  onLoadImageSource(imageSource, width, height) {
    // -- Init 2D Texture
    this.texture_ = this.gl_.createTexture();
    this.gl_.activeTexture(this.gl_.TEXTURE0);
    this.gl_.bindTexture(this.gl_.TEXTURE_2D, this.texture_);
    this.gl_.pixelStorei(this.gl_.UNPACK_FLIP_Y_WEBGL, false);
    this.gl_.texParameteri(this.gl_.TEXTURE_2D, this.gl_.TEXTURE_MAG_FILTER,
                           this.gl_.LINEAR);
    this.gl_.texParameteri(this.gl_.TEXTURE_2D, this.gl_.TEXTURE_MIN_FILTER,
                           this.gl_.LINEAR);
    this.gl_.texParameteri(this.gl_.TEXTURE_2D, this.gl_.TEXTURE_WRAP_S,
                           this.gl_.CLAMP_TO_EDGE);
    this.gl_.texParameteri(this.gl_.TEXTURE_2D, this.gl_.TEXTURE_WRAP_T,
                           this.gl_.CLAMP_TO_EDGE);

    // -- Allocate storage for the texture
    this.gl_.texImage2D(this.gl_.TEXTURE_2D, 0, this.gl_.RGBA, width, height, 0,
                        this.gl_.RGBA, this.gl_.UNSIGNED_BYTE, imageSource);

    requestAnimationFrame(this.render_);
  }

  initRenderVariables() {
    this.mvMatrix_ = mat4.create();
    this.rotationVec_ = vec3.create();

    this.projectionMatrix_ = mat4.create();

    const aspect = this.width_ / this.height_;
    mat4.perspective(this.projectionMatrix_, CAMERA_SETTINGS.fov, aspect,
                     CAMERA_SETTINGS.near, CAMERA_SETTINGS.far);
  }

  setMouseBehavior() {
    this.mouseDown = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;

    this.canvas_.onmousedown = this.onMouseDown.bind(this);
    this.canvas_.onmouseup = this.onMouseUp.bind(this);
    this.canvas_.onmousemove = this.onMouseMove.bind(this);
  }

  onMouseDown(event) {
    if (this.isVrMode())
      return;

    this.mouseDown = true;
    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
  };

  onMouseUp(event) { this.mouseDown = false; }

  onMouseMove(event) {
    if (this.mouseDown) {
      const newX = event.clientX;
      const newY = event.clientY;

      const amplifier = 0.1 * Math.PI / 180;
      let deltaX = -(newY - this.lastMouseY) * amplifier;
      let deltaY = -(newX - this.lastMouseX) * amplifier;

      let newXRot = this.rotationVec_[0] + deltaX;
      newXRot = Math.max(Math.min(newXRot, Math.PI / 2), -Math.PI / 2);
      const newYRot = this.rotationVec_[1] + deltaY;
      vec3.set(this.rotationVec_, newXRot, newYRot, 0);

      const xRotMat = mat4.create();
      mat4.fromXRotation(xRotMat, newXRot);
      const yRotMat = mat4.create();
      mat4.fromYRotation(yRotMat, newYRot);
      const RotMat = mat4.create();
      mat4.multiply(this.mvMatrix_, xRotMat, yRotMat);

      this.lastMouseX = newX;
      this.lastMouseY = newY;
    }
  }

  isVrMode() { return this.xr_ && this.xr_.session; }

  render(timestamp, xrFrame) {
    stratage.updateTexture(this.gl_, this.texture_);
    this.gl_.clear(this.gl_.COLOR_BUFFER_BIT);
    if (!this.isVrMode()) {
      const viewport =
          {x : 0, y : 0, width : this.width_, height : this.height_};
      this.renderEye(this.mvMatrix_, this.projectionMatrix_, viewport);
      requestAnimationFrame(this.render_);
      return;
    }
    if (!xrFrame)
      return;

    // Get pose data.
    let pose = xrFrame.getViewerPose(this.xr_.referenceSpace);
    if (pose) {
      let xrLayer = this.xr_.session.renderState.baseLayer;
      this.xr_.session.updateRenderState({
        depthNear: CAMERA_SETTINGS.near,
        depthFar: CAMERA_SETTINGS.far
       });
      this.resizeCanvas(xrLayer.framebufferWidth, xrLayer.framebufferHeight);
      this.gl_.bindFramebuffer(this.gl_.FRAMEBUFFER, xrLayer.framebuffer);

      for (let view of pose.views) {
        let viewport = xrLayer.getViewport(view);
        this.renderEye(view.transform.inverse.matrix, view.projectionMatrix, viewport);
      }
    }

    // Use the XR display's in-built rAF (which can be a diff refresh rate to
    // the default browser one).
    this.xr_.session.requestAnimationFrame(this.render_);
  }

  renderEye(mvMatrix, projectionMatrix, viewport) {
    this.gl_.viewport(viewport.x, viewport.y, viewport.width, viewport.height);

    this.gl_.bindVertexArray(this.vertexArray_);
    this.gl_.useProgram(this.program_);
    this.gl_.uniformMatrix4fv(this.mvMatrixLocation_, false, mvMatrix);
    this.gl_.uniformMatrix4fv(this.pMatrixLocation_, false, projectionMatrix);
    this.gl_.uniform1i(this.textureLocation_, 0);
    const scale = stratage.getScale();
    this.gl_.uniform2f(this.texScaleLocation_, scale.x, scale.y);

    this.gl_.activeTexture(this.gl_.TEXTURE0);
    this.gl_.bindTexture(this.gl_.TEXTURE_2D, this.texture_);
    this.gl_.drawElements(
      this.gl_.TRIANGLES, 21600, this.gl_.UNSIGNED_SHORT, 0);
  }

  destructuring() {
    this.gl_.deleteBuffer(this.vertexPosBuffer_);
    this.gl_.deleteBuffer(this.vertexTexBuffer_);
    this.gl_.deleteBuffer(this.vertexTexOffsetBuffer_);
    this.gl_.deleteBuffer(this.indexBuffer_);
    this.gl_.deleteTexture(this.texture_);
    this.gl_.deleteProgram(this.program_);
    this.gl_.deleteVertexArray(this.vertexArray_);
  }
}

new WebXR();
})(stratage);
