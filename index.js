/**
 * config-loader ~ public api
 */
 
module.exports = require('./lib/config-loader');
require('assert')(
  require('strong-task-emitter').developFeature
);
