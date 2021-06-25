var EventEmitter = require('events').EventEmitter;
var Message      = require('../hl7/message');
var moment       = require('moment');
var tls          = require('tls');
var Parser       = require('../hl7/parser');
var util         = require('util');

var VT = String.fromCharCode(0x0b);
var FS = String.fromCharCode(0x1c);
var CR = String.fromCharCode(0x0d);

function TlsServer(options, handler) {
  // console.log("tls-server.TlsServer",options,"&&&&",handler);
  EventEmitter.call(this);

  if (!handler) {
    handler = options;
    options = {};
  }

  this.handler = handler;
  this.server = null;
  this.socket = null;
  this.parser = options.parser || new Parser();
}

util.inherits(TlsServer, EventEmitter);

function Req(msg, raw) {
  this.msg = msg;
  this.raw = raw; 
  this.sender = msg.header.getField(1).length == 1 ?
    msg.header.getField(1).toString() :
    msg.header.getField(1);

  this.facility = msg.header.getField(2).length == 1 ?
    msg.header.getField(2).toString() :
    msg.header.getField(2);

  this.type = msg.header.getComponent(7, 1).toString();
  this.event = msg.header.getComponent(7, 2).toString();
}

function Res(socket, ack) {
  this.ack = ack;

  this.end = function() {
    socket.write(VT + (this.ack).toString() + FS + CR);
  }
}

TlsServer.prototype.start = function(port, encoding, options) {
  var self = this;
  options = options || {}
  this.server = tls.createServer(options,function(socket) {
    var message = "";

    socket.on('data', function(data) {
      try {
        message += data.toString();
        if (message.substring(message.length - 2, message.length) == FS + CR) {
          var hl7 = self.parser.parse(message.substring(1, message.length - 2));
          var ack = self.createAckMessage(hl7);

          var req = new Req(hl7, message);
          var res = new Res(socket, ack);
          self.handler(null, req, res);
          message = "";
        }
      } catch (err) {
        self.handler(err)
      }
    }).setEncoding(encoding ? encoding : "utf-8");

    socket.on('error', function(err) {
      message = "";
      self.handler(err);
    })
  });
  this.server.listen(port);
}

TlsServer.prototype.stop = function() {
  this.server.close();
}

TlsServer.prototype.createAckMessage = function(msg) {
  var ack = new Message(
                        msg.header.getField(3),
                        msg.header.getField(4),
                        msg.header.getField(1),
                        msg.header.getField(2),
                        moment().format('YYYYMMDDHHmmss'),
                        '',
                        ["ACK"],
                        'ACK' + moment().format('YYYYMMDDHHmmss'),
                        'P',
                        '2.3')

  ack.addSegment("MSA", "AA", msg.header.getField(8))
  return ack;
}


module.exports = TlsServer;