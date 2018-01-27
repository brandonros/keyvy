var Promise = require('bluebird');
var ProgressBar = require('progress');
var uuid = require('uuid');

var Client = require('../lib/keyvy-client.js');

(async function() {
  var client = new Client();

  await client.init('127.0.0.1', 1337);

  await client.receiveResponse(client.sendMessage({action: 'subscribe', event: 'job'}));

  var jobsHandled = 0;

  client.on('job', async function() {
    var job = await client.receiveResponse(client.sendMessage({action: 'pop', key: 'job'}));

    jobsHandled += 1;

    console.log('Handled', job.value, falseTicks, jobsHandled);
  });
})();

process.on('unhandledRejection', function(err) {
  console.error(err.stack);
  process.exit(1);
});