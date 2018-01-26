var Promise = require('bluebird');
var net = require('net');
var carrier = require('carrier');
var uuid = require('uuid');
var EventEmitter = require('events');
var util = require('util');

var PORT = 1337;

var Client = function() {
  this.socket = null;

  this.outstandingMessages = {};
};

Client.prototype.init = function(ip, port) {
  var self = this;

  self.socket = new net.Socket();

  carrier.carry(self.socket, async function(message) {
    await self.handleMessage(JSON.parse(message));
  }, 'utf8', '\0');

  self.socket.on('close', function() {
    console.info('Connection closed');

    process.exit(1);
  });

  return new Promise(function(resolve, reject) {
    self.socket.connect(port, ip, function() {
      console.info('Connected');

      resolve();
    });
  });
};

Client.prototype.handleMessage = function(message) {
  var messageId = message.messageId;

  if (this.outstandingMessages[messageId] !== undefined) {
    this.outstandingMessages[messageId] = message;
  } else {
    this.emit(message.event, message.data);
  }
};

Client.prototype.sendMessage = function(message) {
  var messageId = uuid.v4();

  this.outstandingMessages[messageId] = null;

  this.socket.write(JSON.stringify(Object.assign({}, {messageId: messageId}, message)) + '\0');

  return messageId;
};

Client.prototype.receiveResponse = function(messageId) {
  var self = this;

  return new Promise(function(resolve, reject) {
    var interval = setInterval(function() {
      if (self.outstandingMessages[messageId]) {
        clearInterval(interval);

        var result = self.outstandingMessages[messageId];

        delete self.outstandingMessages[messageId];

        resolve(result);
      }
    }, 16);
  });
};

util.inherits(Client, EventEmitter);

module.exports = Client;
