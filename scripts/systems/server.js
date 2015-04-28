elation.extend("engine.systems.server", function(args) {
  elation.implement(this, elation.engine.systems.system);
  var wrtc = require('wrtc');
  this.clients = {};
  this.transport = 'webrtc';
  var UPDATE_RATE = 40; // ms
  this.lastUpdate = null; //ms
  
  this.system_attach = function(ev) {
    console.log('INIT: networking server');
    this.world = this.engine.systems.world;
    // FIXME - hardcoded ws/wrtc setup, should be in a config
    this.server = new elation.engine.systems.server.websocket;
    
    var events = [
      [this.server, 'client_disconnected', this.onClientDisconnect],
      [this.server, 'client_connected', this.onClientConnect],
      // [this.world, 'world_thing_remove', this.onThingRemove],
      [this.world, 'world_thing_add', this.onThingAdd],
      // [this.world, 'world_thing_change', this.onThingChange]
    ];
    
    for (var i = 0; i < events.length; i++) {
      this.addEvent(events[i])  
    };
  };
  
  this.addEvent = function(args) {
    elation.events.add(args[0], args[1], elation.bind(this, args[2]));
  };
  
  this.serialize_world = function() {
    var worldmsg = {
      type: 'world_data',
      data: this.world.serialize(true)
    };
    return worldmsg;
  };
 
  this.engine_frame = function() {
    this.sendChanges();
  };

  this.sendToAll = function(data) {
    for (var client in this.clients) {
      if (this.clients.hasOwnProperty(client)) {
        this.clients[client].send(data);
      }
    }
  }

  this.onClientConnect = function(ev) {
    var client = new elation.engine.systems.server.client({
      transport: 'websocket',
      id: ev.data.id,
      socket: ev.data.channel
    });
    this.clients[ev.data.id] = client;
    elation.events.add(client, 'received_id', elation.bind(this, this.sendWorldData));
    elation.events.add(client, 'new_player', elation.bind(this, this.handleNewPlayer));
    elation.events.add(client, 'thing_changed', elation.bind(this, this.onRemoteThingChange));
    elation.events.add(client, 'new_thing', elation.bind(this, this.onNewThing));
    console.log('client connected', client.id);
    client.send({ type: 'id_token', data: client.id });
  };
  
  this.handleNewPlayer = function(ev) {
    // console.log(ev);
    elation.events.fire({type: 'add_player', data: {id: ev.target.id, thing: ev.data.data.thing}});
  };
  
  this.handleNewThing = function(ev) {
    elation.events.fire({type: 'add_thing', data: {thing: ev.data.data.thing}});
  };
  
  this.sendWorldData = function(evt) {
    // console.log('got id', evt);
    var client = this.clients[evt.data.data];
    client.send(this.serialize_world());
  };
  
  this.onThingAdd = function(ev) {
    console.log('thing add', ev.data.thing.name);
    var client_id = ev.data.thing.properties.player_id;
    
    var msg = { type: 'thing_added', data: ev.data.thing.serialize() };
    if (this.clients.hasOwnProperty(client_id)) {
      for (var client in this.clients) {
        if (this.clients.hasOwnProperty(client_id) && client != client_id ) {
          this.clients[client].send(msg); 
        }
      }
    }
    else {
      this.sendToAll(msg);
    }
  };
  
  this.onThingRemove = function(ev) {
    // console.log('thing remove', ev.data.thing.name);
    // this.sendToAll({ type:'thing_removed', data: ev.data.thing.name });
  };
  
  this.onThingChange = function(ev) {
    var thing = ev.target || ev.element;
    if (!thing.hasTag('thing_changed')) {
      thing.addTag('thing_changed');
    }
  };
  
  this.sendChanges = function() {
    if (Date.now() - this.lastUpdate > UPDATE_RATE) {
      var changed = this.world.getThingsByTag('thing_changed');
      for (var i = 0; i < changed.length; i++) {
        var thing = changed[i];
        thing.removeTag('thing_changed');
        var msgdata = {
          type: 'thing_changed', data: thing.serialize() 
        };
        if (this.clients.hasOwnProperty(thing.properties.player_id)) {
          for (var client in this.clients) {
            if (this.clients.hasOwnProperty(client) && client != thing.properties.player_id) {
              this.clients[client].send(msgdata);
            }
          }
        }
        else { this.sendToAll(msgdata); }
      }
    this.lastUpdate = Date.now(); 
    }
  }
  
  this.onRemoteThingChange = function(ev) {
    elation.events.fire('remote_thing_change', ev.data);
  }
  
  this.removeClient = function(id) {
    delete this.clients[id];
  };
  
  this.onClientDisconnect = function(ev) {
    // console.log(ev);
    var client = this.clients[ev.data];
    // elation.events.remove(client, 'received_id', elation.bind(this, this.sendWorldData));
    // elation.events.remove(client, 'new_player', elation.bind(this, this.handleNewPlayer));
    this.removeClient(ev.data);
    elation.events.fire({type: 'destroy_player', data: ev.data});
    console.log('Client disconnected, num clients:', Object.keys(this.clients).length); 
  };
 
});

