module.exports.Component = require('./hl7/component')
module.exports.Field     = require('./hl7/field');
module.exports.Header    = require('./hl7/header');
module.exports.Message   = require('./hl7/message');
module.exports.Parser    = require('./hl7/parser.js');
module.exports.Segment   = require('./hl7/segment');

var FileClient = require('./client/file-client.js');
var FileServer = require('./server/file-server.js');
var TcpServer  = require('./server/tcp-server.js');
var TcpClient  = require('./client/tcp-client.js');
var TlsServer  = require('./server/tls-server.js');
var TlsClient  = require('./client/tls-client.js');


module.exports.Server = {
  createTcpServer: function(options, handler) { return new TcpServer(options, handler); },
  createTcpClient: function() {
    if (arguments.length == 2) {
      return new TcpClient(arguments[0], arguments[1]);
    } else {
      return new TcpClient(arguments[0]); 
    }
  },
  createFileServer: function(options, handler) { return new FileServer(options, handler); },
  createFileClient: function(dest) { return new FileClient(dest); },
  createTlsServer: function(options, handler) { 
    //console.log("index.server",options,"&&&&", handler);
    return new TlsServer(options, handler); 
  },
  createTlsClient: function() {
    if (arguments.length == 7) {
      return new TlsClient(
         arguments[0],
         arguments[1],
         arguments[2],
         arguments[3],
         arguments[4],
         arguments[5],
         arguments[6]
         );
    } else {
      return new TlsClient(arguments[0]); 
    }
  }
}

module.exports.tcp = require('./connect/tcp');
module.exports.file = require('./connect/file');
module.exports.tls = require('./connect/tls');