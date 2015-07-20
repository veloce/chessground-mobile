var drag = require('./drag');
var util = require('./util');
var vdom = require('./vdom');

var prevPiecesMap = {};
var prevFadingsMap = {};

function diffAndRenderPieces(ctrl) {
  var pieces = ctrl.data.pieces;
  var fadings = ctrl.data.animation.current.fadings;
  var key, piece, prevPiece, fading, prevFading, pieceEl, squareEl;
  for (var i = 0, len = util.allKeys.length; i < len; i++) {
    key = util.allKeys[i];
    piece = pieces[key];
    prevPiece = prevPiecesMap[key];
    fading = fadings && fadings[key];
    prevFading = prevFadingsMap[key];
    squareEl = document.getElementById('cgs-' + key);
    // remove previous fading if any when animation is finished
    if (!fading && prevFading) {
      var fadingPieceEl = squareEl.querySelector('.cg-piece.fading');
      if (fadingPieceEl) squareEl.removeChild(fadingPieceEl);
    }
    prevFadingsMap[key] = fading;
    // there is a now piece at this square
    if (piece) {
      // a piece was already there
      if (prevPiece) {
        // same piece same square: do nothing
        if (piece === prevPiece) {
          continue;
        } // different pieces: remove old piece and put new one
        else {
          pieceEl = vdom.create(renderPiece(ctrl, key, piece)).dom;
          squareEl.replaceChild(pieceEl, squareEl.firstChild);
          // during an animation we render a temporary 'fading' piece (the name
          // is wrong because it's not fading, it's juste here)
          if (fading) {
            vdom.append(squareEl, renderFading(fading));
          }
        }
      } // empty square before: just put the piece
      else {
        pieceEl = vdom.create(renderPiece(ctrl, key, piece)).dom;
        squareEl.appendChild(pieceEl);
      }
    } // no piece at this square
    else {
      // remove a piece that was here
      if (prevPiece) {
        squareEl.removeChild(squareEl.firstChild);
      }
    }
    prevPiecesMap[key] = piece;
  }
}

function pieceClass(p) {
  return ['cg-piece', p.role, p.color].join(' ');
}

function renderPiece(ctrl, key, p) {
  var attrs = {
    style: {},
    'class': pieceClass(p)
  };
  var draggable = ctrl.data.draggable.current;
  if (draggable.orig === key && (draggable.pos[0] !== 0 || draggable.pos[1] !== 0)) {
    attrs.style[util.transformProp()] = util.translate([
      draggable.pos[0] + draggable.dec[0],
      draggable.pos[1] + draggable.dec[1]
    ]);
    attrs.class += ' dragging';
  } else if (ctrl.data.animation.current.anims) {
    var animation = ctrl.data.animation.current.anims[key];
    if (animation) attrs.style[util.transformProp()] = util.translate(animation[1]);
  }
  prevPiecesMap[key] = p;
  return {
    tag: 'div',
    attrs: attrs
  };
}

function renderFading(p) {
  return {
    tag: 'div',
    attrs: {
      'class': pieceClass(p) + ' fading'
    }
  };
}

function renderSquare(ctrl, pos, asWhite) {
  var file = util.files[pos[0] - 1];
  var rank = pos[1];
  var key = file + rank;
  var piece = ctrl.data.pieces[key];
  var isDragOver = ctrl.data.highlight.dragOver && ctrl.data.draggable.current.over === key;
  var bpos = util.boardpos(pos, asWhite);
  var attrs = {
    id: 'cgs-' + key,
    class: 'cg-square ' + key + ' ' + util.classSet({
      'selected': ctrl.data.selected === key,
      'check': ctrl.data.highlight.check && ctrl.data.check === key,
      'last-move': ctrl.data.highlight.lastMove && util.contains2(ctrl.data.lastMove, key),
      'move-dest': (isDragOver || ctrl.data.movable.showDests) && util.containsX(ctrl.data.movable.dests[ctrl.data.selected], key),
      'premove-dest': (isDragOver || ctrl.data.premovable.showDests) && util.containsX(ctrl.data.premovable.dests, key),
      'current-premove': util.contains2(ctrl.data.premovable.current, key),
      'drag-over': isDragOver,
      'occupied': !!piece,
      'exploding': ctrl.vm.exploding && ctrl.vm.exploding.indexOf(key) !== -1
    }),
    style: {
      left: bpos.left + '%',
      bottom: bpos.bottom + '%'
    }
  };
  if (ctrl.data.coordinates) {
    if (pos[1] === (asWhite ? 1 : 8)) attrs['data-coord-x'] = file;
    if (pos[0] === (asWhite ? 8 : 1)) attrs['data-coord-y'] = rank;
  }
  var children = [];
  if (piece) {
    children.push(renderPiece(ctrl, key, piece));
  }
  return {
    tag: 'div',
    attrs: attrs,
    children: children
  };
}

function renderMinimalDom(ctrl, asWhite) {
  var children = [];
  if (ctrl.data.lastMove) ctrl.data.lastMove.forEach(function(key) {
    var pos = util.key2pos(key);
    var bpos = util.boardpos(pos, asWhite);
    children.push({
      tag: 'div',
      attrs: {
        class: 'cg-square last-move',
        style: {
          left: bpos.left + '%',
          bottom: bpos.bottom + '%'
        }
      }
    });
  });

  return children;
}

function renderContent(ctrl) {
  var asWhite = ctrl.data.orientation === 'white';
  if (ctrl.data.minimalDom) return renderMinimalDom(ctrl, asWhite);
  var positions = asWhite ? util.allPos : util.invPos;
  var children = [];
  for (var i = 0, len = positions.length; i < len; i++) {
    children.push(renderSquare(ctrl, positions[i], asWhite));
  }
  return children;
}

function bindEvents(ctrl, el) {
  var onstart = util.partial(drag.start, ctrl.data);
  var onmove = util.partial(drag.move, ctrl.data);
  var onend = util.partial(drag.end, ctrl.data);
  var oncancel = util.partial(drag.cancel, ctrl.data);
  el.addEventListener('touchstart', onstart);
  el.addEventListener('touchmove', onmove);
  el.addEventListener('touchend', onend);
  el.addEventListener('touchcancel', oncancel);
}

module.exports = function(ctrl) {
  var onresizeHandler;
  return {
    tag: 'div',
    attrs: {
      id: 'cg-board',
      'class': [
        'cg-board',
        'orientation-' + ctrl.data.orientation,
        ctrl.data.viewOnly ? 'view-only' : 'manipulable',
        ctrl.data.minimalDom ? 'minimal-dom' : 'full-dom'
      ].join(' ')
    },
    events: {
      $created: function(e) {
        var boardEl = e.target;
        if (!ctrl.data.viewOnly) bindEvents(ctrl, boardEl);
        ctrl.data.bounds = boardEl.getBoundingClientRect();
        ctrl.data.element = boardEl;
        ctrl.data.render = function() {
          console.log('render triggered');
          diffAndRenderPieces(ctrl);
        };
        ctrl.data.renderRAF = function() {
          requestAnimationFrame(ctrl.data.render);
        };
        onresizeHandler = function() {
          ctrl.data.bounds = boardEl.getBoundingClientRect();
        };
        window.addEventListener('resize', onresizeHandler);
      },
      $destroyed: function() {
        window.removeEventListener('resize', onresizeHandler);
      }
    },
    children: renderContent(ctrl)
  };
};
