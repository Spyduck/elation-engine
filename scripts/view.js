elation.component.add("engine.view", function() {
  //elation.implement(this, elation.engine.systems.system);
  this.effects = {};

  this.init = function() {
    elation.html.addclass(this.container, "engine_view");
    this.picking = this.args.picking || false;
    this.size = [0, 0];
    this.size_old = [0, 0];
    if (this.args.fullsize == 1) {
      elation.html.addclass(this.container, "engine_view_fullsize");
    }
    elation.events.add(window, "resize", this);
    elation.events.add(this.container, "mouseover,mousedown,mousemove,mouseup,click,touchstart,touchmove,touchend", this);
    if (!this.args.engine) {
      console.log("ERROR: couldn't create view, missing engine parameter");
    } else if (typeof elation.engine.instances[this.args.engine] == 'undefined') {
      console.log("ERROR: couldn't create view, engine '" + this.args.engine + "' doesn't exist");
    } else {
      //this.attach(elation.engine.instances[this.args.engine]);
      this.engine = elation.engine.instances[this.args.engine];

      this.create();
    }
  }
  this.create = function() {
    this.rendersystem = this.engine.systems.active.render;
    if (!this.rendersystem.renderer.domElement.parentNode) {
      this.container.appendChild(this.rendersystem.renderer.domElement);
    }
    this.rendersystem.view_add(this.id, this);

    var cam = new THREE.PerspectiveCamera(50, this.container.offsetWidth / this.container.offsetHeight, .001, 5000000000);
    cam.position.x = 0;
    cam.position.z = 0;
    cam.position.y = 1;
cam.eulerOrder = "YXZ";
cam.rotation.x = -Math.PI/24;
//cam.rotation.y = -Math.PI/4;
    this.setcamera(cam);
    this.setscene(this.engine.systems.active.world.scene['world-3d']);
    //console.log(this.engine.systems.active.world.scene['world-3d']);

    this.composer = new THREE.EffectComposer(this.rendersystem.renderer);
    this.composer.addPass(new THREE.RenderPass(this.scene, this.camera, null, new THREE.Color(0xffffff), 0));

    this.effects['film']= new THREE.FilmPass( 0.35, .75, 2048, false );
    this.effects['sepia'] = new THREE.ShaderPass( THREE.SepiaShader );
    this.effects['bleach'] = new THREE.ShaderPass( THREE.BleachBypassShader );

    this.effects['FXAA'] = new THREE.ShaderPass( THREE.FXAAShader );
    this.effects['FXAA'].uniforms[ 'resolution' ].value.set( 1 / this.size[0], 1 / this.size[1]);
    this.effects['FXAA'].renderToScreen = true;

    //this.composer.addPass(this.effects['bleach']);
    //this.composer.addPass(this.effects['sepia']);
    //this.composer.addPass(this.effects['film']);
    this.composer.addPass( this.effects['FXAA'] );

    this.stats = new Stats();
    this.stats.domElement.style.position = 'absolute';
    this.stats.domElement.style.top = '0px';
    this.container.appendChild(this.stats.domElement);
    this.getsize();

    this.glcontext = this.rendersystem.renderer.getContext();

    if (this.picking) {
      this.pickingmaterials = [];
      this.pickingtarget = new THREE.WebGLRenderTarget(this.size[0], this.size[1], {minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter, depthBuffer: true});
      this.pickingtarget.generateMipmaps = false;
      this.pickingbuffer = new Uint8Array(4);
      this.picknum = 0;
      this.pickingdebug = false;


      this.engine.systems.get('controls').addCommands('view', {'picking_debug': elation.bind(this, function() { this.pickingdebug = !this.pickingdebug; })});
      this.engine.systems.get('controls').addBindings('view', {'keyboard_p': 'picking_debug'});
      this.engine.systems.get('controls').activateContext('view');
    }
  }
  this.render = function(delta) {
    if (this.scene && this.camera) {
      if (this.size[0] != this.size_old[0] || this.size[1] != this.size_old[1]) {
        this.setrendersize(this.size[0], this.size[1]);
      }
      var dims = elation.html.dimensions(this.container);

      if (this.pickingactive) {
        this.pick(this.mousepos[0] - dims.x, this.mousepos[1] - dims.y);
      }
      if (!this.pickingdebug) {
        this.composer.render(delta);
      }
    }
    this.stats.update();
    this.size_old[0] = this.size[0];
    this.size_old[1] = this.size[1];
//this.camera.rotation.y += Math.PI/32 * delta;
  }

  this.setcamera = function(camera) {
    this.camera = camera;
    this.setscene(this.getscene(camera));
  }
  this.setscene = function(scene) {
    this.scene = scene;
  }
  this.getscene = function(obj) {
    var scene = obj;

    while ( scene.parent !== undefined ) {
      scene = scene.parent;
    }
    if ( scene !== undefined && scene instanceof THREE.Scene )  {
      return scene;
    }
    return false;
  }
  this.getsize = function() {
    this.size = [this.container.offsetWidth, this.container.offsetHeight];
    this.setrendersize(this.size[0], this.size[1]);
    return this.size;
  }
  this.setrendersize = function(width, height) {
    this.rendersystem.renderer.setSize(width, height);  
    this.composer.setSize(width, height);
    if (this.effects['FXAA']) {
      this.effects['FXAA'].uniforms[ 'resolution' ].value.set( 1 / width, 1 / height);
    }
    if (this.camera) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
  }
  this.system_attach = function(ev) {
    console.log('INIT: view (' + this.id + ')');

  }
  this.engine_start = function(ev) {
  }
  this.engine_frame = function(ev) {
    //var scene = this.engine.systems.active.world.scene['world-3d'];
    //console.log('FRAME: view (' + this.id + ")");
  }
  this.engine_stop = function(ev) {
    console.log('SHUTDOWN: view (' + this.id + ')');
  }
  this.resize = function(ev) {
    this.getsize();
  }
  this.mouseover = function(ev) {
    if (!this.pickingactive) {
      elation.events.add(this.container, 'mousemove,mouseout', this);
      this.pickingactive = true;
    }
    this.mousepos = [ev.clientX, ev.clientY];
  }
  this.mousemove = function(ev) {
    this.mousepos = [ev.clientX, ev.clientY];
  }
  this.mouseout = function(ev) {
    if (this.pickingactive) {
      elation.events.remove(this.container, 'mousemove,mouseout', this);
      this.pickingactive = false;
      if (this.pickingobject) {
        elation.events.fire({type: "mouseout", element: this.getParentThing(this.pickingobject)});
        this.pickingobject = false;
      }
    }
  }
  this.mousedown = function(ev) {
    if (this.pickingactive && this.pickingobject) {
      elation.events.fire({type: 'mousedown', element: this.getParentThing(this.pickingobject)});
    }
  }
  this.mouseup = function(ev) {
    if (this.pickingactive && this.pickingobject) {
      elation.events.fire({type: 'mouseup', element: this.getParentThing(this.pickingobject)});
    }
  }
  this.click = function(ev) {
    if (this.pickingactive && this.pickingobject) {
      elation.events.fire({type: 'click', element: this.getParentThing(this.pickingobject)});
    }
    ev.preventDefault();
  }
  this.touchstart = function(ev) {
    this.mousepos = [ev.touches[0].clientX, ev.touches[0].clientY];
    this.mousedown();
  }
  this.touchmove = function(ev) {
    this.mousepos = [ev.touches[0].clientX, ev.touches[0].clientY];
    this.mousemove();
  }
  this.touchmove = function(ev) {
    this.mousepos = [ev.touches[0].clientX, ev.touches[0].clientY];
    this.mousemove();
  }
  this.touchend = function(ev) {
    this.mouseup();
    this.click();
  }
  this.getParentThing = function(obj) {
    while (obj) {
      if (obj._thing) return obj._thing;
      obj = obj.parent;
    }
    return null;
  }

  this.getPickingMaterial = function(id) {
    if (!this.pickingmaterials[id]) {
      var idcolor = new THREE.Color(id);
      this.pickingmaterials[id] = elation.engine.utils.materials.getShaderMaterial("controls_picking", {diffuse: idcolor}, null, false);
    }
    return this.pickingmaterials[id];
  }
  this.pick = function(x, y) {
    // ratelimit to once every n frames, for performance reasons
    if (!this.pickingdebug && this.picknum++ % 3 != 0) return;

    var objects = [];
    var realmaterials = [];
    var realvisible = [];
    var objid = 1;
    // replace texture with placeholder
    this.scene.traverse(elation.bind(this, function(node) {
      if (node.material) {
        realmaterials[objid] = node.material;
        realvisible[objid] = node.visible;
        node.material = this.getPickingMaterial(objid);
        objects[objid] = node;
        objid++;
      }
    }));
    var pickingtarget = null; //(this.pickingdebug ? null : this.pickingtarget)
    this.rendersystem.renderer.render(this.scene, this.camera, pickingtarget);
    this.glcontext.readPixels(x, this.container.offsetHeight - y - 0, 1, 1, this.glcontext.RGBA, this.glcontext.UNSIGNED_BYTE, this.pickingbuffer);
    var pickid = (this.pickingbuffer[0] << 16) + (this.pickingbuffer[1] << 8) + (this.pickingbuffer[2]);

      //console.log('plip', pickid, objects[pickid], [x, this.container.offsetHeight - y], this.pickingbuffer);
    if (pickid > 0) {
      if (this.pickingobject !== objects[pickid]) {
        if (this.pickingobject) {
          //console.log('mouseout', this.pickingobject);
          elation.events.fire({type: "mouseout", element: this.getParentThing(this.pickingobject)});
        }
        this.pickingobject = objects[pickid];
        if (this.pickingobject) {
          //console.log('mouseover', this.pickingobject);
          elation.events.fire({type: "mouseover", element: this.getParentThing(this.pickingobject)});
        }
      }
      
    } else {
      if (this.pickingobject) {
        //console.log('mouseout', this.pickingobject);
        elation.events.fire({type: "mouseout", element: this.getParentThing(this.pickingobject)});
        this.pickingobject = false;
      }
    }

    // revert textures
    for (var id in objects) {
      if (realmaterials[id]) {
        objects[id].material = realmaterials[id];
      }
      objects[id].visible = realvisible[id];
    }
  }
  this.getThingFromObject = function(obj) {
    while (obj) {
      if (obj._thing) {
        return obj._thing;
      }
      obj = obj.parent;
    }
    return;
  }
});

