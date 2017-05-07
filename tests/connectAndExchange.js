var netpgp = require("../Main.js");
const net = require("net");
var server = new netpgp(4444, "127.0.0.1");
server.init();
var sock = new net.Socket();
sock.connect({
  port: 4444,
  host: "127.0.0.1"
});
sock.write("test" + "\0");
sock.end();
