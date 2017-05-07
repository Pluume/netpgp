const keypair = require("node-pgp");
const openpgp = require("openpgp");
const net = require("net");
const randomstring = require("randomstring");
var method = netpgp.prototype;

function netpgp(port, address) {
  this._port = port;
  this._address = address;
  this._clients = [];

}

function dataCompiler(connection, data) {
  connection.currentBuf += data;
  if (connection.currentBuf[connection.currentBuf.length - 1] == "\0") {
    console.log(connection.currentBuf);
    if (connection._init)
      decode(connection, connection.currentBuf.substring(0, connection.currentBuf.length - 1).toString("utf8"));
    else {
      connection._rpubkey = connection.currentBuf.substring(0, connection.currentBuf.length - 1).toString("utf8");
      connection._init = true;
    }
    connection.currentBuf = "";
  }
  //TODO Verify overflow
  //TODO Check if first time exchanging data, if yes then send pubkey
}

method.init = function() {
  try {
    var closeConnection = (conn) => {
      this._clients.splice(this._clients.indexOf(conn), 1);
    };
    var newConnection = (socket) => {
      var conn = {
        socket: socket
      };
      conn._init = false;
      conn._password = randomstring.generate();
      conn.currentBuf = "";
      var options = {
        userIds: [{
          name: randomstring.generate(),
          email: randomstring.generate()
        }],
        numBits: 1024,
        passphrase: conn._password
      };
      openpgp.generateKey(options).then(function(key) {
        conn._privk = key.privateKeyArmored; // '-----BEGIN PGP PRIVATE KEY BLOCK ... '
        conn._pubkey = key.publicKeyArmored; // '-----BEGIN PGP PUBLIC KEY BLOCK ... '
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

    this._server = net.createServer(function(socket) {
      socket.on("connection", newConnection);
      socket.on("error", errorHandler);
      socket.on("data", dataCompiler);
      socket.on("close", closeConnection);
    }).listen(this._port);

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
module.exports = netpgp;
