elation.require(['utils.workerpool', 'engine.external.three.three', 'engine.external.libgif'], function() {

  THREE.Cache.enabled = true;

  // TODO - submit pull request to add these to three.js
  THREE.SBSTexture = function ( image, mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy ) {
    THREE.Texture.call( this, image, mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy );

    this.repeat.x = 0.5;
  }
  THREE.SBSTexture.prototype = Object.create( THREE.Texture.prototype );
  THREE.SBSTexture.prototype.constructor = THREE.SBSTexture;
  THREE.SBSTexture.prototype.setEye = function(eye) {
    if (eye == 'left') {
      this.offset.x = (this.reverse ? 0.5 : 0);
    } else {
      this.offset.x = (this.reverse ? 0 : 0.5);
    }
    this.eye = eye;
  }
  THREE.SBSTexture.prototype.swap = function() {
    if (this.eye == 'right') {
      this.setEye('left');
    } else {
      this.setEye('right');
    }
  }

  THREE.SBSVideoTexture = function ( video, mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy ) {
    THREE.VideoTexture.call( this, video, mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy );

    this.repeat.x = 0.5;
    this.reverse = false;
  }
  THREE.SBSVideoTexture.prototype = Object.create( THREE.SBSTexture.prototype );
  THREE.SBSVideoTexture.prototype.constructor = THREE.SBSVideoTexture;

  THREE.SBSVideoTexture.prototype = Object.assign( Object.create( THREE.Texture.prototype ), {

    constructor: THREE.SBSVideoTexture,

    isVideoTexture: true,

    update: function () {

      var video = this.image;

      if ( video.readyState >= video.HAVE_CURRENT_DATA ) {

        this.needsUpdate = true;

      }

    },
    setEye: function(eye) {
      if (eye == 'left') {
        this.offset.x = (this.reverse ? 0.5 : 0);
      } else {
        this.offset.x = (this.reverse ? 0 : 0.5);
      }
      this.eye = eye;
    }

  } );

  elation.extend('engine.assets', {
    assets: {},
    types: {},
    corsproxy: '',
    placeholders: {},

    init: function(dummy) {
      var corsproxy = elation.config.get('engine.assets.corsproxy', '');
      //THREE.Loader.Handlers.add(/.*/i, corsproxy);
      //THREE.Loader.Handlers.add( /\.dds$/i, new THREE.DDSLoader() );
      if (corsproxy != '') {
        this.setCORSProxy(corsproxy, dummy);
      }
    },
    loadAssetPack: function(url, baseurl) {
      this.assetroot = new elation.engine.assets.pack({name: url, src: url, baseurl: baseurl});
      return this.assetroot;
    },
    loadJSON: function(json, baseurl) {
      var assetpack = new elation.engine.assets.pack({name: "asdf", baseurl: baseurl, json: json});
      return assetpack;
    },
    get: function(asset) {
if (!ENV_IS_BROWSER) return;
      var type = asset.assettype || 'base';
      var assetclass = elation.engine.assets[type] || elation.engine.assets.unknown;
      var assetobj = new assetclass(asset);

      if (!elation.engine.assets.types[type]) elation.engine.assets.types[type] = {};
      if (assetobj.name) {
        elation.engine.assets.assets[assetobj.name] = assetobj;
        elation.engine.assets.types[type][assetobj.name] = assetobj;
      }
      return assetobj;
    },
    find: function(type, name, raw) {
if (!ENV_IS_BROWSER) return;
      var asset;
      if (elation.engine.assets.types[type]) {
        asset = elation.engine.assets.types[type][name];
      }
      //console.log(asset, type, name, elation.engine.assets.types[type]);
      if (raw) {
        return asset;
      }
      if (asset) {
        return asset.getInstance();
      } else {
        asset = elation.engine.assets.get({assettype: type, name: name});
        return asset.getInstance();
      }
      return undefined;
    },
    setCORSProxy: function(proxy, dummy) {
      elation.engine.assets.corsproxy = proxy;
      var loader = new elation.engine.assets.corsproxyloader(proxy, undefined, dummy);
      elation.engine.assetdownloader.setCORSProxy(proxy);
      THREE.Loader.Handlers.add(/.*/i, loader);

      if (!elation.env.isWorker && elation.engine.assets.loaderpool) {
        elation.engine.assets.loaderpool.sendMessage('setcorsproxy', proxy);
      }
    },
    setPlaceholder: function(type, name) {
      this.placeholders[type] = this.find(type, name);
    },
    loaderpool: false
  });
  elation.extend('engine.assetdownloader', new function() {
    this.corsproxy = '';
    this.queue = {};
    this.setCORSProxy = function(proxy) {
      this.corsproxy = proxy;
    }
    this.isUrlInQueue = function(url) {
      var fullurl = url;
      if (this.corsproxy && fullurl.indexOf(this.corsproxy) != 0) fullurl = this.corsproxy + fullurl;
      return fullurl in this.queue;
    }
    this.fetchURLs = function(urls, progress) {
      var promises = [],
          queue = this.queue;
      for (var i = 0; i < urls.length; i++) {
        let subpromise = this.fetchURL(urls[i], progress);
        promises.push(subpromise);
      }
      return Promise.all(promises);
    }
    this.fetchURL = function(url, progress) {
      var corsproxy = this.corsproxy;
      let agent = this.getAgentForURL(url);
      return agent.fetch(url, progress);
    }
    this.getAgentForURL = function(url) {
      let urlparts = elation.utils.parseURL(url);
      let agentname = urlparts.scheme;
      // Check if we have a handler for this URL protocol, if we don't then fall back to the default 'xhr' agent
      if (!elation.engine.assetloader.agent[agentname]) {
        agentname = 'xhr';
      }
      return elation.engine.assetloader.agent[agentname];
    }
  });
  elation.extend('engine.assetloader.agent.xhr', new function() {
    this.getFullURL = function(url) {
    }
    this.fetch = function(url, progress) {
      return new Promise(function(resolve, reject) {
        if (!this.queue) this.queue = {};
        var fullurl = url;
        let corsproxy = elation.engine.assetdownloader.corsproxy;
        if (corsproxy &&
            fullurl.indexOf(corsproxy) != 0 &&
            fullurl.indexOf('blob:') != 0 &&
            fullurl.indexOf('data:') != 0 &&
            fullurl.indexOf(self.location.origin) != 0)
        {
              fullurl = corsproxy + fullurl;
        }
        if (!this.queue[fullurl]) {
          var xhr = this.queue[fullurl] = elation.net.get(fullurl, null, {
            responseType: 'arraybuffer',
            onload: (ev) => {
              delete this.queue[fullurl];
              var status = ev.target.status;
              if (status == 200) {
                resolve(ev);
              } else {
                reject();
              }
            },
            onerror: () => { delete this.queue[fullurl]; reject(); },
            onprogress: progress,
            headers: {
              'X-Requested-With': 'Elation Engine asset loader'
            }
          });
        } else {
          var xhr = this.queue[fullurl];
          if (xhr.readyState == 4) {
            setTimeout(function() { resolve({target: xhr}); }, 0);
          } else {
            elation.events.add(xhr, 'load', resolve);
            elation.events.add(xhr, 'error', reject);
            elation.events.add(xhr, 'progress', progress);
          }
        }
      });
    }
  });
  elation.extend('engine.assetloader.agent.dat', new function() {
    this.fetch = function(url) {
      return new Promise((resolve, reject) => {
        if (typeof DatArchive == 'undefined') {
          console.warn('DatArchive not supported in this browser');
          reject();
          return;
        }
        
        let urlparts = elation.utils.parseURL(url);

        if (urlparts.host) {
          this.getArchive(urlparts.host).then(archive => {
            let path = urlparts.path;
            if (path[path.length-1] == '/') {
              path += 'index.html';
            }
            archive.readFile(path, 'binary').then(file => {
              // FIXME - we're emulating an XHR object here, because the asset loader was initially written for XHR and uses some of the convenience functions
              resolve({
                target: {
                  responseURL: url,
                  data: file,
                  response: file,
                  getResponseHeader(header) {
                    if (header.toLowerCase() == 'content-type') {
                      // FIXME -  We should implement mime type detection at a lower level, and avoid the need to access the XHR object in calling code
                      return 'application/octet-stream';
                    }
                  }
                },
              });
            });
          });
        }
      });
    }
    this.getArchive = function(daturl) {
      return new Promise((resolve, reject) => {
        if (!this.archives) this.archives = {};
        if (this.archives[daturl]) {
          resolve(this.archives[daturl]);
        } else {
          DatArchive.load(daturl).then(archive => {
            this.archives[daturl] = archive;
            resolve(this.archives[daturl]);
          });
        }
      });
    }
  });
  elation.extend('engine.assetcache', new function() {
    this.queued = [];
    this.open = function(name) {
      this.cachename = name;
      caches.open(name).then(elation.bind(this, this.setCache));
    }
    this.setCache = function(cache) {
      this.cache = cache;

      // If we queued any cache lookups before the cache opened, resolve them
      return Promises.all(this.queued);
    }
    this.get = function(key) {
      if (this.cache) {
        return new Promise(elation.bind(function(resolve, reject) {
          var req = (key instanceof Request ? key : new Request(key));
          this.cache.get(req).then(resolve);
        }));
      } else {
        // TODO - queue it!
        console.log('AssetCache warning: cache not open yet, cant get', key, this.cachename);
      }
    }
    this.set = function(key, value) {
      if (this.cache) {
        return new Promise(elation.bind(function(resolve, reject) {
          var req = (key instanceof Request ? key : new Request(key));
          this.cache.get(req).then(resolve);
        }));
      } else {
        // TODO - queue it!
        console.log('AssetCache warning: cache not open yet, cant set', key, value, this.cachename);
      }
    }
  });

  elation.define('engine.assets.corsproxyloader', {
    _construct: function(corsproxy, manager, dummy) {
      this.corsproxy = corsproxy || '';
      this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;
      this.uuidmap = {};
      this.dummy = dummy;
    },
    load: function ( url, onLoad, onProgress, onError ) {
      var fullurl = url;
      if (this.corsproxy != '' &&
          url.indexOf(this.corsproxy) != 0 &&
          url.indexOf('blob:') != 0 &&
          url.indexOf('data:') != 0 &&
          url.indexOf(self.location.origin) != 0) {
        fullurl = this.corsproxy + url;
      }
      if (!this.dummy) {
        return THREE.TextureLoader.prototype.load.call(this, fullurl, onLoad, onProgress, onError);
      }

      return this.getDummyTexture(fullurl, onLoad);
    },
    getDummyTexture: function(url, onLoad) {
      var texture = new THREE.Texture();
      var uuid = this.uuidmap[url];
      if (!uuid) {
        uuid = this.uuidmap[url] = THREE.Math.generateUUID();
      }
      var img = { uuid: uuid, src: url, toDataURL: function() { return url; } };
      texture.image = img;
      if (onLoad) {
        setTimeout(onLoad.bind(img, texture), 0);
      }
      return texture;
    }
  }, THREE.TextureLoader);

  elation.define('engine.assets.base', {
    assettype: 'base',
    name: '',
    description: '',
    license: 'unknown',
    author: 'unknown',
    sourceurl: false,
    size: false,
    loaded: false,
    preview: false,
    baseurl: '',
    src: false,
    proxy: true,
    preload: false,
    instances: [],

    _construct: function(args) {
      elation.class.call(this, args);
      this.init();
    },
    init: function() {
      this.instances = [];
      if (this.preload && this.preload !== 'false') {
        this.load();
      }
    },
    load: function() {
      console.log('engine.assets.base load() should not be called directly', this);
    },
    isURLRelative: function(src) {
      if (src && src.match(/^(https?:)?\/\//) || src[0] == '/') {
        return false;
      }
      return true;
    },
    isURLAbsolute: function(src) {
      return (src[0] == '/' && src[1] != '/');
    },
    isURLLocal: function(src) {
      if (this.isURLBlob(src) || this.isURLData(src)) {
        return true;
      }
      if (src.match(/^(https?:)?\/\//i)) {
        return (src.indexOf(self.location.origin) == 0);
      }
      return (
        (src[0] == '/' && src[1] != '/') ||
        (src[0] != '/')
      );
    },
    isURLData: function(url) {
      if (!url) return false;
      return url.indexOf('data:') == 0;
    },
    isURLBlob: function(url) {
      if (!url) return false;
      return url.indexOf('blob:') == 0;
    },
    isURLProxied: function(url) {
      if (!url || !elation.engine.assets.corsproxy) return false;
      return url.indexOf(elation.engine.assets.corsproxy) == 0;
    },
    getFullURL: function(url, baseurl) {
      if (!url) url = this.src;
      if (!baseurl) baseurl = this.baseurl;
      var fullurl = url;
      if (!this.isURLBlob(fullurl) && !this.isURLData(fullurl)) {
        if (this.isURLRelative(fullurl)) {
          fullurl = baseurl + fullurl;
        } else if (this.isURLProxied(fullurl)) {
          fullurl = fullurl.replace(elation.engine.assets.corsproxy, '');
        } else if (this.isURLAbsolute(fullurl)) {
          fullurl = self.location.origin + fullurl;
        }
      }

      return fullurl;
    },
    getProxiedURL: function(url, baseurl) {
      var proxiedurl = this.getFullURL(url, baseurl);
      if (this.proxy && this.proxy != 'false' && proxiedurl && elation.engine.assets.corsproxy && !this.isURLLocal(proxiedurl) && proxiedurl.indexOf(elation.engine.assets.corsproxy) == -1) {
        var re = /:\/\/([^\/\@]+@)/;
        var m = proxiedurl.match(re);
        // Check it asset has authentication info, and pass it through if it does
        if (m) {
          proxiedurl = elation.engine.assets.corsproxy.replace(':\/\/', ':\/\/' + m[1]) + proxiedurl.replace(m[1], '');
        } else {
          proxiedurl = elation.engine.assets.corsproxy + proxiedurl;
        }
      }
      return proxiedurl;
    },
    getBaseURL: function(url) {
      var url = url || this.getFullURL();
      var parts = url.split('/');
      parts.pop();
      return parts.join('/') + '/';
    },
    getInstance: function(args) {
      return undefined;
    },
    executeWhenLoaded: function(callback) {
      if (this.loaded) {
        // We've already loaded the asset, so execute the callback asynchronously
        setTimeout(callback, 0);
      } else {
        // Asset isn't loaded yet, set up a local callback that can self-remove, so our callback only executes once
        let cb = (ev) => {
          elation.events.remove(this, 'asset_load', cb);
          callback();
        };
        elation.events.add(this, 'asset_load', cb);
      }
    }
  }, elation.class);

  elation.define('engine.assets.unknown', {
    assettype: 'unknown',
    load: function() {
    },
    _construct: function(args) {
      console.log('Unknown asset type: ', args.assettype, args);
      elation.engine.assets.base.call(this, args);
    }
  }, elation.engine.assets.base);

  elation.define('engine.assets.image', {
    assettype: 'image',
    src: false,
    canvas: false,
    sbs3d: false,
    ou3d: false,
    reverse3d: false,
    texture: false,
    frames: false,
    flipy: true,
    invert: false,
    imagetype: '',
    tex_linear: true,
    hasalpha: null,
    rawimage: null,
    preload: true,
    maxsize: null,

    load: function() {
      if (this.texture) {
        this._texture = this.texture;
      } else if (this.src) {
        var fullurl = this.getFullURL(this.src);
        var texture;
        if (this.sbs3d) {
          texture = this._texture = new THREE.SBSTexture();
          texture.reverse = this.reverse3d;
        } else {
          texture = this._texture = new THREE.Texture();
        }
        texture.image = this.canvas = this.getCanvas();
        texture.image.originalSrc = this.src;
        texture.sourceFile = this.src;
        texture.needsUpdate = true;
        texture.flipY = (this.flipy === true || this.flipy === 'true');
        if (this.isURLData(fullurl)) {
          this.loadImageByURL();
        } else {
          elation.engine.assetdownloader.fetchURLs([fullurl], elation.bind(this, this.handleProgress)).then(
            elation.bind(this, function(events) {
              var xhr = events[0].target;
              var type = this.contenttype = xhr.getResponseHeader('content-type')
              if (typeof createImageBitmap == 'function' && type != 'image/gif') {
                var blob = new Blob([xhr.response], {type: type});
                createImageBitmap(blob).then(elation.bind(this, this.handleLoad), elation.bind(this, this.handleBitmapError));
              } else {
                this.loadImageByURL();
              }

              this.state = 'processing';
              elation.events.fire({element: this, type: 'asset_load_processing'});
            }), 
            elation.bind(this, function(error) {
              this.state = 'error';
              elation.events.fire({element: this, type: 'asset_error'});
            })
          );
          elation.events.fire({element: this, type: 'asset_load_queued'});
        }
      } else if (this.canvas) {
        var texture = this._texture = new THREE.Texture();
        texture.image = this.canvas;
        texture.image.originalSrc = '';
        texture.sourceFile = '';
        texture.needsUpdate = true;
        texture.flipY = this.flipy;

        elation.events.add(this.canvas, 'update', () => texture.needsUpdate = true);
        this.sendLoadEvents();
      }
    },
    loadImageByURL: function() {
      var proxiedurl = this.getProxiedURL(this.src);
      var image = document.createElementNS( 'http://www.w3.org/1999/xhtml', 'img' );
      elation.events.add(image, 'load', elation.bind(this, this.handleLoad, image));
      elation.events.add(image, 'error', elation.bind(this, this.handleError));
      image.crossOrigin = 'anonymous';
      image.src = proxiedurl;
      return image;
    },
    getCanvas: function() {
      if (!this.canvas) {
        var canvas = document.createElement('canvas');
        var size = 32,
            gridcount = 4,
            gridsize = size / gridcount;
        canvas.width = size;
        canvas.height = size;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#cccccc';
        ctx.fillRect(0,0,size,size);
        ctx.fillStyle = '#666666';
        for (var i = 0; i < gridcount*gridcount; i += 1) {
          var x = i % gridcount;
          var y = Math.floor(i / gridcount);
          if ((x + y) % 2 == 0) {
            ctx.fillRect(x * gridsize, y * gridsize, gridsize, gridsize);
          }
        }
        this.canvas = canvas;
      }
      return this.canvas;
    },
    handleLoad: function(image) {
      //console.log('loaded image', this, image);
      this.rawimage = image;
      var texture = this._texture;
      texture.image = this.processImage(image);
      texture.needsUpdate = true;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.anisotropy = elation.config.get('engine.assets.image.anisotropy', 4);
      this.loaded = true;
      this.uploaded = false;

      this.sendLoadEvents();
    },
    sendLoadEvents: function() {
      elation.events.fire({type: 'asset_load', element: this._texture});
      elation.events.fire({type: 'asset_load', element: this});
      elation.events.fire({element: this, type: 'asset_load_complete'});
    },
    handleProgress: function(ev) {
      var progress = {
        src: ev.target.responseURL,
        loaded: ev.loaded,
        total: ev.total
      };
      this.size = ev.total;
      //console.log('image progress', progress);
      elation.events.fire({element: this, type: 'asset_load_progress', data: progress});
    },
    handleBitmapError: function(src, ev) {
      console.log('Error loading image via createImageBitmap, fall back on normal image');
      this.loadImageByURL();
    },
    handleError: function(ev) {
      console.log('image error!', this, this._texture.image, ev);
      var canvas = this.getCanvas();
      var size = 16;
      canvas.width = canvas.height = size;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#f0f';
      ctx.fillRect(0,0,size,size);
      
      this._texture.image = canvas;
      this._texture.needsUpdate = true;
      this._texture.generateMipmaps = false;
      elation.events.fire({type: 'asset_error', element: this._texture});
    },
    getInstance: function(args) {
      if (!this._texture) {
        this.load();
      }
      return this._texture;
    },
    processImage: function(image) {
      this.imagetype = this.detectImageType();
      if (this.imagetype == 'gif') {
        this.hasalpha = true; // FIXME - if we're cracking the gif open already, we should be able to tell if it has alpha or not
        return this.convertGif(image); 
      } else { //if (!elation.engine.materials.isPowerOfTwo(image.width) || !elation.engine.materials.isPowerOfTwo(image.height)) {
        // Scale up the texture to the next highest power of two dimensions.
        var canvas = this.canvas;
        canvas.src = this.src;
        canvas.originalSrc = this.src;

        var imagemax = elation.utils.any(this.maxsize, elation.config.get('engine.assets.image.maxsize', Infinity));
        canvas.width = Math.min(imagemax, this.nextHighestPowerOfTwo(image.width));
        canvas.height = Math.min(imagemax, this.nextHighestPowerOfTwo(image.height));
        var ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, image.width, image.height, 0, 0, canvas.width, canvas.height);
        if (this.hasalpha === null) {
          if (!this.src.match(/\.jpg$/i)) {
            this.hasalpha = this.canvasHasAlpha(canvas);
          } else {
            this.hasalpha = false;
          }
        }
        this._texture.generateMipmaps = elation.config.get('engine.assets.image.mipmaps', true);
        if (this.invert) {
          this.invertImage(canvas);
        }

        return canvas;
      //} else {
      //  return image;
      }
    },
    convertGif: function(image) {
      var gif = new SuperGif({gif: image, draw_while_loading: true, loop_mode: false, auto_play: false});

      // Decode gif frames into a series of canvases, then swap between canvases to animate the texture

      // This could be made more efficient by uploading each frame to the GPU as a separate texture, and
      // swapping the texture handle each frame instead of re-uploading the frame.  This is hard to do
      // with the way Three.js handles Texture objects, but it might be possible to fiddle with 
      // renderer.properties[texture].__webglTexture directly

      // It could also be made more efficient by moving the gif decoding into a worker, and just passing
      // back messages with decoded frame data.

      var getCanvas = () => {
        var newcanvas = document.createElement('canvas');
        newcanvas.width = this.nextHighestPowerOfTwo(image.width);
        newcanvas.height = this.nextHighestPowerOfTwo(image.height);
        return newcanvas;
      }
      var newcanvas = getCanvas();
      var mainctx = newcanvas.getContext('2d');

      var texture = this._texture;
      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;
      //texture.generateMipmaps = false;
      var frames = [];
      var frametextures = this.frames = [];
      var framedelays = [];
      var framenum = -1;
      var lastframe = texture;
      gif.load(function() {
        var canvas = gif.get_canvas();

        var doGIFFrame = function(isstatic) {
          framenum = (framenum + 1) % gif.get_length();
          var frame = frames[framenum];
          if (!frame) {
            gif.move_to(framenum);
            var gifframe = gif.get_frame(framenum);
            if (gifframe) {
              frame = frames[framenum] = { framenum: framenum, delay: gifframe.delay, image: getCanvas() };
              ctx = frame.image.getContext('2d');
              newcanvas.width = canvas.width;
              newcanvas.height = canvas.height;
              //mainctx.putImageData(gifframe.data, 0, 0, 0, 0, canvas.width, canvas.height);
              ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, frame.image.width, frame.image.height);
              texture.minFilter = texture.magFilter = THREE.NearestFilter; // FIXME - should this be hardcoded for all gifs?

              frametextures[framenum] = new THREE.Texture(frame.image);
              frametextures[framenum].minFilter = frametextures[framenum].magFilter = THREE.NearestFilter; // FIXME - should this be hardcoded for all gifs?
              frametextures[framenum].wrapS = frametextures[framenum].wrapT = THREE.RepeatWrapping;
              frametextures[framenum].needsUpdate = true;
            }
          }
          if (frame && frame.image) {
            /*
            texture.image = frame.image;
            texture.needsUpdate = true;
            elation.events.fire({type: 'update', element: texture});
            */
            var frametex = frametextures[framenum] || lastframe;
            if (frametex !== lastframe) {
              lastframe = frametex;
            }
            elation.events.fire({element: texture, type: 'asset_update', data: frametex});
          }

          if (!isstatic) {
            var delay = (frame && frame.delay > 0 ? frame.delay : 10);
            setTimeout(doGIFFrame, delay * 10);
          }
        }
        doGIFFrame(gif.get_length() == 1);
      });
      return newcanvas;
    },
    detectImageType: function() {
      // FIXME - really we should be cracking open the file and looking at magic number to determine this
      // We might also be able to get hints from the XHR loader about the image's MIME type

      var type = 'jpg';
      if (this.contenttype) {
        var map = {
          'image/jpeg': 'jpg',
          'image/png': 'png',
          'image/gif': 'gif',
        };
        type = map[this.contenttype];
      } else if (this.src.match(/\.(.*?)$/)) {
        var parts = this.src.split('.');
        type = parts.pop();
      }
      return type;
    },
    canvasHasAlpha: function(canvas) {
      if (!(this.imagetype == 'gif' || this.imagetype == 'png')) {
        return false;
      }

      // This could be made more efficient by doing the work on the gpu.  We could make a scene with the
      // texture and an orthographic camera, and a shader which returns alpha=0 for any alpha value < 1
      // We could then perform a series of downsamples until the texture is (1,1) in size, and read back
      // that pixel value with readPixels().  If there was any alpha in the original image, this final 
      // pixel should also be transparent.

      var width = Math.min(64, canvas.width), 
          height = Math.min(64, canvas.height); 

      if (!this._scratchcanvas) {
        this._scratchcanvas = document.createElement('canvas');
        this._scratchcanvasctx = this._scratchcanvas.getContext('2d');
      }

      var checkcanvas = this._scratchcanvas,
          ctx = this._scratchcanvasctx;

      checkcanvas.width = width;
      checkcanvas.height = height;

      ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, width, height);

      var pixeldata = ctx.getImageData(0, 0, width, height);
      var hasalpha = false;
      for (var i = 0; i < pixeldata.data.length; i+=4) {
        if (pixeldata.data[i+3] != 255) {
          return true;
        }
      }
      return false;
    },
    invertImage: function(canvas) {
      var ctx = canvas.getContext('2d');
      var pixeldata = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (var i = 0; i < pixeldata.data.length; i+=4) {
        pixeldata.data[i] = 255 - pixeldata.data[i];
        pixeldata.data[i+1] = 255 - pixeldata.data[i+1];
        pixeldata.data[i+2] = 255 - pixeldata.data[i+2];
      }
      ctx.putImageData(pixeldata, 0, 0);
    },
    nextHighestPowerOfTwo: function(num) {
      num--;
      for (var i = 1; i < 32; i <<= 1) {
        num = num | num >> i;
      }
      return num + 1;
    }
  }, elation.engine.assets.base);

  elation.define('engine.assets.video', {
    assettype: 'video',
    src: false,
    sbs3d: false,
    ou3d: false,
    reverse3d: false,
    auto_play: false,
    texture: false,
    load: function() {
      var url = this.getProxiedURL(this.src);
      var video = document.createElement('video');
      video.muted = false;
      video.src = url;
      video.crossOrigin = 'anonymous';
      this._video = video;
      if (this.sbs3d) {
        this._texture = new THREE.SBSVideoTexture(video);
        this._texture.reverse = this.reverse3d;
      } else {
        this._texture = new THREE.VideoTexture(video);
      }
      this._texture.minFilter = THREE.LinearFilter;
      elation.events.add(video, 'loadeddata', elation.bind(this, this.handleLoad));
      elation.events.add(video, 'error', elation.bind(this, this.handleError));

      if (this.auto_play) {
        // FIXME - binding for easy event removal later. This should happen at a lower level
        this.handleAutoplayStart = elation.bind(this, this.handleAutoplayStart);

        // Bind on next tick to avoid time-ou firing prematurely due to load-time lag
        setTimeout(elation.bind(this, function() {
          elation.events.add(video, 'playing', this.handleAutoplayStart);
          this._autoplaytimeout = setTimeout(elation.bind(this, this.handleAutoplayTimeout), 1000);
        }), 0);
        var promise = video.play();
        if (promise) {
          promise.then(elation.bind(this, function() {
            this.handleAutoplayStart();
          })).catch(elation.bind(this, function(err) {
            // If autoplay failed, retry with muted video
            var strerr = err.toString();
            if (strerr.indexOf('NotAllowedError') == 0) {
              video.muted = true;
              video.play().catch(elation.bind(this, this.handleAutoplayError));
            } else if (strerr.indexOf('NotSupportedError') == 0) {
              this.initHLS();
            }
          }));
        }
      }
    },
    handleLoad: function() {
      this.loaded = true;
      elation.events.fire({element: this, type: 'asset_load'});
      elation.events.fire({element: this, type: 'asset_load_complete'});
    },
    handleProgress: function(ev) {
      //console.log('image progress!', ev);
      var progress = {
        src: ev.target.responseURL,
        loaded: ev.loaded,
        total: ev.total
      };
      this.size = ev.total;
      elation.events.fire({element: this, type: 'asset_load_progress', data: progress});
    },
    handleError: function(ev) {
      //console.log('video uh oh!', ev);
      //this._texture = false;
      //console.log('Video failed to load, try HLS');
    },
    handleAutoplayStart: function(ev) {
      if (this._autoplaytimeout) {
        clearTimeout(this._autoplaytimeout);
      }
      elation.events.remove(this._video, 'playing', this.handleAutoplayStart);
      elation.events.fire({element: this._texture, type: 'autoplaystart'});
    },
    handleAutoplayTimeout: function(ev) {
      elation.events.fire({element: this._texture, type: 'autoplaytimeout'});
    },
    handleAutoplayFail: function(ev) {
      elation.events.fire({element: this._texture, type: 'autoplayfail'});
    },
    getInstance: function(args) {
      if (!this._texture) {
        this.load();
      }
      return this._texture;
    },
    initHLS: function() {
      if (typeof Hls != 'function') {
        elation.file.get('js', 'https://cdn.jsdelivr.net/npm/hls.js@latest', elation.bind(this, this.initHLS));
        return;
      }
      var hls = new Hls();
      hls.loadSource(this.getProxiedURL());
      hls.attachMedia(this._video);

      if (this.auto_play) {
        var video = this._video;
        hls.on(Hls.Events.MANIFEST_PARSED, function() {
          video.play();
        });
      }
    }
  }, elation.engine.assets.base);
  elation.define('engine.assets.material', {
    assettype: 'material',
    color: null,
    map: null,
    normalMap: null,
    specularMap: null,
    load: function() {
      var matargs = {};
      if (this.color) matargs.color = new THREE.Color(this.color);
      if (this.map) matargs.map = elation.engine.assets.find('image', this.map);
      if (this.normalMap) matargs.normalMap = elation.engine.assets.find('image', this.normalMap);
      if (this.specularMap) matargs.specularMap = elation.engine.assets.find('image', this.normalMap);

      this._material = new THREE.MeshPhongMaterial(matargs);
      console.log('new material!', this._material);
    },
    getInstance: function(args) {
      if (!this._material) {
        this.load();
      }
      return this._material;
    },
    handleLoad: function(data) {
      console.log('loaded image', data);
      this._texture = data;
    },
    handleProgress: function(ev) {
    },
    handleError: function(ev) {
      console.log('image uh oh!', ev);
      this._texture = false;
    }
  }, elation.engine.assets.base);

  elation.define('engine.assets.sound', {
    assettype: 'sound',
    src: false,

    load: function() {
      if (this.src) {
        //this._sound = new THREE.Audio(this.src);
      }
    },
    handleLoad: function(data) {
      console.log('loaded sound', data);
      this._sound = data;
      this.loaded = true;
    },
    handleProgress: function(ev) {
      console.log('sound progress!', ev);
      this.size = ev.total;
    },
    handleError: function(ev) {
      console.log('sound uh oh!', ev);
      this._sound = false;
    },
    getInstance: function(args) {
      return this;
      /*
      if (!this._sound) {
        this.load();
      }
      return this._sound;
      */
    }
  }, elation.engine.assets.base);

  elation.define('engine.assets.model', {
    assettype: 'model',
    src: false,
    mtl: false,
    tex: false,
    tex0: false,
    tex1: false,
    tex2: false,
    tex3: false,
    tex_linear: true,
    color: false,
    modeltype: '',
    compression: 'none',
    object: false,

    loadworkers: [
    ],

    getInstance: function(args) {
      var group = new THREE.Group();
      if (!this._model) {
        if (!this.loading) {
          this.load();
        }
        var mesh;
        if (elation.engine.assets.placeholders.model) {
          mesh = elation.engine.assets.placeholders.model.clone();
        } else {
          mesh = this.createPlaceholder();
        }
        group.add(mesh);
      } else {
        //group.add(this._model.clone());
        this.fillGroup(group, this._model);
        //group = this._model.clone();
        this.assignTextures(group, args);
        setTimeout(function() {
          elation.events.fire({type: 'asset_load', element: group});
          elation.events.fire({type: 'asset_load', element: this});
        }, 0);
      }
      this.instances.push(group);
      return group;
    },
    fillGroup: function(group, source) {
      if (!source) source = this._model;
      if (source) {
/*
        group.position.copy(source.position);
        group.quaternion.copy(source.quaternion);
        //group.scale.copy(source.scale);
        if (source.children) {
          source.children.forEach(function(n) {
            group.add(n.clone());
          });
        }
*/
        var newguy = source.clone();
        group.add(newguy);
        newguy.updateMatrix(true);
        newguy.updateMatrixWorld(true);

        newguy.traverse(function(n) {
          if (n instanceof THREE.SkinnedMesh) {
            //n.rebindByName(newguy);
          }
        });
      }
      return group;
    },
    copyMaterial: function(oldmat) {
      var m = new THREE.MeshPhongMaterial();
      m.anisotropy = elation.config.get('engine.assets.image.anisotropy', 4);
      m.name = oldmat.name;
      m.map = oldmat.map;
      m.normalMap = oldmat.normalMap;
      m.lightMap = oldmat.lightMap;
      m.color.copy(oldmat.color);
      m.transparent = oldmat.transparent;
      m.alphaTest = oldmat.alphaTest;
      return m;
    },
    assignTextures: function(group, args) {
      var minFilter = (this.tex_linear && this.tex_linear != 'false' ? THREE.LinearMipMapLinearFilter : THREE.NearestFilter);
      var magFilter = (this.tex_linear && this.tex_linear != 'false' ? THREE.LinearFilter : THREE.NearestFilter);

      if (this.tex) this.tex0 = this.tex;
      if (this.tex0) {
        var tex0 = elation.engine.assets.find('image', this.tex0);
        if (!tex0) {
          var asset = elation.engine.assets.get({
            assettype: 'image', 
            name: this.tex0, 
            src: this.tex0,
            baseurl: this.baseurl
          });
          tex0 = asset.getInstance();
        }
      }
      group.traverse(function(n) { 
        if (n.material) {
          var materials = (elation.utils.isArray(n.material) ? n.material : [n.material]);
          materials.forEach(function(m) {
            if (tex0) {
              //m.transparent = true; 
              m.alphaTest = 0.1;
              m.map = tex0; 
            }
            if (m.map) {
              m.map.minFilter = minFilter;
              m.map.magFilter = magFilter;
            }
            m.needsUpdate = true;
            //if (m.color) m.color.setHex(0xffffff);
          });
        } 
      });
    },
    createPlaceholder: function() {
/*
      var geo = new THREE.TextGeometry('loading...', { size: 1, height: .1, font: 'helvetiker' });
      var font = elation.engine.assets.find('font', 'helvetiker');

      var geo = new THREE.TextGeometry( 'loading...', {
        size: 1,
        height: 0.1,

        font: font,
      });                                                
*/
/*
      var geo = new THREE.SphereGeometry(0.25);
      //geo.applyMatrix(new THREE.Matrix4().makeScale(1,1,.1));
      var mat = new THREE.MeshPhongMaterial({color: 0x999900, emissive: 0x333333, opacity: 0.5, transparent: true});
      this.placeholder = new THREE.Mesh(geo, mat);
*/
      this.placeholder = new THREE.Object3D();
      
      return this.placeholder;
    },
    load: function() {
      if (this.object) {
        this.loading = false;
        this.loaded = true;
        this.state = 'complete';
        this._model = new THREE.Group();
        setTimeout(() => this.complete(this.object), 0);
      } else if (this.src) {
        this.loading = true;
        this.loaded = false;

        this.state = 'loading';
        
        var loadargs = {src: this.getFullURL()};
        if (this.mtl) loadargs.mtl = this.getFullURL(this.mtl, this.getBaseURL(loadargs.src));
        this.queueForDownload(loadargs);
      } else {
        this.removePlaceholders();
      }
    },
    detectType: function(url) {
      var parts = url.split('.');
      var extension = parts.pop();
      if (extension == 'gz') {
        extension = parts.pop();
        this.extension = extension;
        this.compression = 'gzip';
      }
      return extension.toLowerCase();
    },
    queueForDownload: function(jobdata) {
      var urls = [jobdata.src];
      if (jobdata.mtl) urls.push(jobdata.mtl);
      this.state = 'queued';
      var progressfunc = elation.bind(this, function(progress) {
          if (this.state == 'queued') {
            this.state = 'downloading';
            elation.events.fire({element: this, type: 'asset_load_start'});
          }

          this.handleLoadProgress(progress);
      });

      elation.engine.assetdownloader.fetchURLs(urls, progressfunc).then(
        elation.bind(this, function(events) {
          var files = [];
          events.forEach(function(ev) {
            var url = ev.target.responseURL,
                data = ev.target.response;
            if (url == jobdata.src) {
              jobdata.srcdata = data;
            } else if (url == jobdata.mtl) {
              jobdata.mtldata = data;
            }
          });
          this.state = 'processing';
          this.loadWithWorker(jobdata);
          elation.events.fire({element: this, type: 'asset_load_processing'});
        }), 
        elation.bind(this, function(error) {
          this.state = 'error';
          elation.events.fire({element: this, type: 'asset_error'});
        })
      );
      elation.events.fire({element: this, type: 'asset_load_queued'});
    },
    loadWithWorker: function(jobdata) {
      this._model = new THREE.Group();
      this._model.userData.loaded = false;
      if (!elation.engine.assets.loaderpool) {
        var numworkers = elation.config.get('engine.assets.workers', 'auto'); // default to 'auto' unless otherwise specified
        if (numworkers == 'auto') { // 'auto' means use all cores, minus one for the main thread
          let numcores = navigator.hardwareConcurrency || 2; // Safari returns NaN for navigator.hardwareConcurrency unless you enable a dev flag. Fall back 2 cores, which is what iOS would cap this value at anyway
          numworkers = Math.max(1, numcores - 1); // We need at least one worker, even on single-core systems
        }
        elation.engine.assets.loaderpool = new elation.utils.workerpool({component: 'engine.assetworker', scriptsuffix: 'assetworker', num: numworkers});
      }
      elation.engine.assets.loaderpool.addJob(jobdata)
        .then(
          elation.bind(this, this.handleLoadJSON), 
          elation.bind(this, this.handleLoadError)
          //elation.bind(this, this.handleLoadProgress)
        );
    },
    complete: function(object) {
      this.removePlaceholders();
      this._model.userData.loaded = true;
      //this._model.add(scene);
      this.fillGroup(this._model, object);

      this.extractTextures(object);
      //this.assignTextures(scene);

      this.instances.forEach(elation.bind(this, function(n) {
        if (!n.userData.loaded) {
          n.userData.loaded = true;
          //n.add(scene.clone());
          this.fillGroup(n, object);
          //this.assignTextures(n);
          elation.events.fire({type: 'asset_load', element: n});
          //elation.events.fire({type: 'asset_load_complete', element: this});
        }
      }));

      this.state = 'complete';
      elation.events.fire({element: this, type: 'asset_load_processed'});
      elation.events.fire({type: 'asset_load', element: this});
    },

    handleLoadJSON: function(json) {
      if (json) {
        this.loaded = true;
        var parser = new THREE.ObjectLoader();
        parser.setCrossOrigin('anonymous');
        var scene = parser.parse(json);
        this.complete(scene);
      } else {
        // no model data, error!
        elation.events.fire({type: 'asset_error', element: this});
      }
    },
    handleLoadError: function(e) {
      console.log('Error loading model', this, e);
      this.state = 'error';
      var errorgeo = new THREE.SphereGeometry(0.25);
      var error = new THREE.Mesh(errorgeo, new THREE.MeshBasicMaterial({color: 0xff0000, transparent: true, opacity: .5, transparent: true, opacity: .51}));
      this.fillGroup(this._model, error);

      this.instances.forEach(elation.bind(this, function(n) { 
        if (!n.userData.loaded) {
          n.userData.loaded = true;
          //n.add(scene.clone()); 
          this.fillGroup(n, error);
          elation.events.fire({type: 'asset_load', element: n});
        }
      }));
      elation.events.fire({type: 'asset_error', element: this});
    },
    handleLoadProgress: function(progress) {
      //console.log('Model loading progress', this, progress.loaded, progress.total, progress);
      var progressdata = {
        src: progress.target.responseURL,
        loaded: progress.loaded,
        total: progress.total,
      };
      this.size = (progress.total >= progress.loaded ? progress.total : progress.loaded);
      elation.events.fire({element: this, type: 'asset_load_progress', data: progressdata});
    },
    extractTextures: function(scene) {
      var types = ['map', 'bumpMap', 'lightMap', 'normalMap', 'specularMap', 'aoMap'];
      var textures = {};
      var texturepromises = [];

      var minFilter = (this.tex_linear && this.tex_linear != 'false' ? THREE.LinearMipMapLinearFilter : THREE.NearestFilter);
      var magFilter = (this.tex_linear && this.tex_linear != 'false' ? THREE.LinearFilter : THREE.NearestFilter);

      scene.traverse(elation.bind(this, function(n) { 
        if (n instanceof THREE.Mesh) {
          var materials = elation.utils.isArray(n.material) ? n.material : [n.material];

          materials.forEach(elation.bind(this, function(material) {
            types.forEach(elation.bind(this, function(texname) { 
              var tex = material[texname];

              if (tex) { // && tex.image instanceof HTMLImageElement) {
                var img = tex.image;
                var src = img.originalSrc || img.src;
                if (!textures[src]) {
                  //elation.engine.assets.loadJSON([{"assettype": "image", name: src, "src": src}], this.baseurl); 
                  //tex = elation.engine.assets.find('image', src);

                  var asset = elation.engine.assets.find('image', src, true);
                  if (!asset) {
                    asset = elation.engine.assets.get({
                      assettype: 'image', 
                      name: src, 
                      src: src,
                      hasalpha: (texname == 'map' ? null : false), // We only care about alpha channel for our diffuse map. (null means autodetect)
                      baseurl: this.baseurl,
                      flipy: tex.flipY,
                      invert: (texname == 'specularMap')
                    });
                  }
                  if (!asset.loaded) {
                    texturepromises.push(new Promise(elation.bind(this, function(resolve, reject) {
                      elation.events.add(asset, 'asset_load_complete', resolve);
                      elation.events.add(asset, 'asset_error', reject);
                    })));
                    elation.events.fire({element: this, type: 'asset_load_dependency', data: asset});
                  }
                  tex = asset.getInstance();
                  material[texname] = textures[src] = tex;
                } else {
                  tex = material[texname] = textures[src];
                }
              }
            }));
          }));
        }
        for (var k in textures) {
          var tex = textures[k];
          if (tex) {
            //tex.minFilter = minFilter;
            //tex.magFilter = magFilter;
          }
        }
      }));

      if (texturepromises.length > 0) {
        var total = texturepromises.length,
            finished = 0;

        // Send the completed event when all textures this model references are loaded
        var completed = function() { 
          if (++finished >= total) {
            elation.events.fire({element: this, type: 'asset_load_complete'});
          }
        };

        for (var i = 0; i < texturepromises.length; i++) {
          texturepromises[i].then(elation.bind(this, completed), elation.bind(this, completed));
        }
      } else {
        setTimeout(elation.bind(this, function() {
          elation.events.fire({element: this, type: 'asset_load_complete'});
        }), 0);
      }
    },
    extractAnimations: function(scene) {
      var animations = [];

      if (!scene) scene = this._model;

      scene.traverse(function(n) {
        if (n.animations) {
          console.log('ANIMATIONS:', n);
          //animations[n.name] = n;
          animations.push.apply(animations, n.animations);
        }
      });
      return animations;
    },
    extractSkeleton: function(scene) {
      var skeleton = false;

      scene.traverse(function(n) {
        if (n.skeleton && !skeleton) {
          console.log('SKELETON:', n.skeleton);
          skeleton = n.skeleton;
        } 
      });
      return skeleton;
    },
    handleProgress: function(ev) {
      //console.log('model progress!', ev);
    },
    handleError: function(ev) {
      console.log('model uh oh!', ev);
      if (this.placeholder) {
        var placeholder = this.placeholder;
        var mat = new THREE.MeshPhongMaterial({color: 0x990000, emissive: 0x333333});
        var errorholder = new THREE.Mesh(new THREE.SphereGeometry(1), mat);
        this.instances.forEach(function(n) { n.remove(placeholder); n.add(errorholder); });
        
      }
    },
    removePlaceholders: function() {
      if (this.placeholder) {
        var placeholder = this.placeholder;
        this.instances.forEach(function(n) { n.remove(placeholder); });
        if (this._model) {
          this._model.remove(placeholder);
        }
      }
    },
    stats: function(stats) {
      var obj = this._model;
      if (!stats) {
        stats = {
          objects: 0,
          faces: 0,
          materials: 0
        };
      }
      obj.traverse((n) => {
        if (n instanceof THREE.Mesh) {
          stats.objects++;
          var geo = n.geometry;
          if (geo instanceof THREE.BufferGeometry) {
            stats.faces += geo.attributes.position.count / 3;
          } else {
            stats.faces += geofaces.length;
          }

          if (n.material instanceof THREE.Material) {
            stats.materials++;
          } else if (elation.utils.isArray(n.material)) {
            stats.materials += n.material.length;
          }
        }
      });
      return stats;
    }
  }, elation.engine.assets.base);

  elation.define('engine.assets.pack', {
    assettype: 'pack',
    src: false,
    json: false,
    assets: null,
    assetmap: null,
  
    init: function() {
      this.assets = [];
      this.assetmap = {};
      this.load();
    },
    load: function() {
      elation.events.fire({element: this, type: 'asset_load_queued'});
      if (this.json) {
        this.loadJSON(this.json);
      } else if (this.src) {
        var url = this.getFullURL();
        this.loadURL(url);
      }
    },
    loadURL: function(url) {
      console.log('load:', url);
      elation.net.get(url, null, { 
        callback: elation.bind(this, function(data) {
          //console.log('got it', this, data);
          console.log('loaded:', url);
          this.loadJSON(JSON.parse(data));
        }),
      });
    },
    loadJSON: function(json) {
      //this.json = json;
      elation.events.fire({element: this, type: 'asset_load_processing'});
      var baseurl = (this.baseurl && this.baseurl.length > 0 ? this.baseurl : this.getBaseURL());
      if (!this.assets) this.assets = [];
      for (var i = 0; i < json.length; i++) {
        var assetdef = json[i];
        assetdef.baseurl = baseurl;
        var existing = elation.utils.arrayget(this.assetmap, assetdef.assettype + '.' + assetdef.name); //elation.engine.assets.find(assetdef.assettype, assetdef.name, true);
        if (!existing) {
          var asset = elation.engine.assets.get(assetdef);
          this.assets.push(asset);
          if (!this.assetmap[asset.assettype]) this.assetmap[asset.assettype] = {};
          this.assetmap[asset.assettype][asset.name] = asset;
        }
        //asset.load();
      }
      this.loaded = true;
      elation.events.fire({element: this, type: 'asset_load'});
    },
    get: function(type, name, create) {
      if (this.assetmap[type] && this.assetmap[type][name]) {
        return this.assetmap[type][name];
      }

      if (create) {
        // If requested, create a new asset if it doesn't exist yet
        // FIXME - right now we're assuming the name is a url, which sometimes leads to 404s

        var assetargs = {assettype: type, name: name, src: name};
        if (typeof create == 'object') {
          elation.utils.merge(create, assetargs);
        }
        this.loadJSON([assetargs]);
        return this.assetmap[type][name];
      }
      return;
    },
    _construct: function(args) {
      elation.engine.assets.base.call(this, args);
      if (!this.name) {
        this.name = this.getFullURL();
      }
    }
  }, elation.engine.assets.base);

  elation.define('engine.assets.font', {
    assettype: 'font',
    src: false,
    _font: false,

    _construct: function(args) {
      elation.class.call(this, args);
      this.load();
    },
    load: function() {
      var loader = new THREE.FontLoader();

      if (this.src) {
        loader.load(this.src, 
                    elation.bind(this, this.handleLoad), 
                    elation.bind(this, this.handleProgress), 
                    elation.bind(this, this.handleError));
      }
    },
    handleLoad: function(data) {
      this._font = data;
    },
    getInstance: function(args) {
      if (!this._font) {
        this.load();
      }
      return this._font;
    }
  }, elation.engine.assets.base);

  elation.define('engine.assets.labelgen', {
    assettype: 'label',
    text: '',
    canvas: false,
    font: 'sans-serif',
    fontSize: 64,
    color: '#ffffff',
    outline: 'rgba(0,0,0,0.5)',
    outlineSize: 1,
    
    aspect: 1,
    _texture: false,

    _construct: function(args) {
      elation.class.call(this, args);
      this.cache = {};
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');
      this.load();
    },
    getNextPOT: function(x) {
      return Math.pow(2, Math.ceil(Math.log(x) / Math.log(2)));
    },
    load: function() {
      
    },
    getLabel: function(text) {
      if (!this.cache[text]) {
        var canvas = this.canvas,
            ctx = this.ctx;

        var fontSize = this.fontSize,
            color = this.color,
            outlineSize = this.outlineSize,
            outline = this.outline,
            font = this.font;

        ctx.font = fontSize + 'px ' + font;
        ctx.lineWidth = outlineSize + 'px ';
        ctx.strokeStyle = outline;

        var size = ctx.measureText(text);
        var w = size.width,
            h = fontSize;

        canvas.width = w;
        canvas.height = h;

        ctx.textBaseline = 'top';
        ctx.font = fontSize + 'px ' + font;
        ctx.lineWidth = outlineSize + 'px ';
        ctx.strokeStyle = outline;
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = color;

        this.aspect = size.width / fontSize;

        ctx.fillText(text, 0, 0);
        ctx.strokeText(text, 0, 0);

        var scaledcanvas = document.createElement('canvas');
        var scaledctx = scaledcanvas.getContext('2d');
        scaledcanvas.width = this.getNextPOT(w);
        scaledcanvas.height = this.getNextPOT(h);
        scaledctx.drawImage(canvas, 0, 0, scaledcanvas.width, scaledcanvas.height);

        this.cache[text] = new THREE.Texture(scaledcanvas);
        this.cache[text].needsUpdate = true;
      }
      return this.cache[text];
    },
    getAspectRatio: function(text) {
      var ctx = this.ctx, 
          font = this.font,
          fontSize = this.fontSize;
      ctx.font = fontSize + 'px ' + font;
      var size = ctx.measureText(text);
      return size.width / fontSize;
    },
    getInstance: function(args) {
      if (!this._texture) {
        this.load();
      }
      return this._texture;
    }
  }, elation.engine.assets.base);
  /*
    assetpack = [
      { name: 'grass-diffuse', 'assettype: 'image', src: '/textures/grass/diffuse.jpg' },
      { name: 'grass-normal', 'assettype: 'image', src: '/textures/grass/normal.png' },
      { name: 'grass', 'assettype: 'material', materialtype: 'phong', map: 'grass-diffuse', normalMap: 'grass-normal'},
      { name: 'house', assettype: 'model', modeltype: 'collada', src: '/models/house.dae' },
      { name: 'tree', assettype: 'model', modeltype: 'collada', src: '/models/tree.dae' }
    ]
  */
  elation.define('engine.assets.script', {
    assettype: 'script',
    src: false,
    code: false,

    _construct: function(args) {
      elation.class.call(this, args);
      //this.load();
    },
    load: function() {
      this._script = document.createElement('script');
      if (this.code) {
        setTimeout(elation.bind(this, function() {
          this.parse(this.code);
        }), 0);
      } else if (this.src) {
        var url = this.getProxiedURL(this.src);

        elation.engine.assetdownloader.fetchURL(url).then(ev => {
          let decoder = new TextDecoder('utf-8');
          this.parse(decoder.decode(ev.target.response));
        });
      }
    },
    parse: function(data) {
      //var blob = new Blob(['(function(window) {\n' + data + '\n})(self)'], {type: 'application/javascript'});
      var blob = new Blob(['\n' + data + '\n'], {type: 'application/javascript'});
      var bloburl = URL.createObjectURL(blob);
      this._script.src = bloburl;
      elation.events.fire({type: 'asset_load', element: this._script});
      elation.events.fire({type: 'asset_load', element: this});
    },
    handleProgress: function(ev) {
    },
    handleError: function(ev) {
      this._script = false;
    },
    getInstance: function(args) {
      if (!this._script) {
        this.load();
      }
      return this._script;
    }
  }, elation.engine.assets.base);

  elation.define('engine.assets.file', {
    assettype: 'file',
    src: false,
    content: false,

    load: function() {
      if (this.src) {
        var fullurl = this.getFullURL(this.src);
        if (!elation.engine.assetdownloader.isUrlInQueue(fullurl)) {
          elation.engine.assetdownloader.fetchURLs([fullurl], elation.bind(this, this.handleProgress)).then(
            elation.bind(this, function(events) {
              var xhr = events[0].target;
              var type = this.contenttype = xhr.getResponseHeader('content-type')

              this.state = 'processing';
              elation.events.fire({element: this, type: 'asset_load_processing'});
              this.content = xhr.response;
              elation.events.fire({element: this, type: 'asset_load'});
            }),
            elation.bind(this, function(error) {
              this.state = 'error';
              elation.events.fire({element: this, type: 'asset_error'});
            })
          );
          elation.events.fire({element: this, type: 'asset_load_queued'});
        }
      }
    },
    getInstance: function(args) {
      if (!this.content) {
        this.load();
      }
      return this.arrayToString(this.content);
    },
    arrayToString: function(arr) {
      var str = '';
      var bytes = new Uint8Array(arr);
      for (var i = 0; i < bytes.length; i++) {
        str += String.fromCharCode(bytes[i]);
      }
      return str;
    }
  }, elation.engine.assets.base);
});

