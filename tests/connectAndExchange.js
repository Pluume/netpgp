var netpgp = require("../test.js");
const net = require("net");
var server = new netpgp.serverpgp(4444, "127.0.0.1");
server.init();
var sock = new netpgp.socketpgp(4444,"127.0.0.1");
server.on("data",(sock,data) =>
{
  console.log("TEST = " + data);
  sock.writesec("Bonsoir");
});
sock.on("connect", () =>
{
  sock.writesec("test" + "\0");
});
