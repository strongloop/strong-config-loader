/**
 * Expose `ConfigLoader`.
 */

module.exports = ConfigLoader;

/**
 * Module dependencies.
 */
 
var TaskEmitter = require('task-emitter')
  , debug = require('debug')('config-loader')
  , util = require('util')
  , inherits = util.inherits
  , fs = require('fs')
  , path = require('path')
  , assert = require('assert');
  
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
  if(this.ttl() > 0) {
    fn(null, this._files);
  } else {
    this.reset();
    this.task(fs, 'readdir', this.root);
    this.on('done', function () {
      fn(null, this._files);
    });
    this.on('error', fn);
  }
}

/**
 * Determine the cache's time to live.
 */

ConfigLoader.prototype.ttl = function () {
  return Date.now() - this.lastLoaded - this.options.ttl;
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
  // is it a config file?
  if(path.basename(file) !== this.options.filename) {
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
}