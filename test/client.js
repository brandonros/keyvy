var Promise = require('bluebird');

var Client = require('../lib/keyvy-client.js');

(async function() {
  var messages = [
    {
      action: 'get',
      key: 'sequence'
    },
    {
      action: 'set',
      key: 'sequence',
      value: 1
    },
    {
      action: 'get',
      key: 'sequence'
    },
    {
      action: 'push',
      key: 'messages',
      value: {message: 1}
    },
    {
      action: 'push',
      key: 'messages',
      value: {message: 2}
    },
    {
      action: 'push',
      key: 'messages',
      value: {message: 3}
    },
    {
      action: 'length',
      key: 'sequence'
    },
    {
      action: 'pop',
      key: 'messages'
    },
    {
      action: 'pop',
      key: 'messages'
    },
    {
      action: 'pop',
      key: 'messages'
    },
    {
      action: 'pop',
      key: 'messages'
    },
    {
      action: 'subscribe',
      event: 'specialEvent'
    },
    {
      action: 'publish',
      event: 'specialEvent',
      data: {
        value: 3
      }
    }
  ];

  var client = new Client();

  await client.init('127.0.0.1', 1337);

  client.on('specialEvent', function(data) {
    console.log('specialEvent', data);
  });

  await Promise.each(messages, async function(message) {
    console.log(await client.receiveResponse(client.sendMessage(message)));
  })
})();

process.on('unhandledRejection', function(err) {
  console.error(err.stack);
  process.exit(1);
});