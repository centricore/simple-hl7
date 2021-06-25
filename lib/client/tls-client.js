var Parser = require('../hl7/parser.js');
var tls = require('tls');
var VT = String.fromCharCode(0x0b);
var FS = String.fromCharCode(0x1c);
var CR = String.fromCharCode(0x0d);

function TlsClient() {
  this.options = {}
  if (arguments.length == 2) {
    this.options.host = arguments[0];
    this.options.port = arguments[1];
    this.options.ca = arguments[2];
    this.options.key = arguments[3];
    this.options.cert = arguments[4];
    this.options.rejectUnauthorized = arguments[5];
    this.options.requestCert = arguments[6];
  }
  if (arguments.length == 1) {
    this.options = arguments[0];
  }
  this.host = this.options.host;
  this.port = this.options.port;
  this.callback = this.options.callback;
  this.keepalive = this.options.keepalive;
  this.responseBuffer = "";
  this.awaitingResponse = false;
  this.parser = new Parser({ segmentSeperator: '\r' });
  this.ca=this.options.ca;
  this.key=this.options.key;
  this.cert=this.options.cert;
  this.rejectUnauthorized=this.options.rejectUnauthorized;
  this.requestCert=this.options.requestCert;
}

TlsClient.prototype.connect = function(callback) {
  var self = this;
  self.client = tls.connect({
    host: self.host, 
    port: self.port,
    ca: self.ca,
    key:self.key,
    cert: self.cert,
    rejectUnauthorized: self.rejectUnauthorized,
    requestCert: self.requestCert
}, function() {
    self.client.on('data', function(data) {
      self.responseBuffer += data.toString();
      if (self.responseBuffer.substring(self.responseBuffer.length - 2, self.responseBuffer.length) == FS + CR) {
        var ack = self.parser.parse(self.responseBuffer.substring(1, self.responseBuffer.length - 2));
        self.callback(null, ack);
        self.responseBuffer = "";
        self.awaitingResponse = false;
        if (!self.keepalive) {
          self.close();
        }
      }
    });
    callback();
  });
  self.client.on('error', function(err) {
    callback(err);
  })
}

TlsClient.prototype.send = function(msg, callback) {
  var self = this;
  self.callback = callback || self.callback;
  if (self.awaitingResponse) {
    self.callback(new Error("Can't send while awaiting response"));
  }
  self.awaitingResponse = true;
  try {
    if (self.client) {
      self.client.write(VT + msg.toString() + FS + CR);
    } else {
      self.connect(function(err) {
        if (err) return self.callback(err);
        self.awaitingResponse = true;
        self.client.write(VT + msg.toString() + FS + CR);
      });
    }
  } catch (e) {
    self.callback(e);
  }
}

TlsClient.prototype.close = function() {
  var self = this;
  if (self.client) {
    self.responseBuffer = "";
    self.awaitingResponse = false;
    self.client.end();
    self.client.destroy();
    delete self.client;
  }
}

TlsClient.prototype.sendWithPromise = function(msg) {
  var self = this;
  return new Promise((resolve,reject)=>{
    //self.callback = callback || self.callback;
    self.callback = (err,ack)=>{
        if(err){
          reject(err);
        }else 
        {
          resolve(ack)
        }
    }
    if (self.awaitingResponse) {
      self.callback(new Error("Can't send while awaiting response"));
      //reject(new Error("Can't send while awaiting response"));
    }
    self.awaitingResponse = true;
    try {
      if (self.client) {
        self.client.write(VT + msg.toString() + FS + CR);
      } else {
        self.connect(function(err) {
          if (err) self.callback(err);
          self.awaitingResponse = true;
          self.client.write(VT + msg.toString() + FS + CR);
        });
      }
    } catch (e) {
      self.callback(e);
      //return reject(e);
    }
  });
}

module.exports = TlsClient
