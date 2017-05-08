const keypair = require("node-pgp");
const openpgp = require("openpgp");
const net = require("net");
const randomstring = require("randomstring");
var events = require('events');
var methodServer = serverpgp.prototype;
var methodSocket = sockpgp.prototype;

function serverpgp(port, address) {
  this._port = port;
  this._address = address;
  this._clients = [];
  this.eventEmitter = new events.EventEmitter();
}

function sockpgp(port, address) {
  this._port = port;
  this._address = address;
  this.currentBuf = "";
  this._init = false;
}

function dataCompiler(data) {
  console.log("Data : " + data);
  this.currentBuf += data;

  if (this.currentBuf[this.currentBuf.length - 1] == "\0") {
    console.log("Data full : " + this.currentBuf);
    if (this._init)
      decode(this, this.currentBuf.substring(0, this.currentBuf.length - 1).toString("utf8"));
    else {
      this._rpubkey = this.currentBuf.substring(0, this.currentBuf.length - 1).toString("utf8");
      this._init = true;
    }
    this.currentBuf = "";
  }
  //TODO Verify overflow
  //TODO Check if first time exchanging data, if yes then send pubkey
}
methodServer.on = function(chan, cb) {
  this.eventEmitter.on(chan, db);
};
methodServer.init = function() {
  try {
    var closeConnection = (conn) => {
      console.log("Closed");
      this._clients.splice(this._clients.indexOf(conn), 1);
    };
    var newConnection = (socket) => {
      socket.on("error", errorHandler);
      socket.on("data", dataCompiler);
      socket.on("close", closeConnection);
      var conn = {
        socket: socket
      };
      console.log("New connections");
      conn.socket._init = false;
      conn.socket._password = randomstring.generate();
      conn.socket.currentBuf = "";
      var options = {
        userIds: [{
          name: randomstring.generate(),
          email: randomstring.generate({
            length: 5,
            charset: 'alphabetic'
          }) + "@" + randomstring.generate({
            length: 5,
            charset: 'alphabetic'
          }) + ".com"
        }],
        numBits: 1024,
        passphrase: conn.socket._password
      };
      openpgp.generateKey(options).then(function(key) {
        conn._privk = key.privateKeyArmored;
        conn._pubkey = key.publicKeyArmored;
        this._clients.push(conn);
        conn.socket.write(conn._pubkey + "\0");
      });
    };
    var createKeyPair = (id, size, password, cb) => {
      this._password = password;
      var options = {
        userIds: id,
        numBits: size,
        passphrase: password
      };
      openpgp.generateKey(options).then(function(key) {
        var privkey = key.privateKeyArmored;
        var pubkey = key.publicKeyArmored;
        cb({
          priv: privkey,
          pub: pubkey
        });
      });
    };

    this._server = net.createServer(function(socket) {}).listen(this._port);
    this._server.on("connection", newConnection);
  } catch (err) {
    return err;
  }
  return 0;
}

function generateServerPair() {
  //TODO Gen new keypair and return
}

function encode() {
  //TODO Encrypt using Main keypair
  //TODO Encrypt using the PFS keypair
}

function decode() {
  //TODO Decrypt using the PFS keypair
  //TODO Decrypt using the main keypair
}



function errorHandler() {

}
module.exports = {
  server: serverpgp
};
