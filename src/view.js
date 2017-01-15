var drag = require('./drag');
var util = require('./util');
var Vnode = require('mithril/render/vnode');

module.exports = function renderBoard(ctrl) {
  return Vnode(
    'div',
    undefined,
    {
      className: [
        'cg-board orientation-' + ctrl.data.orientation,
        ctrl.data.viewOnly ? 'view-only' : 'manipulable'
      ].join(' '),
      oncreate: function(vnode) {
        ctrl.data.element = vnode.dom;
        ctrl.data.render = function() {
          diffBoard(ctrl);
        };
        ctrl.data.renderRAF = function() {
          ctrl.data.batchRAF(ctrl.data.render);
        };

        if (!ctrl.data.bounds) {
          ctrl.data.bounds = vnode.dom.getBoundingClientRect();
        }

        if (!ctrl.data.viewOnly) {
          ctrl.data.render();
          bindEvents(ctrl, vnode.dom);
        }
      }
    },
    ctrl.data.viewOnly ? renderContent(ctrl) : [],
    undefined,
    undefined
  );
};

function diffBoard(ctrl) {
  var d = ctrl.data;
  var asWhite = d.orientation === 'white';
  var bounds = d.bounds;
  var els = ctrl.data.element.childNodes;
  var pieces = ctrl.data.pieces;
  var anims = ctrl.data.animation.current.anims;
  var capturedPieces = ctrl.data.animation.current.capturedPieces;
  var squares = computeSquareMap(ctrl);
  var samePieces = new Set();
  var movedPieces = new Map();
  var movedSquares = new Map();
  var sameSquares = new Set();
  var piecesKeys = Object.keys(pieces);
  var el, k, squareAtKey, pieceAtKey, pieceId, anim, captured, translate;
  var kv, v, p, mvdset, mvd;

  // walk over all dom elements, apply animations and flag moved pieces
  for (var i = 0, len = els.length; i < len; i++) {
    el = els[i];
    k = el.cgKey;
    pieceAtKey = pieces[k];
    squareAtKey = squares.get(k);
    pieceId = el.cgRole + el.cgColor;
    anim = anims && anims[k];
    captured = capturedPieces && capturedPieces[k];
    // el is a piece
    if (el.cgRole) {
      // there is a piece at this dom key
      if (pieceAtKey) {
        // continue animation if flag and same piece color
        // (otherwise it would animate a captured piece)
        if (anim && el.cgAnimating && el.cgColor === pieceAtKey.color) {
          translate = util.posToTranslate(util.key2pos(k), asWhite, bounds);
          translate[0] += anim[1][0];
          translate[1] += anim[1][1];
          el.style.transform = util.translate(translate);
        } else if (el.cgAnimating) {
          translate = util.posToTranslate(util.key2pos(k), asWhite, bounds);
          el.style.transform = util.translate(translate);
          el.cgAnimating = false;
        }
        // same piece: flag as same
        if (el.cgColor === pieceAtKey.color && el.cgRole === pieceAtKey.role) {
          samePieces.add(k);
        }
        // different piece: flag as moved unless it is a captured piece
        else {
          if (captured) {
            el.classList.add('captured');
          } else {
            movedPieces.set(pieceId, (movedPieces.get(pieceId) || []).concat(el));
          }
        }
      }
      // no piece: flag as moved
      else {
        movedPieces.set(pieceId, (movedPieces.get(pieceId) || []).concat(el));
      }
    }
    // el is a square
    else {
      if (squareAtKey && squareAtKey === el.className) {
        sameSquares.add(k);
      }
      else {
        movedSquares.set(
          el.className,
          (movedSquares.get(el.className) || []).concat(el)
        );
      }
    }
  }

  // walk over all pieces in current set, apply dom changes to moved pieces
  // or append new pieces
  for (var j = 0, jlen = piecesKeys.length; j < jlen; j++) {
    k = piecesKeys[j];
    p = pieces[k];
    pieceId = p.role + p.color;
    anim = anims && anims[k];
    // same piece: nothing to do
    if (samePieces.has(k)) {
      continue;
    } else {
      mvdset = movedPieces.get(pieceId);
      mvd = mvdset && mvdset.pop();
      // a same piece was moved
      if (mvd) {
        // apply dom changes
        mvd.cgKey = k;
        translate = util.posToTranslate(util.key2pos(k), asWhite, bounds);
        if (anim) {
          mvd.cgAnimating = true;
          translate[0] += anim[1][0];
          translate[1] += anim[1][1];
        }
        mvd.style.transform = util.translate(translate);
      }
      // no piece in moved obj: insert the new piece
      else {
        ctrl.data.element.appendChild(
          renderPieceDom(p, k, renderPiece(d, k, {
            asWhite: asWhite,
            bounds: bounds
          }), !!anim)
        );
      }
    }
  }

  // walk over all squares in current set, apply dom changes to moved squares
  // or append new squares
  for (kv of squares) {
    k = kv[0];
    v = kv[1];
    if (sameSquares.has(k)) continue;
    else {
      mvdset = movedSquares.get(v);
      mvd = mvdset && mvdset.pop();
      if (mvd) {
        mvd.cgKey = k;
        translate = util.posToTranslate(util.key2pos(k), asWhite, bounds);
        mvd.style.transform = util.translate(translate);
      }
      else {
        ctrl.data.element.appendChild(
          renderSquareDom(k, renderSquare(k, v, {
            asWhite: asWhite,
            bounds: bounds
          }))
        );
      }
    }
  }

  // remove any dom el that remains in the moved sets
  for (kv of movedPieces) {
    kv[1].forEach(function(e) { d.element.removeChild(e); });
  }
  for (kv of movedSquares) {
    kv[1].forEach(function(e) { d.element.removeChild(e); });
  }
}

