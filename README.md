# strong-config-loader

## Install

    slnode install strong-config-loader
    
## Example

Given a nested structure of directories and config files:

    /my-project
      config.json
      /my-resource
        config.json
        /my-sub-resource
          config.json

The `strong-config-loader` recursively loads and caches all `config.json` files.

    var ConfigLoader = require('../');

    var options = {
      'filename': 'config.json', // default config.json
      'envFile': 'config.env.json', // default config.env.json
      'envVar': 'NODE_ENV', // default NODE_ENV
      'ignore': ['images', '.git', /\^.*+/], // default null
      'ttl': 3600 // in seconds, default 3600
    };

    var configLoader = ConfigLoader.create('path/to/project/root', options);

    configLoader.load(function (err, config, cache) {
      Object.keys(config).forEach(function (path) {
        // config.json at the given path
        console.log(config[path]);
      });
    });

    
## Usage

Load config files recursively and return them in a dictionary. Each config is keyed by the path of its parent directory.

## Env File

Overrides the config based on the current `NODE_ENV`.

## Runtime Consistency

It is safe/performant to call `ConfigLoader.load` during http requests and other latency sensitive operations.

The `strong-config-loader` is designed to load configuration that changes at runtime. To support this, the loader caches results for a specified `ttl` (time to live) and returns that result even if a config file has changed. Once the `ttl` runs out for a given config root, the loader checks the files last modified time (`mtime`) and compares it to the cache's last modified time. If the file has changed the new file is loaded from disk. The purpose of this complex checking is to support config loading in latency sensitive operations (eg. handling an http request).
