elation.template.add('engine.systems.admin.scenetree.thing', '<span class="engine_thing">{name}</span> ({type})');
elation.template.add('engine.systems.admin.inspector.property', '{?value}<label for="engine_admin_inspector_properties_{fullname}">{name}</label><input id="engine_admin_inspector_properties_{fullname}" value="{value}">{:else}<span>{name}</span>{/value}');

elation.template.add('engine.systems.admin.inspector.object', '<span class="engine_thing_object engine_thing_object_{type}">{object.id} ({type})</span>');

elation.extend("engine.systems.admin", function(args) {
  elation.implement(this, elation.engine.systems.system);
  this.system_attach = function(ev) {
    console.log('INIT: admin');

    elation.html.addclass(this.container, "engine_admin");
    this.world = this.engine.systems.get('world');

    this.inspector = elation.engine.systems.admin.inspector('admin', elation.html.create({append: document.body}), {world: this.world});
    this.scenetree = elation.engine.systems.admin.scenetree(null, elation.html.create({append: document.body}), {world: this.world});

/*
    setTimeout(elation.bind(this, function() {
      var controls = this.engine.systems.get('controls');
      var view = this.engine.systems.get('render').views['main'];
      controls.addCommands('admin', {
        'move_left': elation.bind(view.camera, function() { this.position.x -= 1; }),
        'move_right': elation.bind(view.camera, function() { this.position.x += 1; }),
        'move_forward': elation.bind(view.camera, function() { this.position.z -= 1; }),
        'move_back': elation.bind(view.camera, function() { this.position.z += 1; }),
        'move_up': elation.bind(view.camera, function() { this.position.y += 1; }),
        'move_down': elation.bind(view.camera, function() { this.position.y -= 1; })
      });
      controls.addBindings('admin', {
        'keyboard_w': 'move_forward',
        'keyboard_a': 'move_left',
        'keyboard_s': 'move_back',
        'keyboard_d': 'move_right',
        'keyboard_r': 'move_up',
        'keyboard_f': 'move_down',
      });
      controls.activateContext('admin');
    }), 1000);
*/
  }
  this.engine_frame = function(ev) {
    /* FIXME - silly hack! */
    if (!this.flycontrols) {
      var render = this.engine.systems.get('render');
      if (render.views['main']) {
        var view = this.engine.systems.get('render').views['main'];
        this.flycontrols = new THREE.FlyControls(view.camera, view.container);
        this.flycontrols.movementSpeed = 10;
        this.flycontrols.rollSpeed = Math.PI/4;
        this.flycontrols.dragToLook = true;
      }
    } else {
      this.flycontrols.update(ev.data.delta);
    }
  }
});
elation.component.add("engine.systems.admin.scenetree", function() {
  this.init = function() {
    this.world = this.args.world;
    this.container.innerHTML = '<h2>Scene</h2>';
    elation.html.addclass(this.container, 'engine_admin_scenetree style_box');
    elation.events.add(this.world, 'engine_thing_create,world_thing_add', this);
    if (this.world.loaded) {
      this.create();
    } else {
      elation.events.add(this.world, "engine_world_init", elation.bind(this, this.create));
    }
  }
  this.create = function() {
    this.treeview = elation.ui.treeview(null, elation.html.create({tag: 'div', classname: 'engine_admin_scenetree_list', append: this.container}), {
      items: this.world.children,
      attrs: {
        children: 'children',
        label: 'id',
        itemtemplate: 'engine.systems.admin.scenetree.thing'
      }
    });
    elation.events.add(this.treeview, 'ui_treeview_select,ui_treeview_hover', this);
    // TODO - object hover/selection should be made available when a specific selection mode is enabled
    /*
    elation.events.add(this, 'mouseover', elation.bind(this, function(ev) {
      if (ev.data && ev.data.material) {
        var materials = (ev.data.material instanceof THREE.MeshFaceMaterial ? ev.data.material.materials : [ev.data.material]);
        for (var i = 0; i < materials.length; i++) {
          if (materials[i].emissive) {
            materials[i].emissive.setHex(0x333300);
          }
        }
      }
    }));
    elation.events.add(this, 'mouseout', elation.bind(this, function(ev) {
      if (ev.data && ev.data.material) {
        var materials = (ev.data.material instanceof THREE.MeshFaceMaterial ? ev.data.material.materials : [ev.data.material]);
        for (var i = 0; i < materials.length; i++) {
          if (materials[i].emissive) {
            materials[i].emissive.setHex(0x000000);
          }
        }
      }
    }));
    */
  }
  this.ui_treeview_hover = function(ev) {
  }
  this.ui_treeview_select = function(ev) {
    this.selectedthing = ev.data;
    elation.engine.systems.admin.inspector('admin').setThing(this.selectedthing);
  }
  this.world_thing_add = function(ev) {
    //console.log("PLOP", ev);
  }
});
elation.component.add("engine.systems.admin.inspector", function() {
  this.init = function() {
    elation.html.addclass(this.container, 'engine_admin_inspector style_box');
    elation.events.add(this.container, "mousewheel", function(ev) { ev.stopPropagation(); }); // FIXME - hack for mousewheel
    this.label = elation.html.create({tag: 'h2', append: this.container});
    this.tabcontents = {
      properties: elation.engine.systems.admin.inspector.properties(null, elation.html.create()),
      objects: elation.engine.systems.admin.inspector.objects(null, elation.html.create())
    };
  }
  this.setThing = function(thingwrapper) {
    this.thingwrapper = thingwrapper;
    var thing = thingwrapper.value;
    if (!this.tabs) {
      this.createTabs();
    }
    this.label.innerHTML = thing.id + ' (' + thing.type + ')';
    this.tabs.setActiveTab(this.activetab || "properties");
    //this.properties.setThing(thingwrapper);
    //this.objects.setThing(thingwrapper);
  }
  this.createTabs = function() {
    this.tabs = elation.ui.tabs(null, elation.html.create({append: this.container}), {
      items: [
        {
          label: "Properties",
          name: "properties",
        },
        {
          label: "Objects",
          name: "objects",
        },
      ]});
    this.contentarea = elation.html.create({tag: 'div', classname: 'engine_admin_inspector_contents', append: this.container});
    elation.events.add(this.tabs, 'ui_tabs_change', this);
  }
  this.ui_tabs_change = function(ev) {
    var newtab = ev.data;
    if (this.tabcontents[newtab.name]) {
      this.activetab = newtab.name;
      this.contentarea.innerHTML = '';
      this.tabcontents[newtab.name].reparent(this.contentarea);
      this.tabcontents[newtab.name].setThing(this.thingwrapper);
    }
  }
});
elation.component.add("engine.systems.admin.inspector.properties", function() {
  this.init = function() {
    elation.html.addclass(this.container, 'engine_admin_inspector_properties ui_treeview');
    this.propdiv = elation.html.create({tag: 'div', append: this.container});
  }
  this.setThing = function(thingwrapper) {
    this.thingwrapper = thingwrapper;
    var thing = thingwrapper.value;
    this.propdiv.innerHTML = '';
    var proptree = this.buildPropertyTree(thing.properties);
      
    // FIXME - should reuse the same treeview rather than creating a new one each time
    this.treeview = elation.ui.treeview(null, this.propdiv, {
      items: proptree,
      attrs: {
        children: 'children',
        itemtemplate: 'engine.systems.admin.inspector.property'
      }
    });
    var propinputs = elation.find('input', this.propdiv);
    elation.events.add(propinputs, 'change', this);
  }
  this.buildPropertyTree = function(properties, prefix) {
    var root = {};
    if (!prefix) prefix = '';

    for (var k in properties) {
      root[k] = {name: k, fullname: prefix + k};
      if (properties[k] instanceof THREE.Vector2) {
        root[k]['value'] = properties[k].x + ',' + properties[k].y;
      } else if (properties[k] instanceof THREE.Vector3) {
        root[k]['value'] = properties[k].x + ',' + properties[k].y + ',' + properties[k].z;
      } else if (properties[k] instanceof THREE.Vector4 || properties[k] instanceof THREE.Quaternion) {
        root[k]['value'] = properties[k].x + ',' + properties[k].y + ',' + properties[k].z + ',' + properties[k].w;
      } else if (properties[k] instanceof THREE.Texture) {
        root[k]['value'] = properties[k].sourceFile;
      } else if (properties[k] instanceof Object && !elation.utils.isArray(properties[k])) {
        root[k]['children'] = this.buildPropertyTree(properties[k], prefix + k + "_");
      } else {
        root[k]['value'] = properties[k];
      }
    }
    return root;
  }
  this.change = function(ev) {
    var propname = ev.target.id.replace(/^engine_admin_inspector_properties_/, "").replace(/_/g, ".");
    var thing = this.thingwrapper.value;
    thing.set(propname, ev.target.value, true);
  }
});
elation.component.add("engine.systems.admin.inspector.objects", function() {
  this.types = ['Mesh', 'PointLight', 'DirectionalLight', 'Light', 'ParticleSystem', 'PerspectiveCamera', 'OrthographicCamera', 'Camera', 'TextGeometry', 'CubeGeometry', 'SphereGeometry', 'PlaneGeometry', 'TorusGeometry', 'Geometry', 'MeshPhongMaterial', 'MeshBasicMaterial', 'MeshLambertMaterial', 'MeshFaceMaterial', 'ShaderMaterial', 'Material', 'Object3D'];
  this.init = function() {
    elation.html.addclass(this.container, 'engine_admin_inspector_objects ui_treeview');
  }
  this.setThing = function(thingwrapper) {
    this.thing = thingwrapper.value;
    this.container.innerHTML = '';

    var objtree = this.buildObjectTree(this.thing.objects);
      
    // FIXME - should reuse the same treeview rather than creating a new one each time
    this.treeview = elation.ui.treeview(null, this.container, {
      items: objtree,
      attrs: {
        children: 'children',
        itemtemplate: 'engine.systems.admin.inspector.object'
      }
    });
    elation.events.add(this.treeview, 'ui_treeview_select', this);
  }
  this.buildObjectTree = function(objects, prefix) {
    var root = {};
    if (!prefix) prefix = '';

    for (var k in objects) {
      if (!elation.utils.isNull(objects[k])) {
        if (objects[k] instanceof elation.physics.rigidbody) {
          // TODO - show physics object to allow editing
        } else if (!objects[k]._thing || objects[k]._thing == this.thing) {
          root[k] = {
            name: k,
            fullname: prefix + k,
            type: this.getObjectType(objects[k])
          };
          root[k].object = objects[k];
          root[k].children = {};
          if (objects[k].children && objects[k].children.length > 0) {
            elation.utils.merge(this.buildObjectTree(objects[k].children, prefix + k + "_"), root[k].children);
          }
          switch (root[k].type) {
            case 'Mesh':
              var subobjects = {
                'geometry': objects[k].geometry,
                'material': objects[k].material
              };
              elation.utils.merge(this.buildObjectTree(subobjects), root[k].children);
              break;
            case 'MeshFaceMaterial':
              var subobjects = objects[k].materials;
              elation.utils.merge(this.buildObjectTree(subobjects), root[k].children);
              break;
          }
        }
      }
    }
    return root;
  }
  this.getObjectType = function(obj) {
    var type = 'Object3D';
    //console.log('object ' + objects[k].name + ': ', objects[k]);
    for (var i = 0; i < this.types.length; i++) {
      if (obj instanceof THREE[this.types[i]]) {
        type = this.types[i];
        break;
      }
    }
    return type;
  }

  this.ui_treeview_select = function(ev) {
    console.log('selected!', ev);
    var selected = ev.data.value;
    switch (selected.type) {
      case 'ShaderMaterial':
        elation.engine.utils.materials.displayall(null, selected.object);
        break;
    }
  }
});