function renderPieceDom(piece, key, vdom, isAnimating) {
  var p = document.createElement('piece');
  p.className = vdom.attrs.className;
  p.cgRole = piece.role;
  p.cgColor = piece.color;
  p.cgKey = key;
  if (isAnimating) p.cgAnimating = true;
  p.style.transform = vdom.attrs.style.transform;
  return p;
}

function renderSquareDom(key, vdom) {
  var s = document.createElement('square');
  s.className = vdom.attrs.className;
  s.cgKey = key;
  s.style.transform = vdom.attrs.style.transform;
  return s;
}

function pieceClass(p) {
  return p.role + ' ' + p.color;
}

function renderPiece(d, key, ctx) {
  var animation;
  if (d.animation.current.anims) {
    animation = d.animation.current.anims[key];
  }
  var p = d.pieces[key];
  var draggable = d.draggable.current;
  var dragging = draggable.orig === key && draggable.started;
  var attrs = {
    style: {},
    className: pieceClass(p)
  };
  var translate = util.posToTranslate(util.key2pos(key), ctx.asWhite, ctx.bounds);
  if (dragging) {
    translate[0] += draggable.pos[0] + draggable.dec[0];
    translate[1] += draggable.pos[1] + draggable.dec[1];
    attrs.className += ' dragging';
    if (d.draggable.magnified) {
      attrs.className += ' magnified';
    }
  } else if (animation) {
    translate[0] += animation[1][0];
    translate[1] += animation[1][1];
  }
  attrs.style.transform = util.translate(translate);
  return Vnode(
    'piece',
    'p' + key,
    attrs,
    undefined,
    undefined,
    undefined
  );
}

function addSquare(squares, key, klass) {
  squares.set(key, (squares.get(key) || '') + ' ' + klass);
}

function computeSquareMap(ctrl) {
  var d = ctrl.data;
  var squares = new Map();
  if (d.lastMove && d.highlight.lastMove) d.lastMove.forEach(function(k) {
    addSquare(squares, k, 'last-move');
  });
  if (d.check && d.highlight.check) addSquare(squares, d.check, 'check');
  if (d.selected) {
    addSquare(squares, d.selected, 'selected');
    var dests = d.movable.dests[d.selected];
    if (dests) dests.forEach(function(k) {
      if (d.movable.showDests) addSquare(squares, k, 'move-dest' + (d.pieces[k] ? ' occupied' : ''));
    });
    var pDests = d.premovable.dests;
    if (pDests) pDests.forEach(function(k) {
      if (d.movable.showDests) addSquare(squares, k, 'premove-dest' + (d.pieces[k] ? ' occupied' : ''));
    });
  }
  var premove = d.premovable.current;
  if (premove) premove.forEach(function(k) {
    addSquare(squares, k, 'current-premove');
  });
  else if (d.predroppable.current.key)
    addSquare(squares, d.predroppable.current.key, 'current-premove');

  if (ctrl.vm.exploding) ctrl.vm.exploding.keys.forEach(function(k) {
    addSquare(squares, k, 'exploding' + ctrl.vm.exploding.stage);
  });
  return squares;
}

function renderSquares(ctrl, ctx) {
  var squares = computeSquareMap(ctrl);

  var dom = [];
  for (var kv of squares)
    dom.push(renderSquare(kv[0], kv[1], ctx));

  return dom;
}

function renderSquare(key, classes, ctx) {
  var attrs = {
    className: classes,
    style: {}
  };
  attrs.style.transform = util.translate(util.posToTranslate(util.key2pos(key), ctx.asWhite, ctx.bounds));
  return Vnode(
    'square',
    's' + key,
    attrs,
    undefined,
    undefined,
    undefined
  );
}

function renderContent(ctrl) {
  var d = ctrl.data;
  if (!d.bounds) return null;
  var ctx = {
    asWhite: d.orientation === 'white',
    bounds: d.bounds
  };
  var children = renderSquares(ctrl, ctx);
  if (d.animation.current.capturedPieces) {
    Object.keys(d.animation.current.capturedPieces).forEach(function(k) {
      children.push(renderCaptured(d.animation.current.capturedPieces[k], ctx));
    });
  }

  var keys = ctx.asWhite ? util.allKeys : util.invKeys;
  for (var i = 0; i < 64; i++) {
    if (d.pieces[keys[i]]) children.push(renderPiece(d, keys[i], ctx));
  }

  return children;
}

function renderCaptured(cfg, ctx) {
  var attrs = {
    className: 'fading ' + pieceClass(cfg.piece),
    style: {}
  };
  attrs.style.transform = util.translate(util.posToTranslate(cfg.piece.pos, ctx.asWhite, ctx.bounds));
  return Vnode(
    'piece',
    'f' + cfg.piece.key,
    attrs,
    undefined,
    undefined,
    undefined
  );
}

function bindEvents(ctrl, el) {
  var onstart = drag.start.bind(undefined, ctrl.data);
  var onmove = drag.move.bind(undefined, ctrl.data);
  var onend = drag.end.bind(undefined, ctrl.data);
  var oncancel = drag.cancel.bind(undefined, ctrl.data);
  el.addEventListener('touchstart', onstart);
  el.addEventListener('touchmove', onmove);
  el.addEventListener('touchend', onend);
  el.addEventListener('touchcancel', oncancel);
}
