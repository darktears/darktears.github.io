'use strict';

class GDGDemo {
    constructor () {
        this._container = document.querySelector('#container');
        this._width = window.innerWidth;
        this._height = window.innerHeight
        this._scene = new THREE.Scene();
        this._camera = new THREE.PerspectiveCamera( 75, this._width / this._height, 0.1, 1000 );
        
        this._renderer = new THREE.WebGLRenderer();
        this._renderer.setSize( window.innerWidth, window.innerHeight );
        this._container.appendChild( this._renderer.domElement );

        const geometry = new THREE.BoxGeometry( 3, 3, 3 );
        const loader = new THREE.TextureLoader();
        const texture = loader.load("./wood.jpg");
        const material = new THREE.MeshBasicMaterial( { map:texture, side:THREE.DoubleSide } );
        this._cube = new THREE.Mesh( geometry, material );
        this._scene.add( this._cube );
        
        this._camera.position.z = 5;
        this._update = this._update.bind(this);
        this._onResize = this._onResize.bind(this);
        requestAnimationFrame(this._update);
        window.addEventListener('resize', this._onResize);

        // Remember to include.
        this._controls = new THREE.OrbitControls(this._camera, this._renderer.domElement);

        if (typeof VRFrameData === 'undefined') {
            this._VRDisabled = true;
            console.error('WebVR not supported');
            return;
        }
        this._firstVRFrame = false;
        this._VRDisabled = false;
        this._vr = {
            display: null,
            frameData: new VRFrameData()
          };
        this._addVREventListeners();
        this._getDisplays();
    }

    _addVREventListeners () {
        window.addEventListener('vrdisplayactivate', _ => {
            this._activateVR();
        });

        window.addEventListener('vrdisplaydeactivate', _ => {
            this._deactivateVR();
        });
    }

    _getDisplays () {
        return navigator.getVRDisplays().then(displays => {
          displays = displays.filter(display => display.capabilities.canPresent);
    
          if (displays.length === 0) {
            console.error('No devices available able to present.');
            return;
          }

          this._vr.display = displays[0];
          this._vr.display.depthNear = 0.1;
          this._vr.display.depthFar = 1000;
    
          this._createPresentationButton();
        });
    }

    _createPresentationButton () {
        this._button = document.createElement('button');
        this._button.classList.add('vr-toggle');
        this._button.textContent = 'Enable VR';
        this._button.addEventListener('click', _ => {
          this._toggleVR();
        });
        document.body.appendChild(this._button);
      }

    _update() {
        this._cube.rotation.x += 0.01;
        this._cube.rotation.y += 0.01;
        if (this._VRDisabled || !(this._vr.display && this._vr.display.isPresenting)) {
            this._renderer.render(this._scene, this._camera);
            return requestAnimationFrame(this._update);
        }

        if (this._firstVRFrame) {
            this._firstVRFrame = false;
            return this._vr.display.requestAnimationFrame(this._update);
        }

        const EYE_WIDTH = this._width * 0.5;
        const EYE_HEIGHT = this._height;
    
        this._vr.display.getFrameData(this._vr.frameData);
    
        this._scene.matrixAutoUpdate = false;
    
        this._renderer.autoClear = false;
    
        this._renderer.clear();
    
        this._renderEye(
            this._vr.frameData.leftViewMatrix,
            this._vr.frameData.leftProjectionMatrix,
            {
            x: 0,
            y: 0,
            w: EYE_WIDTH,
            h: EYE_HEIGHT
            });
    
        this._renderer.clearDepth();
    
        this._renderEye(
            this._vr.frameData.rightViewMatrix,
            this._vr.frameData.rightProjectionMatrix, {
            x: EYE_WIDTH,
            y: 0,
            w: EYE_WIDTH,
            h: EYE_HEIGHT
            });
    
        this._vr.display.requestAnimationFrame(this._update);
    
        this._vr.display.submitFrame();
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

    _toggleVR () {
        if (this._vr.display.isPresenting) {
          return this._deactivateVR();
        }
    
        return this._activateVR();
    }
    _deactivateVR () {
        if (!this._vr.display) {
          return;
        }
    
        if (!this._vr.display.isPresenting) {
          return;
        }
        this._onResize();
        this._renderer.autoClear = true;
        this._scene.matrixAutoUpdate = true;
        this._vr.display.exitPresent();
        return;
    }
    
    _activateVR () {
        if (!this._vr.display) {
          return;
        }
        this._firstVRFrame = true;
        this._vr.display.requestPresent([{
          source: this._renderer.domElement
        }])
        .catch(e => {
          console.error(`Unable to init VR: ${e}`);
        });
    }
  
    _renderEye (viewMatrix, projectionMatrix, viewport) {
      this._renderer.setViewport(viewport.x, viewport.y, viewport.w, viewport.h);
  
      this._camera.projectionMatrix.fromArray(projectionMatrix);
      this._scene.matrix.fromArray(viewMatrix);

      this._scene.updateMatrixWorld(true);
      this._renderer.render(this._scene, this._camera);
    }
}
new GDGDemo();