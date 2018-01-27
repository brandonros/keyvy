var Promise = require('bluebird');
var ProgressBar = require('progress');
var uuid = require('uuid');

var Client = require('../lib/keyvy-client.js');

(async function() {
  var client = new Client();

  await client.init('127.0.0.1', 1337);

  for (var i = 0; i < 10000; ++i) {
    await client.receiveResponse(client.sendMessage({action: 'push', key: 'job', value: {hello: 'world', i: i}}));
  }

  for (var i = 0; i < 10000; ++i) {
    await client.receiveResponse(client.sendMessage({action: 'dispatch', event: 'job'}));
  }
})();

process.on('unhandledRejection', function(err) {
  console.error(err.stack);
  process.exit(1);
});