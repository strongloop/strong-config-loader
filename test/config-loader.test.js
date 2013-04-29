var ConfigLoader = require('../');
var path = require('path');

describe('ConfigLoader', function(){
  var configLoader;
  
  beforeEach(function(){
    var options = {
      'root': path.join('test', 'support', 'sample'),
      'filename': 'config.json', // default config.json
      'ignore': ['ignore'], // default null
      'allowHidden': false, // default false
      'ttl': 3600 // in seconds, default 3600
    };   
    configLoader = new ConfigLoader(options);
  });
  
  describe('.load', function(){
    it('should load a nested set of config.json files', function(done) {
      
      // manually set dev env
      process.env.NODE_ENV = 'dev';
      
      configLoader.load(function (err, config) {
        assert(config);
        
        var files = Object.keys(config);
        assert.equal(files.length, 2);
        
        files.forEach(function (f) {
          var c = config[f];
          
          switch(c.level) {
            case 1:
              // all options should be dev in the dev env
              // see `support/sample/config.env.json`
              assert.equal(c.options.hello, 'dev');
              assert.equal(c.options.foo.bar.dev, 'dev');
            break;
            case 2:
              assert.equal(c.foo, 'bar');
            break;
            default:
              throw new Error('there should only be a level 1 and 2');
            break;
          }
        });
        
        done();
      });
    });
  });
});