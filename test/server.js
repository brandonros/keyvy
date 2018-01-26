var Promise = require('bluebird');

var Server = require('../lib/keyvy-server.js');

(async function() {
  var server = new Server();

  server.init(1337);
})();

process.on('unhandledRejection', function(err) {
  console.error(err.stack);
  process.exit(1);
});