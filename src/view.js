var drag = require('./drag');
var util = require('./util');
var vdom = require('./vdom');
var canvasAPI = require('./canvas');
var m = require('mithril');

function savePrevData(ctrl) {
  var cloned = {
    pieces: {},
    fadings: {},
    anims: {},
    orientation: '',
    selected: null,
    check: null,
    lastMove: null,
    dests: [],
    premove: null,
    premoveDests: [],
    exploding: []
  };
  var currAnim = ctrl.data.animation.current;
  var pK = ctrl.data.pieces ? Object.keys(ctrl.data.pieces) : [];
  var aK = currAnim.anims ? Object.keys(currAnim.anims) : [];
  var fK = currAnim.fadings ? Object.keys(currAnim.fadings) : [];
  for (var i = 0, ilen = pK.length; i < ilen; i++) {
    cloned.pieces[pK[i]] = ctrl.data.pieces[pK[i]];
  }
  for (var j = 0, jlen = aK.length; j < jlen; j++) {
    cloned.anims[aK[j]] = ctrl.data.animation.current.anims[aK[j]];
  }
  for (var k = 0, klen = fK.length; k < klen; k++) {
    cloned.fadings[fK[k]] = ctrl.data.animation.current.fadings[fK[k]];
  }
  cloned.dests = ctrl.data.movable.dests;
  cloned.selected = ctrl.data.selected;
  cloned.lastMove = ctrl.data.lastMove;
  cloned.check = ctrl.data.check;
  cloned.orientation = ctrl.data.orientation;
  cloned.premove = ctrl.data.premovable.current;
  cloned.premoveDests = ctrl.data.premovable.dests;
  cloned.exploding = ctrl.vm.exploding;

  return cloned;
}

