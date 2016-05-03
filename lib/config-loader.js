// Copyright IBM Corp. 2013. All Rights Reserved.
// Node module: strong-config-loader
// This file is licensed under the Artistic License 2.0.
// License text available at https://opensource.org/licenses/Artistic-2.0

/**
 * Expose `ConfigLoader`.
 */

module.exports = ConfigLoader;

/**
 * Module dependencies.
 */
 
var TaskEmitter = require('strong-task-emitter')
  , debug = require('debug')('strong-config-loader')
  , util = require('util')
  , inherits = util.inherits
  , fs = require('fs')
  , path = require('path')
  , assert = require('assert')
  , merge = require('deepmerge');
  
/**
 * Create a new `ConfigLoader` with the given `options`.
 *
 * @param {Object} options
 * @return {ConfigLoader}
 */

function ConfigLoader(options) {
  var te = this;
  
  TaskEmitter.call(this);
  
  // throw an error if args are not supplied
  assert(typeof options === 'object', 'ConfigLoader requires an options object');
  
  this.options = options;
  this.root = options.root;
  
  options.envVar = options.envVar || 'NODE_ENV';
  options.envFile = options.envFile || 'config.env.json';
  options.filename = options.filename || 'config.json';
  options.ttl = options.ttl || 3600;
  options.ignore = options.ignore || ['node_modules'];

  
  debug('created with options', options);
}

/**
 * Inherit from `EventEmitter`.
 */

inherits(ConfigLoader, TaskEmitter);

/**
 * Simplified APIs
 */

ConfigLoader.create =
ConfigLoader.createConfigLoader = function (root, options) {
  root = root || '.';
  options = options || {};
  options.root = root;
  return new ConfigLoader(options);
}

/**
 * Load configuration files recursively starting at `root`.
 *
 * @param {String} root
 * @param {Function} fn
 */
 
ConfigLoader.prototype.load = function (fn) {
  if(this.remaining()) {
    // wait until the current operation is finished
    this.once('done', function () {
      fn(null, this._files);
    });
    // callback with an error if it occurs
    this.once('error', fn);
  } else if(this.ttl() > 0) {
    fn(null, this._files);
  } else {
    // the cache has expired
    this.reset();
    
    this.once('error', fn);
  
    this.bindListeners();
    
    this.task(fs, 'readdir', this.root);
    this.once('done', function () {
      this._mergeEnvConfigs();
      fn(null, this._files);
    });
  } 
}

ConfigLoader.prototype.bindListeners = function () {
  this.on('readdir', function (dir, files) {
    files.forEach(function (f) {
      this.task(fs, 'stat', path.join(dir, f));
    }.bind(this));
  });

  this.on('stat', function (file, stat) {
    if (stat.isDirectory() && this._shouldReadDir(file)) {
      this.task(fs, 'readdir', file);
    } else {
      if(this._shouldRead(file, stat)) {
        this.task(fs, 'readFile', file);
      }
    }
  });

  this.on('readFile', function (file, data) {
    data = data.toString();

    try {
      data = JSON.parse(data);
    } catch(e) {
      return this.emit('error', e);
    }

    this._cache(file, data);
  });
}

ConfigLoader.prototype._mergeEnvConfigs = function () {
  Object.keys(this._files).forEach(function (k) {
    if(path.basename(k) === this.options.envFile) {
      var configFile = k.replace(this.options.envFile, this.options.filename);
      var allEnvConfig = this._files[k];
      var wildCardConfig = allEnvConfig['*'] || {};
      var config = merge(this._files[configFile], wildCardConfig);
      var envConfig = allEnvConfig[process.env[this.options.envVar]] || {};
      
      this._files[configFile] = merge(config, envConfig);
      
      delete this._files[k];
    }
  }.bind(this));
}

/**
 * Determine the cache's time to live.
 */

ConfigLoader.prototype.ttl = function () {
  if(!this.lastLoaded) return 0;

  return this.options.ttl - (Date.now() - this.lastLoaded);
}

/**
 * Reset the cache.
 */

ConfigLoader.prototype.reset = function () {
  delete this._files;
  this._files = {};
  this.lastLoaded = new Date();
  TaskEmitter.prototype.reset.call(this);
}

/*!
 * Determine if a file should be read.
 *
 * @param {String} file
 * @param {Stat} stat
 */

ConfigLoader.prototype._shouldRead = function (file, stat) {
  var filename = path.basename(file);
  
  // is it a config file?
  if(!(filename === this.options.filename || filename === this.options.envFile)) {
    return false;
  }
  
  // otherwise we should read
  return true;
}

/*!
 * Determine if a dir should be read.
 *
 * @param {String} file
 * @param {Stat} stat
 */

ConfigLoader.prototype._shouldReadDir = function (dir) {
  var ignore = this.options.ignore;
  var dirname = path.basename(dir);
  var isHidden = dirname[0] === '.';
  
  if(ignore && ~ignore.indexOf(dirname)) {
    return false;
  }
  
  if(isHidden) {
    return this.options.allowHidden;
  }
  
  return true;
}

/*!
 * Cache a configuration.
 *
 * @param {String} file
 * @param {Stat} stat
 * @data {Object} stat
 */

ConfigLoader.prototype._cache = function (file, data) {
  this._files[file] = data;
  this.lastLoaded = new Date();
}

function merge(target, src) {
  var array = Array.isArray(src)
  var dst = array && [] || {}

  if (array) {
      target = target || []
      dst = dst.concat(target)
      src.forEach(function(e, i) {
          if (typeof e === 'object') {
              dst[i] = merge(target[i], e)
          } else {
              if (target.indexOf(e) === -1) {
                  dst.push(e)
              }
          }
      })
  } else {
      if (target && typeof target === 'object') {
          Object.keys(target).forEach(function (key) {
              dst[key] = target[key]
          })
      }
      Object.keys(src).forEach(function (key) {
          if (typeof src[key] !== 'object' || !src[key]) {
              dst[key] = src[key]
          }
          else {
              if (!target[key]) {
                  dst[key] = src[key]
              } else {
                  dst[key] = merge(target[key], src[key])
              }
          }
      })
  }

  return dst
}
