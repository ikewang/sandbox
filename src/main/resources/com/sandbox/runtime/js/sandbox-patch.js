(function(global) {

  JSON.stringify = function(o) {
    return nashornUtils.jsonStringify(o);
  }

  var mock = {

    //<path> <method> <headers {}> <callback>
    //<path> <headers {}> <callback>
    //<path> <method> <callback>
    //<path> <callback>
    define: function(){
      var callback;
      var path;
      var method;
      var headers;

      if(arguments.length == 4){
        path = arguments[0];
        method = arguments[1];
        headers = arguments[2];
        callback = arguments[3];

      } else if(arguments.length == 3){
        if(typeof arguments[1] == 'object'){
          path = arguments[0];
          method = 'GET'
          headers = arguments[1];
          callback = arguments[2];
        }else if(typeof arguments[1] == 'string'){
          path = arguments[0];
          method = arguments[1];
          headers = {};
          callback = arguments[2];
        }else{
          throw new Error("Invalid route definition for " + method.toUpperCase() + " " + path + ", 2nd parameter should be a String or an Object")
        }

      } else{
        path = arguments[0];
        method = 'GET';
        headers = {};
        callback = arguments[1];
      }

      if(callback == undefined){
        throw new Error("Invalid route definition for " + method.toUpperCase() + " " + path + ", given function is undefined")
      }

      __mock.define('http', 'define', path, method, headers, callback, callback, new Error())
    },
    //<path> <action> <callback>
    soap: function(){
      if(arguments.length == 3 && typeof arguments[1] == 'string'){
        __mock.define('http', 'soap', arguments[0], 'POST', {'SOAPAction':arguments[1]}, arguments[2], arguments[2], new Error())

      }else{
        throw new Error("Invalid route definition for " + method.toUpperCase() + " " + path + ", must have 3 parameters (path, action, function)")
      }

    }

  }
  global.Sandbox = mock
  global.Sandmox = mock
  global.mock = mock

  function Console(stdout, stderr) {
    if (!(this instanceof Console)) {
      return new Console(stdout, stderr);
    }

    if (!stdout || typeof stdout.write !== 'function') {
      throw new TypeError('Console expects a writable stream instance');
    }

    if (!stderr) {
      stderr = stdout;
    }
    var prop = {
      writable: true,
      enumerable: false,
      configurable: true
    };
    prop.value = stdout;
    Object.defineProperty(this, '_stdout', prop);
    prop.value = stderr;
    Object.defineProperty(this, '_stderr', prop);
    prop.value = {};
    Object.defineProperty(this, '_times', prop);

    // bind the prototype functions to this Console instance
    Object.keys(Console.prototype).forEach(function(k) {
      this[k] = this[k].bind(this);
    }, this);
  }

  Console.prototype.log = function() {
    this._stdout.write(_format.apply(this, arguments) + '\n');
  };

  Console.prototype.info = Console.prototype.log;

  Console.prototype.warn = function() {
    this._stderr.write(_format.apply(this, arguments) + '\n');
  };

  Console.prototype.error = Console.prototype.warn;

  // export console
  global.console = new Console(_console, _console)

  function _format(f) {
    var formatRegExp = /%[sdj%]/g;
    if (typeof f !== 'string') {
      var objects = [];
      for (var i = 0; i < arguments.length; i++) {
//        objects.push(inspect(arguments[i]));
          objects.push(JSON.stringify(arguments[i]));
      }
      return objects.join(' ');
    }

    var i = 1;
    var args = arguments;
    var len = args.length;
    var str = String(f).replace(formatRegExp, function(x) {
      if (x === '%%') return '%';
      if (i >= len) return x;
      switch (x) {
        case '%s': return String(args[i++]);
        case '%d': return Number(args[i++]);
        case '%j': return JSON.stringify(args[i++]);
        default:
          return x;
      }
    });
    for (var x = args[i]; i < len; x = args[++i]) {
      if (x === null || typeof x !== 'object') {
        str += ' ' + x;
      } else {
        // TODO: add support for inspecting objects
//        str += ' ' + inspect(x);
        str += JSON.stringify(x)
      }
    }
    return str;
  };

})(this)