elation.engine.utils.materials.addChunk("controls_picking", {
  uniforms: {
    "id" : { type: "i", value: 0 },
    "diffuse" : { type: "c", value: new THREE.Color(0xff0000) },
  },
  vertex_pars: [
    "uniform int id;",
    "varying vec2 vUv;",
  ].join('\n'),

  vertex: [
    "vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);",
    "gl_Position = projectionMatrix * mvPosition;",
    //"vUv = uv;",
  ].join('\n'),
  fragment_pars: [
    "uniform int id;",
    "uniform vec3 diffuse;",
    "varying vec2 vUv;",
  ].join('\n'),
  fragment: [
      //"gl_FragColor = vec4(1,0,0, 1);",
      //"gl_FragColor = vec4( vUv.x, vUv.y, float(id) / 256.0, 1.0);",
      //"gl_FragColor = vec4( float(id) / 256.0, 0, 0, 1.0);",
      "gl_FragColor = vec4( diffuse, 1.0);",
  ].join('\n')
});
elation.engine.utils.materials.buildShader("controls_picking", {
  uniforms: [
    //'common',
    //'color',
    'controls_picking',
  ],
  chunks_vertex: [
    'controls_picking',
    //'color',
    //'default',
  ],
  chunks_fragment: [
    //'color',
    'controls_picking',
  ]
});