function diffAndRenderBoard(ctrl, prevState, forceClearSquares) {
  var pieces = ctrl.data.pieces;
  var fadings = ctrl.data.animation.current.fadings;
  var canvas = document.getElementById('cg-lights');
  var ctx = canvas.getContext('2d');
  var asWhite = ctrl.data.orientation === 'white';
  var key, piece, prevPiece, fading, prevFading, pieceEl, squareEl, anim, prevAnim;
  var anims = ctrl.data.animation.current.anims;
  for (var i = 0, len = util.allKeys.length; i < len; i++) {
    key = util.allKeys[i];
    piece = pieces[key];
    prevPiece = prevState.pieces[key];
    anim = anims && anims[key];
    prevAnim = prevState.anims[key];
    fading = fadings && fadings[key];
    prevFading = prevState.fadings[key];
    squareEl = document.getElementById('cgs-' + key);
    // draw highlights
    drawLight(ctx, key, asWhite, ctrl, prevState, forceClearSquares);
    // remove previous fading if any when animation is finished
    if (prevFading && !fading) {
      var fadingPieceEl = squareEl.getElementsByClassName('cg-piece fading').item(0);
      if (fadingPieceEl) squareEl.removeChild(fadingPieceEl);
    }
    // there is a now piece at this square
    if (piece) {
      if (anim) {
        var animP = squareEl.getElementsByClassName('cg-piece').item(0);
        if (animP) animP.style[util.transformProp()] = util.translate(anim[1]);
      } else if (prevAnim) {
        var prevAnimP = squareEl.getElementsByClassName('cg-piece').item(0);
        if (prevAnimP) prevAnimP.removeAttribute('style');
      }
      // a piece was already there
      if (prevPiece) {
        // same piece same square: do nothing
        if (piece.role === prevPiece.role && piece.color === prevPiece.color) {
          continue;
        } else {
          // different pieces: remove old piece and put new one
          pieceEl = vdom.create(renderPiece(ctrl, key, piece)).dom;
          squareEl.replaceChild(pieceEl, squareEl.firstChild);
          // during an animation we render a temporary 'fading' piece (the name
          // is wrong because it's not fading, it's juste here)
          // make sure there is no fading piece already (may happen with promotion)
          if (fading && !prevFading)
            squareEl.appendChild(vdom.create(renderCaptured(fading)).dom);
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

function drawLight(ctx, key, asWhite, ctrl, prevState, forceClear) {
  var data = ctrl.data;
  var occupied = !!data.pieces[key];
  var isMoveDest = data.selected && util.containsX(data.movable.dests[data.selected], key);
  var wasMoveDest = prevState.selected && util.containsX(prevState.dests[prevState.selected], key);
  var isSelected = key === data.selected;
  var wasSelected = key === prevState.selected;
  var isLastMove = util.contains2(data.lastMove, key);
  var wasLastMove = util.contains2(prevState.lastMove, key);
  var isCheck = data.check === key;
  var wasCheck = prevState.check === key;
  var isPremove = util.contains2(data.premovable.current, key);
  var wasPremove = util.contains2(prevState.premove, key);
  var isPremoveDest = data.selected && util.containsX(data.premovable.dests, key);
  var wasPremoveDest = prevState.selected && util.containsX(prevState.premoveDests, key);
  var isExploding = ctrl.vm.exploding && ctrl.vm.exploding.indexOf(key) !== -1;
  var wasExploding = prevState.exploding && prevState.exploding.indexOf(key) !== -1;

  var pos;

  // clear any prev light
  if (wasSelected || wasMoveDest || wasLastMove || wasCheck || wasPremove ||
    wasPremoveDest || wasExploding || forceClear) {
    pos = canvasAPI.squarePos(key, data.bounds, asWhite);
    canvasAPI.clearSquare(pos, ctx);
  }

  // draw new light
  if (isSelected || isMoveDest || isLastMove || isPremove || isPremoveDest ||
    isCheck || isExploding) {
    pos = pos || canvasAPI.squarePos(key, data.bounds, asWhite);

    if (isSelected) {
      canvasAPI.drawSquare(pos, data.colors.selected, ctx);
    }
    else if (isMoveDest) {
      if (occupied)
        canvasAPI.drawPossibleDestOccupied(pos, data.colors.moveDest, ctx);
      else
        canvasAPI.drawPossibleDest(pos, data.colors.moveDest, ctx);
    }
    else if (isPremoveDest) {
      if (occupied)
        canvasAPI.drawPossibleDestOccupied(pos, data.colors.premoveDest, ctx);
      else
        canvasAPI.drawPossibleDest(pos, data.colors.premoveDest, ctx);
    }
    else if (isPremove) {
      canvasAPI.drawSquare(pos, data.colors.premove, ctx);
    }
    else if (isLastMove) {
      canvasAPI.drawSquare(pos, data.colors.lastMove, ctx);
    }
    else if (isCheck) {
      canvasAPI.drawCheck(pos, ctx);
    }
    if (isExploding) {
      canvasAPI.drawSquare(pos, data.colors.exploding, ctx);
    }
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

function renderCaptured(p) {
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
  if (ctrl.data.coordinates) {
    if (pos[1] === (asWhite ? 1 : 8)) attrs['data-coord-x'] = file;
    if (pos[0] === (asWhite ? 8 : 1)) attrs['data-coord-y'] = rank;
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
        'class': 'cg-square last-move',
        style: {
          left: bpos.left + '%',
          bottom: bpos.bottom + '%'
        }
      }
    });
  });
  var piecesKeys = Object.keys(ctrl.data.pieces);
  for (var i = 0, len = piecesKeys.length; i < len; i++) {
    var key = piecesKeys[i];
    var pos = util.key2pos(key);
    var bpos = util.boardpos(pos, asWhite);
    var attrs = {
      style: {
        left: bpos.left + '%',
        bottom: bpos.bottom + '%'
      },
      'class': pieceClass(ctrl.data.pieces[key])
    };
    children.push({
      tag: 'div',
      attrs: attrs
    });
  }

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
      className: 'cg-board orientation-' + ctrl.data.orientation,
      config: function(el, isUpdate, context) {
        if (isUpdate) return;

        ctrl.data.bounds = el.getBoundingClientRect();
        ctrl.data.element = el;
        ctrl.data.render = function(resizeFlag) {
          if (ctrl.data.minimalDom) {
            m.render(el, renderContent(ctrl));
          } else {
            if (context.prevState.orientation !== ctrl.data.orientation) {
              m.render(el, renderContent(ctrl), true);
              context.prevState = savePrevData(ctrl);
              diffAndRenderBoard(ctrl, context.prevState, true);
            } else {
              diffAndRenderBoard(ctrl, context.prevState, resizeFlag === 'resize');
              context.prevState = savePrevData(ctrl);
            }
          }
        };
        ctrl.data.renderRAF = function() {
          requestAnimationFrame(ctrl.data.render);
        };

        if (!ctrl.data.minimalDom) {
          el.parentElement.appendChild(vdom.create(renderCanvas(ctrl.data.bounds)).dom);
        }

        // set initial ui state
        context.prevState = {
          pieces: ctrl.data.pieces,
          fadings: {},
          anims: {},
          orientation: ctrl.data.orientation,
          selected: null,
          check: null,
          lastMove: null,
          dests: [],
          premove: null,
          premoveDests: [],
          exploding: []
        };

        ctrl.data.render();

        bindEvents(ctrl, el, context);
      }
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
  var onstart = drag.start.bind(undefined, ctrl.data);
  var onmove = drag.move.bind(undefined, ctrl.data);
  var onend = drag.end.bind(undefined, ctrl.data);
  var oncancel = drag.cancel.bind(undefined, ctrl.data);
  var onresize = function() {
    ctrl.data.bounds = ctrl.data.element.getBoundingClientRect();
    ctrl.data.render('resize');
  };
  if (!ctrl.data.viewOnly) {
    el.addEventListener('touchstart', onstart);
    el.addEventListener('touchmove', onmove);
    el.addEventListener('touchend', onend);
    el.addEventListener('touchcancel', oncancel);
  }
  window.addEventListener('resize', onresize);
}

function view(ctrl) {
  return {
    tag: 'div',
    attrs: {
      className: [
        'cg-board-wrap',
        ctrl.data.viewOnly ? 'view-only' : 'manipulable',
        ctrl.data.minimalDom ? 'minimal-dom' : 'full-dom'
      ].join(' ')
    },
    children: [
      renderBoard(ctrl)
    ]
  };
}

module.exports = view;
