elation.require(['engine.things.generic', 'engine.things.leapmotion'], function() {
  elation.component.add('engine.things.objecttracker', function() {
    this.postinit = function() {
      elation.engine.things.objecttracker.extendclass.postinit.call(this);
      this.defineProperties({
        player: { type: 'object' }
      });
      this.controllers = [];
      this.hands = false;
      elation.events.add(this.engine, 'engine_frame', elation.bind(this, this.updatePositions));
      elation.events.add(window, "webkitGamepadConnected,webkitgamepaddisconnected,MozGamepadConnected,MozGamepadDisconnected,gamepadconnected,gamepaddisconnected", elation.bind(this, this.updateTrackedObjects));
    }
    this.createChildren = function() {
/*
      this.hands = {
        left: this.player.shoulders.spawn('leapmotion_hand', 'hand_left', { position: new THREE.Vector3(0, 0, 0) }),
        right: this.player.shoulders.spawn('leapmotion_hand', 'hand_right', { position: new THREE.Vector3(0, 0, 0) })
      };
*/
      Leap.loop(elation.bind(this, this.handleLeapLoop));
      this.updateTrackedObjects();
    }
    this.createHands = function() {
      this.hands = {
        left: this.player.shoulders.spawn('leapmotion_hand', 'hand_left', { position: new THREE.Vector3(0, 0, 0) }),
        right: this.player.shoulders.spawn('leapmotion_hand', 'hand_right', { position: new THREE.Vector3(0, 0, 0) })
      };
      this.hands.left.hide();
      this.hands.right.hide();
    }
    this.updatePositions = function() {
      this.updateTrackedObjects();
      if (!this.vrdisplay) {
        return;
      }
      if (!this.hands) this.createHands();

      var player = this.engine.client.player,
          stage = this.vrdisplay.stageParameters;
      for (var i = 0; i < this.controllers.length; i++) {
        var c = this.controllers[i];
        if (c && c.data.pose) {
          var hand = (i ? 'left' : 'right');
          var pose = c.data.pose;
          if (pose.position) {
            c.model.position.fromArray(pose.position).multiplyScalar(1);
            this.hands[hand].position.fromArray(pose.position);
          }
          //c.model.position.y += player.properties.height * 0.8 - player.properties.fatness;
          //c.model.position.x *= this.vrdisplay.stageParameters.sizeX;
          //c.model.position.z *= this.vrdisplay.stageParameters.sizeZ;

          //c.model.scale.set(stage.sizeX, stage.sizeX, stage.sizeZ); // FIXME - does this get weird for non-square rooms?
          if (pose.orientation) {
            c.model.quaternion.fromArray(pose.orientation);
            this.hands[hand].orientation.fromArray(pose.orientation);
          }
        }
      }
    }
    this.updateTrackedObjects = function() {
      var controls = this.engine.systems.controls;
      this.vrdisplay = this.engine.systems.render.views.main.vrdisplay;
      var gamepads = controls.gamepads;
      for (var i = 0; i < gamepads.length; i++) {
        if (gamepads[i] && !this.controllers[i]) {
          this.setTrackedController(i, gamepads[i]);
        }
      }
    }
    this.setTrackedController = function(i, controller) {
      this.controllers[i] = {
        model: (this.controllers[i] ? this.controllers[i].model : this.createPlaceholder()),
        data: controller
      };
      this.objects['3d'].add(this.controllers[i].model);
      return this.controllers[i];
    }
    this.createPlaceholder = function() {
      // TODO - For now, we make a rudimentary Vive controller model.  We should be 
      //        able to load a different model for the specific type of controller.
      var w = 0.0445 / 1,
          l = 0.1714 / 1,
          d = 0.0254 / 1,
          r = 0.0952 / 2,
          ir = 0.0254 / 2;
      var geo = new THREE.BoxGeometry(w, d, l);
      geo.applyMatrix(new THREE.Matrix4().makeTranslation(0,-d/2,l/2));
      var torus = new THREE.TorusGeometry(r, ir);
      torus.applyMatrix(new THREE.Matrix4().makeTranslation(0, 0, r/2 + ir*2));
      torus.applyMatrix(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(Math.PI/4, 0, 0)));
      geo.merge(torus, new THREE.Matrix4().makeTranslation(0,0,-r));

      return new THREE.Mesh(
        geo,
        new THREE.MeshLambertMaterial({color: 0xffffff * Math.random()})
      );
    }
    this.hasHands = function() {
      // TODO - this should also work with leap motion
      return this.controllers.length > 0 || this.hands;
    }
    this.getHands = function() {
      if (this.controllers.length > 0) {
        var hands = {};
        if (this.controllers[0] && this.controllers[0].data) {
          hands.left = this.controllers[0].data.pose;
        }
        if (this.controllers[1] && this.controllers[1].data) {
          hands.right = this.controllers[1].data.pose;
        }
        return hands;
      } else if (this.hands) {
        return {
          left: this.hands.left,
          right: this.hands.right,
        };
      }
      return false;
    }
    this.handleLeapLoop = function(frame) {
      var framehands = {};
      
      if (!this.hands) this.createHands();
      for (var i = 0; i < frame.hands.length; i++) {
        framehands[frame.hands[i].type] = frame.hands[i];
      }
      for (var k in this.hands) {
        var hand = framehands[k];
        var handobj = this.hands[k];
        if (hand && handobj) {
          if (hand.valid) {
            handobj.active = true;
            handobj.show();
            handobj.updateData(hand, 1/1000);
          } else {
            handobj.active = false;
            handobj.hide();
          }
        } else if (handobj) {
          handobj.active = false;
          handobj.hide();
        }
      } 
    }
  }, elation.engine.things.generic);
});
