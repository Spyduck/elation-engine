elation.require(["engine.things.generic"], function() {
  elation.component.add("engine.things.label", function() {
    this.postinit = function() {
      this.defineProperties({
        'text':            { type: 'string' },
        'font':            { type: 'string', default: 'helvetiker' },
        'size':            { type: 'float', default: 1.0 },
        'color':           { type: 'color', default: 0xcccccc },
        'align':           { type: 'string', default: 'left' },
        'verticalalign':   { type: 'string', default: 'bottom' },
        'zalign':          { type: 'string', default: 'back' },
        'emissive':        { type: 'color', default: 0x111111 },
        'opacity':         { type: 'float', default: 1.0 },
        'depthTest':       { type: 'bool', default: true },
        'thickness':       { type: 'float' },
        'segments':        { type: 'int', default: 6 },
        'bevel.enabled':   { type: 'bool', default: false },
        'bevel.thickness': { type: 'float', default: 0 },
        'bevel.size':      { type: 'float', default: 0 },
      });
    }
    this.createObject3D = function() {
      var text = this.properties.text || this.name;
      var geometry = this.createTextGeometry(text);

      this.material = new THREE.MeshPhongMaterial({color: this.properties.color, emissive: this.properties.emissive, shading: THREE.SmoothShading, depthTest: this.properties.depthTest});

      if (this.properties.opacity < 1.0) {
        this.material.opacity = this.properties.opacity;
        this.material.transparent = true;
      }
      var mesh = new THREE.Mesh(geometry, this.material);
      
      return mesh;
    }
    this.createTextGeometry = function(text) {
      var geometry = new THREE.TextGeometry( text, {
        size: this.properties.size,
        height: this.properties.thickness || this.properties.size / 2,
        curveSegments: this.properties.segments,

        font: this.properties.font,
        weight: "normal",
        style: "normal",

        bevelThickness: this.properties.bevel.thickness,
        bevelSize: this.properties.bevel.size,
        bevelEnabled: this.properties.bevel.enabled
      });                                                
      geometry.computeBoundingBox();
      var bbox = geometry.boundingBox;
      var diff = new THREE.Vector3().subVectors(bbox.max, bbox.min);
      var geomod = new THREE.Matrix4();
      // horizontal alignment
      if (this.properties.align == 'center') {
        geomod.makeTranslation(-.5 * diff.x, 0, 0);
        geometry.applyMatrix(geomod);
      } else if (this.properties.align == 'right') {
        geomod.makeTranslation(-1 * diff.x, 0, 0);
        geometry.applyMatrix(geomod);
      }

      // vertical alignment
      if (this.properties.verticalalign == 'middle') {
        geomod.makeTranslation(0, -.5 * diff.y, 0);
        geometry.applyMatrix(geomod);
      } else if (this.properties.verticalalign == 'top') {
        geomod.makeTranslation(0, -1 * diff.y, 0);
        geometry.applyMatrix(geomod);
      }

      // z-alignment
      if (this.properties.zalign == 'middle') {
        geomod.makeTranslation(0, 0, -.5 * diff.z);
        geometry.applyMatrix(geomod);
      } else if (this.properties.zalign == 'front') {
        geomod.makeTranslation(0, 0, -1 * diff.z);
        geometry.applyMatrix(geomod);
      }
      return geometry;
    }
    this.setText = function(text) {
      this.objects['3d'].geometry = this.createTextGeometry(text);
    }
    this.setColor = function(color) {
      this.material.color.setHex(color);
      this.refresh();
    }
    this.setEmissionColor = function(color) {
      this.material.emissive.setHex(color);
      this.refresh();
    }
  }, elation.engine.things.generic);
});
