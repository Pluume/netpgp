const keypair = require("node-pgp");
const openpgp = require("openpgp");
const net = require("net");
const randomstring = require("randomstring");
var events = require('events');
var methodServer = serverpgp.prototype;
var methodSocket = sockpgp.prototype;

//COMMON begin


function dataCompiler(currentBuf, data) {
  currentBuf += data;

  if (currentBuf[currentBuf.length - 1] == "\0") {
    return {
      state: true,
      data: currentBuf
    };
  } else {
    return {
      state: false,
      data: currentBuf
    };
  }
  //TODO Verify overflow
  //TODO Check if first time exchanging data, if yes then send pubkey
}

//COMMON end

//SERVER begin



function serverpgp(port, address) {
  this._port = port;
  this._address = address;
  this._clients = [];
  this.eventEmitter = new events.EventEmitter();
}

methodServer.on = function(chan, cb) {
  this.eventEmitter.on(chan, cb);
};

methodServer.init = function() {
  try {
    var closeConnection = (conn) => {
      console.log("SERVER: Closed");
      this._clients.splice(this._clients.indexOf(conn), 1);
    };
    var newConnection = (socket) => {
      socket.writesec = (data) => {
        if (!socket._init)
          return false;
        else {
          var options = {
            data: data,
            publicKeys: socket._rpubkey,
            privateKeys: socket._privkey
          };
          openpgp.encrypt(options).then(function(ciphertext) {
            console.log("SERVER ENC : " + JSON.stringify(ciphertext));
            socket.write(ciphertext.data + "\0");
          });
          return true;
        }
      };
      socket.on("error", () => {});
      socket.on("data", (data) => {
        var res = dataCompiler(socket.currentBuf, data);

        if (res.state) {
          socket.currentBuf = "";
          console.log("SERVER : " + res.data);
          if (!socket._init) {
            socket._rpubkey = openpgp.key.readArmored(res.data).keys;
            socket._init = true;
            console.log("SERVER OK");
            socket._password = randomstring.generate();
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
              numBits: 512,
              passphrase: socket._password
            };


            openpgp.generateKey(options).then((key) => {
              var priv = openpgp.key.readArmored(key.privateKeyArmored).keys[0];
              priv.decrypt(socket._password);
              socket._privkey = priv;
              socket._pubkey = openpgp.key.readArmored(key.publicKeyArmored).keys;
              socket.write(key.publicKeyArmored + "\0");
            });
          } else {
            var optionsDec = {
              message: openpgp.message.readArmored(res.data), // parse armored message
              publicKeys: socket._rpubkey, // da3 verification (optional)
              privateKey: socket._privkey // for decryption
            };
            openpgp.decrypt(optionsDec).then((plaintext) => {
              console.log("SERVER DEC : " + plaintext.data);
              this.eventEmitter.emit("data", socket,plaintext.data);
            });
          }

        }
      });
      socket.on("close", closeConnection);
      console.log("SERVER : New connections");
      socket._init = false;
      socket.currentBuf = "";
    };

    this._server = net.createServer(function(socket) {}).listen(this._port);
    this._server.on("connection", newConnection);
  } catch (err) {
    return err;
  }
  return 0;
};

//SERVER end

//CLIENT begin


function sockpgp(port, address) {
  this._port = port;
  this._address = address;
  this.currentBuf = "";
  this.socket = new net.Socket();
  this.socket._init = false;
  this.eventEmitter = new events.EventEmitter();
  this.socket.eventEmitter = this.eventEmitter;
  var close = (hade) => {
    this.eventEmitter.emit("close", hade);
  };
  var connect = () => {
    console.log("SOCKET: connected");
    this.socket._password = randomstring.generate();
    this.socket.currentBuf = "";
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
      numBits: 512,
      passphrase: this.socket._password
    };
    openpgp.generateKey(options).then((key) => {
      console.log("SOCKET: Key generated");
      var priv = openpgp.key.readArmored(key.privateKeyArmored).keys[0];
      priv.decrypt(this.socket._password);
      this.socket._privkey = priv;
      this.socket._pubkey = openpgp.key.readArmored(key.publicKeyArmored).keys;
      this.socket.write(key.publicKeyArmored + "\0");
    });
  };
  var data = (data) => {
    var res = dataCompiler(this.socket.currentBuf, data);
    if (res.state) {
      console.log("SOCKET : " + res.data);
      if (!this.socket._init) {
        this.socket._rpubkey = openpgp.key.readArmored(res.data).keys;
        this.socket._init = true;
        console.log("SOCKET : OK");
        this.eventEmitter.emit("connect");
      } else {
        options = {
          message: openpgp.message.readArmored(res.data), // parse armored message
          publicKeys: this.socket._rpubkey, // da verification (optional)
          privateKey: this.socket._privkey // for decryption
        };
        openpgp.decrypt(options).then(function(plaintext) {
          console.log("SOCKET DEC : " + plaintext.data);
          this.eventEmitter.emit("data", plaintext.data);
        });


      }
    }



  };
  var drain = () => {
    this.eventEmitter.emit("drain");
  };
  var end = () => {
    this.eventEmitter.emit("end");
  };
  var error = (err) => {
    this.eventEmitter.emit("error", err);
  };
  var lookup = (arg) => {
    this.eventEmitter.emit("lookup", arg);
  };
  var timeout = () => {
    this.eventEmitter.emit("timeout");
  };
  this.socket.on("close", close);
  this.socket.on("connect", connect);
  this.socket.on("data", data);
  this.socket.on("drain", drain);
  this.socket.on("end", end);
  this.socket.on("error", error);
  this.socket.on("lookup", lookup);
  this.socket.on("timeout", timeout);
  this.socket.connect({
    port: port,
    host: address
  });
}
methodSocket.on = function(chan, cb) {
  this.eventEmitter.on(chan, cb);
};
methodSocket.writesec = function(data) {
  if (!this.socket._init)
    return false;
  else {
    var options = {
      data: data,
      publicKeys: this.socket._rpubkey,
      privateKeys: this.socket._privkey
    };
    openpgp.encrypt(options).then((ciphertext) => {
      console.log("SOCKET ENC : " + ciphertext.data);
      this.socket.write(ciphertext.data + "\0");
    });
    return true;
  }
};
//CLIENT end

module.exports = {
  serverpgp: serverpgp,
  socketpgp: sockpgp
};
