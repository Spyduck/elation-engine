elation.component.add("engine.things.sector", function() {
  this.postinit = function() {
    this.defineProperties({
      'fog.enabled':             { type: 'bool', default: false },
      'fog.color':               { type: 'color', default: 0x000000 },
      'fog.factor':              { type: 'float', default: 0.0000008 },
      'ambient.enabled':         { type: 'bool', default: false },
      'ambient.color':           { type: 'color', default: 0x333333 },
      'light.enabled':           { type: 'bool', default: false },
      'light.color':             { type: 'color', default: 0xffffff },
      'light.position':          { type: 'vector3', default: [0,500,-500] },
      'skybox.enabled':          { type: 'bool', default: 0 },
      'skybox.cubePath':         { type: 'string' },
      'terrain.enabled':         { type: 'bool', default: false },
      'terrain.args.simple':     { type: 'bool', default: true },
      'terrain.args.color':      { type: 'color', default: 0x998877 },
      'terrain.args.displacementMap': { type: 'texture' },
      'terrain.args.normalMap':  { type: 'texture' },
      'terrain.args.map':        { type: 'texture' },
    });
    if (this.properties.skybox.enabled) {
      this.setSky();
    }
  }
  this.createObject3D = function() {
    var obj = new THREE.Object3D();
    this.objects['3d'] = obj;
    if (this.properties.light.enabled) {
      this.spawn('light', {type: 'point', position: this.properties.light.position, color: this.properties.light.color});
    }
    if (this.properties.ambient.enabled) {
      this.spawn('light', {type: 'ambient', color: this.properties.ambient.color});
    }
    if (this.properties.terrain.enabled) {
      this.spawn('terrain', this.properties.terrain.args);
    }
    return obj;
  }
  this.setSky = function() {
    var world = this.engine.systems.get('world');
    if (!this.skytexture) {
      var format = 'jpg';
      var path = this.properties.skybox.cubePath;
      if (path.substr(path.length-1) != '/') {
        path += '/';
      }
      var urls = [
        path + 'px' + '.' + format, path + 'nx' + '.' + format,
        path + 'py' + '.' + format, path + 'ny' + '.' + format,
        path + 'nz' + '.' + format, path + 'pz' + '.' + format
      ];
      var texturecube = THREE.ImageUtils.loadTextureCube( urls );
      texturecube.format = THREE.RGBFormat;
      this.skytexture = texturecube;
    }
    world.setSky(this.skytexture);
  }
}, elation.engine.things.generic);


