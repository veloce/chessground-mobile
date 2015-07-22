var drag = require('./drag');
var util = require('./util');
var vdom = require('./vdom');
var canvasAPI = require('./canvas');

function savePrevData(data) {
  var cloned = {
    pieces: {},
    fadings: {},
    orientation: '',
    selected: null,
    check: null,
    lastMove: null,
    dests: [],
    premove: null,
    premoveDests: []
  };
  var k;
  for (k in data.pieces) {
    cloned.pieces[k] = data.pieces[k];
  }
  for (k in data.animation.current.fadings) {
    cloned.fadings[k] = data.animation.current.fadings;
  }
  cloned.dests = data.movable.dests;
  cloned.selected = data.selected;
  cloned.lastMove = data.lastMove;
  cloned.check = data.check;
  cloned.orientation = data.orientation;
  cloned.premove = data.premovable.current;
  cloned.premoveDests = data.premovable.dests;

  return cloned;
}

function diffAndRenderBoard(ctrl, prevState, isResize) {
  var pieces = ctrl.data.pieces;
  var fadings = ctrl.data.animation.current.fadings;
  var canvas = document.getElementById('cg-lights');
  var ctx = canvas.getContext('2d');
  var asWhite = ctrl.data.orientation === 'white';
  var key, piece, prevPiece, fading, prevFading, pieceEl, squareEl;
  for (var i = 0, len = util.allKeys.length; i < len; i++) {
    key = util.allKeys[i];
    piece = pieces[key];
    prevPiece = prevState.pieces[key];
    fading = fadings && fadings[key];
    prevFading = prevState.fadings[key];
    squareEl = document.getElementById('cgs-' + key);
    // square pos change if orientation change
    // TODO use vdom node update
    if (prevState.orientation !== ctrl.data.orientation) {
      var pos = util.key2pos(key);
      var bpos = util.boardpos(pos, asWhite);
      squareEl.style.left = bpos.left + '%';
      squareEl.style.bottom = bpos.bottom + '%';
    }
    // draw highlights
    drawLights(ctx, key, asWhite, ctrl.data, prevState, isResize);
    // remove previous fading if any when animation is finished
    if (!fading && prevFading) {
      var fadingPieceEl = squareEl.querySelector('.cg-piece.fading');
      if (fadingPieceEl) squareEl.removeChild(fadingPieceEl);
    }
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
  }
}

function drawLights(ctx, key, asWhite, data, prevState, isResize) {
  var occupied = !!data.pieces[key];
  var isMoveDest = data.movable.showDests && util.containsX(data.movable.dests[data.selected], key);
  var wasMoveDest = data.movable.showDests && util.containsX(prevState.dests[prevState.selected], key);
  var isSelected = key === data.selected;
  var wasSelected = key === prevState.selected;
  var isLastMove = data.highlight.lastMove && util.contains2(data.lastMove, key);
  var wasLastMove = data.highlight.lastMove && util.contains2(prevState.lastMove, key);
  var isCheck = data.highlight.check && data.check === key;
  var wasCheck = data.highlight.check && prevState.check === key;
  var isPremove = util.contains2(data.premovable.current, key);
  var wasPremove = util.contains2(prevState.premove, key);
  var isPremoveDest = data.premovable.showDests && util.containsX(data.premovable.dests, key);
  var wasPremoveDest = data.premovable.showDests && util.containsX(prevState.premoveDests, key);

  var pos = canvasAPI.squarePos(key, data.bounds, asWhite);

  // clear any prev state
  if (wasSelected || wasMoveDest || wasLastMove || wasCheck || wasPremove ||
    wasPremoveDest || isResize) {
    canvasAPI.clearSquare(pos, ctx);
  }

  if (isSelected) {
    canvasAPI.drawSquare(pos, data.colors.selected, ctx);
  }
  else if (isMoveDest) {
    if (occupied)
      canvasAPI.drawPossibleDestOccupied(pos, data.colors.moveDest, ctx);
    else
      canvasAPI.drawPossibleDest(pos, data.colors.moveDest, ctx);
  }
  else if (isLastMove) {
    canvasAPI.drawSquare(pos, data.colors.lastMove, ctx);
  }
  else if (isPremove) {
    canvasAPI.drawSquare(pos, data.colors.premove, ctx);
  }
  else if (isPremoveDest) {
    if (occupied)
      canvasAPI.drawPossibleDestOccupied(pos, data.colors.premoveDest, ctx);
    else
      canvasAPI.drawPossibleDest(pos, data.colors.premoveDest, ctx);
  }
  else if (isCheck) {
    canvasAPI.drawCheck(pos, data.colors.check, ctx);
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
  var bpos = util.boardpos(pos, asWhite);
  var attrs = {
    id: 'cgs-' + key,
    'class': 'cg-square ' + key,
    style: {
      left: bpos.left + '%',
      bottom: bpos.bottom + '%'
    }
  };
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

function renderBoard(ctrl) {
  return {
    tag: 'div',
    attrs: {
      id: 'cg-board',
      'class': 'cg-board'
    },
    children: renderContent(ctrl)
  };
}

function renderCanvas(bounds) {
  var style = {
    position: 'absolute',
    top: 0,
    left: 0,
    'z-index': 1
  };
  // useful for old devices where canvas is not hardware accelerated thus not
  // composited
  style[util.transformProp()] = 'translateZ(0)';

  return {
    tag: 'canvas',
    attrs: {
      id: 'cg-lights',
      width: bounds.width,
      height: bounds.height,
      style: style
    }
  };
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
      'class': [
        'cg-board-wrap',
        ctrl.data.viewOnly ? 'view-only' : 'manipulable',
        ctrl.data.minimalDom ? 'minimal-dom' : 'full-dom'
      ].join(' ')
    },
    events: {
      $created: function(e) {
        var boardEl = e.target;
        // previous ui state for diffing and rendering changes
        var prevState;

        if (!ctrl.data.viewOnly) bindEvents(ctrl, boardEl);
        ctrl.data.bounds = boardEl.getBoundingClientRect();
        ctrl.data.element = document.getElementById('cg-board');
        vdom.append(boardEl, renderCanvas(ctrl.data.bounds));
        ctrl.data.render = function(isResize) {
          diffAndRenderBoard(ctrl, prevState, isResize);
          prevState = savePrevData(ctrl.data);
        };
        ctrl.data.renderRAF = function() {
          requestAnimationFrame(ctrl.data.render);
        };
        onresizeHandler = function() {
          ctrl.data.bounds = boardEl.getBoundingClientRect();
          ctrl.data.render(true);
        };
        window.addEventListener('resize', onresizeHandler);
        // render once
        prevState = savePrevData(ctrl.data);
        ctrl.data.render();
      },
      $destroyed: function() {
        window.removeEventListener('resize', onresizeHandler);
      }
    },
    children: renderBoard(ctrl)
  };
};
