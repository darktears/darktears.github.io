AFRAME.registerComponent('collider-check', {
    dependencies: ['raycaster'],
    init: function () {
      this.el.addEventListener('raycaster-intersected', function (evt) {
        let target = evt.detail.target;
        let infoBox = document.querySelector("#infoBox");
        infoBox.setAttribute('visible', true);
        infoBox.setAttribute('text', 'width : 2; value :  This is a ' + target.id);
        let cameraEl = document.querySelector('#camera');
        let worldPos = new THREE.Vector3();
        worldPos.setFromMatrixPosition(cameraEl.object3D.matrixWorld);
        worldPos.z = worldPos.z - 4;
        infoBox.object3D.position.copy(worldPos);

        const worldVector = infoBox.object3D.parent.worldToLocal(cameraEl.object3D.getWorldPosition());
        infoBox.object3D.lookAt(worldVector);
      });
      this.el.addEventListener('raycaster-intersected-cleared', function () {
        let infoBox = document.querySelector("#infoBox");
        infoBox.setAttribute('visible', false);
      });
    }
  });