/**
 * A generated `ConfigLoader` example...
 *
 * Examples should show a working module api
 * and be used in tests to continously check
 * they function as expected.
 */
 
var ConfigLoader = require('../');

var options = {
  'filename': 'config.json', // default config.json
  'ignore': ['ignore'], // default null
  'allowHidden': false, // default false
  'ttl': 3600 // in seconds, default 3600
};

var configLoader = ConfigLoader.create('.', options);

configLoader.load(function (err, config, cache) {
  console.log(JSON.stringify(config, true, '  '));
});
