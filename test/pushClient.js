var Promise = require('bluebird');
var ProgressBar = require('progress');
var uuid = require('uuid');

var Client = require('../lib/keyvy-client.js');

(async function() {
  var client = new Client();

  await client.init('127.0.0.1', 1337);

  console.log('Pushing');

  var bar = new ProgressBar('pushing [:bar] :rate/tps :percent :etas', { total: 100000 });

  for (var i = 0; i < 100000; ++i) {
    var message = {
      action: 'push',
      key: 'messages',
      value: {message: i}
    };

    await client.receiveResponse(client.sendMessage(message));

    bar.tick(1);
  }

  var message = {
    action: 'publish',
    event: 'message',
    value: 'go'
  };

  await client.receiveResponse(client.sendMessage(message));
})();

process.on('unhandledRejection', function(err) {
  console.error(err.stack);
  process.exit(1);
});