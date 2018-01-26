var Promise = require('bluebird');
var net = require('net');
var ReadWriteLock = require('rwlock');
var ndjson = require('ndjson');
var uuid = require('uuid');

var Server = function() {
  this.clients = {};
  this.events = {};
  this.clientEvents = {};

  this.db = {};

  this.locks = {
    clients: new ReadWriteLock(),
    events: new ReadWriteLock(),
    clientEvents: new ReadWriteLock(),
    db: new ReadWriteLock()
  };

  this.socket = null;
};

Server.prototype.init = function(port) {
  var self = this;

  self.socket = net.createServer(function(client) {
    self.handleClient(client);
  });

  self.socket.listen(port, '127.0.0.1', function() {
    console.info('Listening on port', port);
  });
};

Server.prototype.handleClient = async function(client) {
  var self = this;

  var clientKey = `${client.remoteAddress}:${client.remotePort}`;

  await self.lockedWrite('clients', function() {
    self.clients[clientKey] = client;
  });

  await self.lockedWrite('clientEvents', function() {
    self.clientEvents[clientKey] = [];
  });

  console.info('New client', clientKey);

  var jsonStream = ndjson.parse();

  client.pipe(jsonStream);

  jsonStream.on('data', async function(message) {
    try {
      var result = await self.handleMessage(clientKey, message);

      //console.info('Result', result);

      self.sendMessage(client, Object.assign({}, {messageId: message.messageId}, result));
    } catch (err) {
      console.error(err);

      self.sendMessage(client, {messageId: message.messageId, error: err.message});
    }
  });

  client.on('close', async function() {
    var clientEvents = await self.lockedRead('clientEvents', function() {
      return self.clientEvents[clientKey];
    });

    await self.lockedWrite('events', async function() {
      await Promise.each(clientEvents, async function(clientEvent) {
        delete self.events[clientEvent][clientKey];
      });
    });

    await self.lockedWrite('clientEvents', function() {
      delete self.clientEvents[clientKey];
    });

    console.info('Client closed', clientKey);
  });
};

Server.prototype.sendMessage = function(client, message) {
  client.write(JSON.stringify(message) + '\n');
};

Server.prototype.lockedRead = function(key, cb) {
  var self = this;

  return new Promise(function(resolve, reject) {
    self.locks[key].readLock(function(release) {
      resolve(cb());

      release();
    });
  });
};

Server.prototype.lockedWrite = function(key, cb) {
  var self = this;

  return new Promise(function(resolve, reject) {
    self.locks[key].writeLock(function(release) {
      resolve(cb());

      release();
    });
  });
};

Server.prototype.handleMessage = async function(clientKey, message) {
  var self = this;

  //console.info('Incoming message', clientKey, message);

  if (message.action === 'get') {
    return self.lockedRead('db', function() {
      return {value: self.db[message.key]};
    });
  } else if (message.action === 'set') {
    await self.lockedWrite('db', function() {
      self.db[message.key] = message.value;
    });

    return {
      success: true
    };
  } else if (message.action === 'push') {
    await self.lockedWrite('db', function() {
      if (self.db[message.key] && !Array.isArray(self.db[message.key])) {
        throw new Error('Invalid key type');
      }

      if (!self.db[message.key]) {
        self.db[message.key] = [];
      }

      self.db[message.key].push(message.value);
    });

    return {
      success: true
    };
  } else if (message.action === 'pop') {
    return self.lockedWrite('db', function() {
      if (self.db[message.key] && !Array.isArray(self.db[message.key])) {
        throw new Error('Invalid key type');
      }

      var value = self.db[message.key].pop();

      if (value === undefined) {
        value = null;
      }

      return {value: value};
    });
  } else if (message.action === 'delete') {
    await self.lockedWrite('db', function() {
      delete self.db[message.key];
    });

    return {
      success: true
    };
  } else if (message.action === 'length') {
    return self.lockedRead('db', function() {
      if (!Array.isArray(self.db[message.key])) {
        throw new Error('Invalid key type');
      }

      return {length: self.db[message.key].length};
    });
  } else if (message.action === 'subscribe') {
    await self.lockedWrite('events', function() {
      if (!self.events[message.event]) {
        self.events[message.event] = {};
      }

      self.events[message.event][clientKey] = true;
    });

    return {
      success: true
    };
  } else if (message.action === 'unsubscribe') {
    await self.lockedWrite('events', function() {
      if (!self.events[message.event]) {
        throw new Error('Invalid event');
      }

      delete self.events[message.event][clientKey];
    });

    return {
      success: true
    };
  } else if (message.action === 'publish') {
    await self.lockedRead('events', async function() {
      if (!self.events[message.event]) {
        throw new Error('Invalid event');
      }

      var eventSubscribers = Object.keys(self.events[message.event]);

      await Promise.each(eventSubscribers, async function(subscriberKey) {
        await self.lockedRead('clients', function() {
          self.sendMessage(self.clients[subscriberKey], {messageId: uuid.v4(), event: message.event, data: message.data});
        });
      });
    });

    return {
      success: true
    };
  }
};

module.exports = Server;
