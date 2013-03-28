var ConfigLoader = require('../');

describe('ConfigLoader', function(){
  var configLoader;
  
  beforeEach(function(){
    configLoader = new ConfigLoader();
  });
  
  describe('.load', function(){
    it('should load a nested set of config.json files', function(done) {
      configLoader.load('example', function (err, config) {
        assert(config);
      });
    });
  });
});