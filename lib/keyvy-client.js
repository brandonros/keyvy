var Promise = require('bluebird');
var net = require('net');
var ndjson = require('ndjson');
var uuid = require('uuid');
var EventEmitter = require('events');
var util = require('util');

var PORT = 1337;

var Client = function() {
  this.socket = null;
};

Client.prototype.init = function(ip, port) {
  var self = this;

  self.socket = new net.Socket();

  var jsonStream = ndjson.parse();

  self.socket.pipe(jsonStream);

  jsonStream.on('data', function(message) {
    self.handleMessage(message);
  });

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

  if (message.event) {
    this.emit(message.event, message.data);
  } else {
    this.emit('message:' + messageId, message);
  }
};

Client.prototype.sendMessage = function(message) {
  var messageId = uuid.v4();

  this.socket.write(JSON.stringify(Object.assign({}, {messageId: messageId}, message)) + '\n');

  return messageId;
};

Client.prototype.receiveResponse = function(messageId) {
  var self = this;

  return new Promise(function(resolve, reject) {
    self.once('message:' + messageId, function(message) {
      resolve(message);
    });
  });
};

util.inherits(Client, EventEmitter);

module.exports = Client;