elation.extend("engine.systems.server.client", function(args) {
  /**
   * This object represents a client connection
   * 
   */
   
  this.transport = args.transport;
  this.id = args.id;
  this.socket = args.socket;
  this.lastMessage = null;
  
  this.transport = args.transport;
  
  //FIXME - make this a proper polymorphic object
  if (this.transport == 'webrtc') {
   this.send = function(data) {
      if (this.socket.readyState == 'open') {
        // console.log('sent a msg');
        data.timestamp = Date.now();
        this.socket.send(JSON.stringify(data));
      }
    };
    
    this.socket.onmessage = function(evt) {
      var msgdata = JSON.parse(evt.data);
      var timestamp = msgdata.timestamp;
      if (!this.lastMessage) this.lastMessage = timestamp;
      if (timestamp >= this.lastMessage) {
        // only fire an event if the message is newer than the last received msg
        var evdata = {
          type: msgdata.type,
          data: { id: this.id, data: msgdata.data }
        };
        elation.events.fire(evdata);
        this.lastMessage = timestamp;
      } else { console.log('discarded a message'); }
    };
  }
  if (this.transport == 'websocket') {
    this.send = function(data) {
      try {
        data.timestamp = Date.now();
        this.socket.send(JSON.stringify(data));
      }
      catch(e) { console.log(e) }
    };
    this.socket.on('message', function(msg, flags) {
      var msgdata = JSON.parse(msg);
      var timestamp = msgdata.timestamp;
      if (!this.lastMessage) this.lastMessage = timestamp;
      if (timestamp >= this.lastMessage) {
        // only fire an event if the message is newer than the last received msg
        var evdata = {
          type: msgdata.type,
          data: { id: this.id, data: msgdata.data }
        };
        elation.events.fire(evdata);
        this.lastMessage = timestamp;
      };
    });
  }
});