this.global = this;

module = (typeof module == 'undefined') ? {} :  module;

(function() {

  // keep a ref to load local to the closure
  var __g_load = load;

  // then disable it for everyone else.
  load = undefined;
  loadWithNewGlobal = undefined;
  quit = undefined;
  exit = undefined;

  function Module(id, parent) {
    this.id = id;
    this.parent = parent;
    this.children = [];
    this.filename = id;
    this.loaded = false;
    var self = this;

    Object.defineProperty( this, 'exports', {
      get: function() {
        return this._exports;
      }.bind(this),
      set: function(val) {
        Require.cache[this.filename] = val;
        this._exports = val;
      }.bind(this)
    } );
    this.exports = {};

    if (self.parent && self.parent.children) {
      self.parent.children.push(self);
    }

    self.require = function(id) {
      return Require(id, self);
    };
  }

  Module._load = function(module) {
    if (module.loaded) return;
        var body   = readFile(module.filename),
            funcBody = '(function (exports, require, module, __filename, __dirname) { ' + body + '\n});'

        var func = __g_load({ script: funcBody, name: module.filename })

        func.apply(module, [module.exports, module.require, module, module.filename, module.filename]);

        module.loaded = true;
  };

  function Require(id, parent) {
    var file = Require.resolve(id, parent);

    if (!file) {
      throw new Error("Cannot find module: " + id)
    }

    if (Require.cache[file]) {
      return Require.cache[file];
    } else {
      return loadModule(file, parent);
    }
  }

  Require.resolve = function(id, parent) {
    var rootPath = findRoot(parent);
    var result = resolveAsFile(id, rootPath, '.js')
    if (result) {
      return result;
    }
    return false;
  };

  Require.root = "/";

  function findRoot(parent) {
    if (!parent || !parent.id) {
        return Require.root;
    }
    var pathParts = parent.id.split('/');
    pathParts.pop();
    return pathParts.join('/');
  }

  Require.debug = false;
  Require.cache = {};
  Require.extensions = {};
  require = Require;

  module.exports = Module;

  function loadModule(file, parent) {
    var module = new Module(file, parent);
    Module._load(module);
    return module.exports;
  }

  function resolveAsFile(id, root, ext) {

    var filePath
      , pathParts
      , canonicalFilePath

    filePath = root + '/' + id;
    pathParts = [];

    _.each(filePath.split('/'), function(part) {
        if (part.startsWith('..')) {
            if (!pathParts.length) {
                // break out, can't go back past root path
                return false;
            }
            pathParts.pop();
        } else if (!part.startsWith('.') && part.length){
            pathParts.push(part)
        }
    })

    canonicalFilePath = pathParts.join('/')
    canonicalFilePath = normalizeName(canonicalFilePath, '.js')

    if(nashornUtils.hasFile(canonicalFilePath)) {
        return canonicalFilePath;
    } else {
        return false;
    }
  }

  function normalizeName(fileName, ext) {
    var extension = ext || '.js';
    if (fileName.endsWith(extension)) {
      return fileName;
    }
    return fileName + extension;
  }

  function readFile(filename) {
    var fileContents = nashornUtils.readFile(filename)

    if (fileContents == null) {
        throw new Error("Cannot get file: " + filename);
    }
    return fileContents;
  }

  // Helper function until ECMAScript 6 is complete
  if (typeof String.prototype.endsWith !== 'function') {
    String.prototype.endsWith = function(suffix) {
      if (!suffix) return false;
      return this.indexOf(suffix, this.length - suffix.length) !== -1;
    };
  }

  if (typeof String.prototype.startsWith != 'function') {
    String.prototype.startsWith = function (str){
      return this.slice(0, str.length) == str;
    };
  }

}());