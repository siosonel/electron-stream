var spawn = require('child_process').spawn;
var Duplex = require('stream').Duplex;
var PassThrough = require('stream').PassThrough;
var fs = require('fs');
var tmpdir = require('os').tmpdir;
var join = require('path').join;
var inherits = require('util').inherits;
var read = require('stream-read');

module.exports = Electron;
inherits(Electron, Duplex);

function Electron(path){
  if (!(this instanceof Electron)) return new Electron(path);
  Duplex.call(this);

  this.source = '';
  this.ps = null;
  this.stdout = PassThrough();
  this.stderr = PassThrough();
  this.stdall = PassThrough();
  this.killed = false;
  this.path = path || 'electron';

  this.on('finish', this._onfinish.bind(this));
}

Electron.prototype._write = function(chunk, _, done){
  this.source += chunk.toString();
  done();
};

Electron.prototype._read = function(){
  var self = this;
  read(this.stdall, function(err, data){
    if (err) return self.emit('error', err);
    self.push(data);
  });
};

Electron.prototype._onfinish = function(){
  if (this.killed) return;

  var self = this;
  var rand = Math.random().toString(16).slice(2);
  var file = join(tmpdir(), 'electron-stream:' + rand);

  fs.writeFile(file, self.source, function(err){
    if (self.killed) return;
    if (err) return dup.emit('error', err);
    
    self._spawn(file);
  });
};

Electron.prototype._spawn = function(file){
  var ps = this.ps = spawn(this.path, [join(__dirname, 'script.js'), file]);

  ps.stdout.pipe(this.stdout);
  ps.stderr.pipe(this.stderr);

  ps.stdout.pipe(this.stdall);
  ps.stderr.pipe(this.stdall);

  ps.on('exit', this.emit.bind(this, 'exit'));
};

Electron.prototype.kill = function(){
  if (this.ps) this.ps.kill();
  else this.emit('exit', 0);
  this.killed = true;
};