// FIXME - servers should take args for port/etc
elation.extend("engine.systems.server.websocket", function() {
  var wsServer = require('ws').Server,
      wss = new wsServer({ port: 9001 });  
      
  wss.on('connection', function(ws) {
    console.log('websocket conn');
    var id = Date.now();
    elation.events.fire({ type: 'client_connected', data: {id: id, channel: ws}});
    ws.on('close', function() {
      elation.events.fire({type: 'client_disconnected', data: id});
    });
  });
  
})
elation.extend("engine.systems.server.webrtc", function() {
  var http = require('http');
  var webrtc = require('wrtc');
  var ws = require('ws');
  var net = require('net');
  
  // var args = require('minimist')(process.argv.slice(2));
  var MAX_REQUEST_LENGTH = 1024;
  var pc = null,
      offer = null,
      answer = null,
      remoteReceived = false;
  
  var dataChannelsettings = {
    // 'reliable': {
    //   ordered: false,
    //   maxRetransmits: 0
    // }
    'unreliable': {}
  };
  
  this.pendingDataChannels = [],
  this.dataChannels = [],
  this.pendingCandidates = [];
  
  var socketPort = 9001;
  var self = this;

  var wss = new ws.Server({'port': 9001});
  wss.on('connection', function(ws) {
    function doComplete(chan) {
      console.info('complete');
    }
    function doHandleError(error) { 
      throw error;
    }
    function doCreateAnswer() {
      remoteReceived = true;
      self.pendingCandidates.forEach(function(candidate) {
        if (candidate.sdp) {
          pc.addIceCandidate(new webrtc.RTCIceCandidate(candidate.sdp));
        }
      });
      pc.createAnswer(doSetLocalDesc, doHandleError);
    }
    function doSetLocalDesc(desc) {
      answer = desc;
      pc.setLocalDescription(desc, doSendAnswer, doHandleError);
    }
    function doSendAnswer() {
      ws.send(JSON.stringify(answer));
      console.log('awaiting data channels');
    }
  
    function doHandledataChannels() {
      var labels = Object.keys(dataChannelsettings);
      pc.ondatachannel = function(evt) {
        var channel = evt.channel;
        var id = Date.now();
        console.log('ondatachannel', channel.label, channel.readyState);
        self.pendingDataChannels.push(channel);

        channel.binaryType = 'arraybuffer';
  
        channel.onopen = function() {
          self.dataChannels.push(channel);
          self.pendingDataChannels.splice(self.pendingDataChannels.indexOf(channel), 1);
          elation.events.fire({ type: 'client_connected', data: {id: id, channel: channel}});
          doComplete(self.dataChannels[self.dataChannels.indexOf(channel)]);
          // }
        };
  
        channel.onmessage = function(evt) {
          var msgdata = JSON.parse(evt.data);
          console.log('onmessage:', evt.data);
          var evdata = {
            type: msgdata.type,
            data: {
              id: id,
              data: msgdata.data
            }
          }
          elation.events.fire(evdata);
        };
  
        channel.onclose = function() {
          self.dataChannels.splice(self.dataChannels.indexOf(channel), 1);
          elation.events.fire({type: 'client_disconnected', data: {id: id, channel: channel}})
          console.info('onclose');
        };
  
        channel.onerror = doHandleError;
      };
  
      doSetRemoteDesc();
    };
  
    function doSetRemoteDesc() {
      // console.info(offer);
      pc.setRemoteDescription(
        offer,
        doCreateAnswer,
        doHandleError
      );
    };
  
    ws.on('message', function(data) {
      data = JSON.parse(data);
      if('offer' == data.type) {
        offer = new webrtc.RTCSessionDescription(data);
        answer = null;
        remoteReceived = false;
  
        pc = new webrtc.RTCPeerConnection(
          { iceServers: [{ url:'stun:stun.l.google.com:19302' }] },
          { 'optional': [{DtlsSrtpKeyAgreement: false}] }
        );
  
        pc.onsignalingstatechange = function(state) {
          console.info('signaling state change:', state);
        };
  
        pc.oniceconnectionstatechange = function(state) {
          console.info('ice connection state change:', state);
        };
  
        pc.onicegatheringstatechange = function(state) {
          console.info('ice gathering state change:', state);
        };
  
        pc.onicecandidate = function(candidate) {
          // console.log('onicecandidate', candidate);
          ws.send(JSON.stringify(
            {'type': 'ice',
             'sdp': {'candidate': candidate.candidate, 'sdpMid': candidate.sdpMid, 'sdpMLineIndex': candidate.sdpMLineIndex}
            }));
        };
  
        doHandledataChannels();
      } 
      else if('ice' == data.type) {
        if(remoteReceived) {
          if(data.sdp.candidate) {
            pc.addIceCandidate(new webrtc.RTCIceCandidate(data.sdp.candidate));
          }
        } 
        else {
          self.pendingCandidates.push(data);
        }
      }
    }.bind(this));
  }.bind(this));  

});