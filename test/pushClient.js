var Promise = require('bluebird');
var ProgressBar = require('progress');
var uuid = require('uuid');

var cluster = require('cluster');

var Client = require('../lib/keyvy-client.js');

if (cluster.isMaster) {
  for (var i = 0; i < 4; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
  });
} else {
  (async function() {
    var client = new Client();

    await client.init('127.0.0.1', 1337);

    console.log('Pushing');

    for (var i = 0; i < 100000; ++i) {
      var message = {
        action: 'push',
        key: 'messages',
        value: {message: i}
      };

      client.sendMessage(message);
    }
  })();
}

process.on('unhandledRejection', function(err) {
  console.error(err.stack);
  process.exit(1);
});