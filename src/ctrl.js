var board = require('./board');
var data = require('./data');
var fen = require('./fen');
var configure = require('./configure');
var anim = require('./anim');
var drag = require('./drag');

function controller(cfg) {

  this.data = data(cfg);

  this.vm = {
    exploding: false
  };

  this.getFen = function() {
    return fen.write(this.data.pieces);
  }.bind(this);

  this.set = anim(configure, this.data);

  this.toggleOrientation = anim(board.toggleOrientation, this.data);

  this.setPieces = anim(board.setPieces, this.data);

  this.selectSquare = anim(board.selectSquare, this.data, true);

  this.apiMove = anim(function(curData, orig, dest, pieces, config) {
    board.apiMove(curData, orig, dest);

    if (pieces) {
      board.setPieces(curData, pieces);
    }

    configure(curData, config);

  }, this.data);

  this.playPremove = anim(board.playPremove, this.data);

  this.cancelPremove = anim(board.unsetPremove, this.data, true);

  this.setCheck = anim(board.setCheck, this.data, true);

  this.cancelMove = anim(function(d) {
    board.cancelMove(d);
    drag.cancel(d);
  }, this.data, true);

  this.stop = anim(function(d) {
    board.stop(d);
    drag.cancel(d);
  }, this.data, true);

  this.explode = function(keys) {
    if (!this.data.render) return;
    this.vm.exploding = keys;
    this.data.renderRAF();
    setTimeout(function() {
      this.vm.exploding = false;
      this.data.renderRAF();
    }.bind(this), 200);
  }.bind(this);

  // no need to debounce: resizable only by orientation change
  var onresize = function() {
    if (this.data.element) {
      this.data.bounds = this.data.element.getBoundingClientRect();
    }
  }.bind(this);

  if (!this.data.viewOnly) {
    window.addEventListener('resize', onresize);
  }

  this.onunload = function() {
    if (!this.data.viewOnly) {
      window.removeEventListener('resize', onresize);
    }
  };
}

module.exports = controller;
