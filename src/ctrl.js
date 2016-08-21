var board = require('./board');
var data = require('./data');
var fen = require('./fen');
var configure = require('./configure');
var anim = require('./anim');
var drag = require('./drag');

module.exports = function(cfg) {

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

  // useful for board editor only as a workaround for ios issue
  this.setDragPiece = anim(board.setDragPiece, this.data);

  this.selectSquare = anim(board.selectSquare, this.data, true);

  this.apiMove = anim(function(curData, orig, dest, pieces, config) {
    board.apiMove(curData, orig, dest);

    if (pieces) {
      board.setPieces(curData, pieces);
    }

    configure(curData, config);

  }, this.data);

  this.apiNewPiece = anim(function(curData, piece, key, config) {
    board.apiNewPiece(curData, piece, key);
    configure(curData, config);

  }, this.data);

  this.playPremove = anim(board.playPremove, this.data);

  this.playPredrop = anim(board.playPredrop, this.data);

  this.cancelPremove = anim(board.unsetPremove, this.data, true);

  this.cancelPredrop = anim(board.unsetPredrop, this.data, true);

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

  // view-only needs only `width` and `height` props
  // manipulables board needs also `top` and `left`
  this.setBounds = function(bounds) {
    this.data.bounds = bounds;
  }.bind(this);

  // no need to debounce: resizable only by orientation change
  var onresize = function() {
    if (this.data.element) {
      // oh my what an ugly hack
      clearTimeout(ttId);
      var ttId = setTimeout(function() {
        this.data.bounds = this.data.element.getBoundingClientRect();
      }.bind(this), 100);
    }
  }.bind(this);

  if (!this.data.viewOnly) {
    window.addEventListener('resize', onresize);
  }

  this.unload = function() {
    this.cancelMove();
    this.stop();
    if (!this.data.viewOnly) {
      window.removeEventListener('resize', onresize);
    }
  };
};
