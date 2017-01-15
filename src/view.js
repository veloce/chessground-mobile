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
  var same = new Set();
  var moved = new Map();
  var pEl, k, pieceAtKey, id, anim, captured, translate;

  // walk over all dom elements, apply animations and flag moved pieces
  for (var i = 0, len = els.length; i < len; i++) {
    pEl = els[i];
    k = pEl.cgKey;
    pieceAtKey = pieces[k];
    id = pEl.cgRole + pEl.cgColor;
    anim = anims && anims[k];
    captured = capturedPieces && capturedPieces.find(p => p.piece.key === k);
    // animate
    if (anim && pEl.cgAnimating) {
      translate = util.posToTranslate(util.key2pos(k), asWhite, bounds);
      translate[0] += anim[1][0];
      translate[1] += anim[1][1];
      pEl.style.transform = util.translate(translate);
    } else if (pEl.cgAnimating) {
      translate = util.posToTranslate(util.key2pos(k), asWhite, bounds);
      pEl.style.transform = util.translate(translate);
      pEl.cgAnimating = false;
    }
    // there is a piece at this dom key
    if (pieceAtKey) {
      // same piece: flag as same
      if (pEl.cgColor === pieceAtKey.color && pEl.cgRole === pieceAtKey.role) {
        same.add(k);
      }
      // different piece: flag as moved unless it is a captured piece
      else {
        if (captured) {
          pEl.classList.add('captured');
        } else {
          moved.set(id, pEl);
        }
      }
    }
    // no piece: flag as moved
    else {
      moved.set(id, pEl);
    }
  }

  var piecesKeys = Object.keys(pieces);
  var p;
  // walk over all pieces in current set, apply dom changes to moved pieces
  // or append new pieces
  for (var j = 0, jlen = piecesKeys.length; j < jlen; j++) {
    k = piecesKeys[j];
    p = pieces[k];
    id = p.role + p.color;
    anim = anims && anims[k];
    // same piece: nothing to do
    if (same.has(k)) {
      continue;
    } else {
      var mvd = moved.get(id);
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
        // remove flagged piece
        moved.delete(id);
      }
      // no piece in moved obj: insert the new piece
      else {
        ctrl.data.element.appendChild(
          renderPieceDom(p, k, renderPiece(d, k, {
            asWhite: asWhite,
            bounds: bounds
          }))
        );
      }
    }
  }

  // remove any dom el that remains in the moved set
  for (var kv of moved) {
    d.element.removeChild(kv[1]);
  }
}

function renderPieceDom(piece, key, vdom) {
  var p = document.createElement('piece');
  p.className = vdom.attrs.className;
  p.cgRole = piece.role;
  p.cgColor = piece.color;
  p.cgKey = key;
  p.style.transform = vdom.attrs.style.transform;
  return p;
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
    undefined,
    attrs,
    undefined,
    undefined,
    undefined
  );
}

function addSquare(squares, key, klass) {
  if (squares[key]) squares[key].push(klass);
  else squares[key] = [klass];
}

function renderSquares(ctrl, ctx) {
  var d = ctrl.data;
  var squares = {};
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

  var dom = [];
  for (var skey in squares)
    dom.push(renderSquare(skey, squares[skey].join(' '), ctx));
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
    undefined,
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
    d.animation.current.capturedPieces.forEach(function(p) {
      children.push(renderCaptured(p, ctx));
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
