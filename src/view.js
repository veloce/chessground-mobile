var drag = require('./drag');
var util = require('./util');
var m = require('mithril');
var Vnode = require('mithril/render/vnode');

module.exports = function renderBoard(ctrl) {
  return Vnode(
    'div',
    null,
    {
      className: [
        'cg-board orientation-' + ctrl.data.orientation,
        ctrl.data.viewOnly ? 'view-only' : 'manipulable',
        ctrl.data.minimalDom ? 'minimal-dom' : 'full-dom'
      ].join(' '),
      oncreate: function(vnode) {
        var el = vnode.dom;

        if (!ctrl.data.bounds) {
          ctrl.data.bounds = el.getBoundingClientRect();
        }

        ctrl.data.scheduledAnimationFrame = false;

        ctrl.data.element = el;
        ctrl.data.render = function() {
          ctrl.data.scheduledAnimationFrame = false;
          if (ctrl.data.minimalDom) {
            m.render(el, renderContent(ctrl));
          } else {
            if (ctrl.data.prevOrientation !== ctrl.data.orientation) {
              m.render(el, renderContent(ctrl));
              rerenderBoard(ctrl);
              ctrl.data.prevOrientation = ctrl.data.orientation;
            } else {
              rerenderBoard(ctrl);
            }
          }
        };
        ctrl.data.renderRAF = function() {
          if (!ctrl.data.scheduledAnimationFrame) {
            ctrl.data.scheduledAnimationFrame = requestAnimationFrame(ctrl.data.render);
          }
        };

        bindEvents(ctrl, el);

        ctrl.data.prevOrientation = ctrl.data.orientation;
      }
    },
    renderContent(ctrl),
    undefined,
    undefined
  );
};

function rerenderBoard(ctrl) {
  var pieces = ctrl.data.pieces;
  var capturedPieces = ctrl.data.animation.current.capturedPieces;
  var key, piece, captured, squareNode, sqClass, anim, curPieceNode, dragging;
  var anims = ctrl.data.animation.current.anims;
  for (var i = 0, len = util.allKeys.length; i < len; i++) {
    key = util.allKeys[i];
    piece = pieces[key];
    anim = anims && anims[key];
    dragging = ctrl.data.draggable.current.orig === key;
    captured = capturedPieces && capturedPieces[key];
    squareNode = ctrl.data.squareEls[key];
    curPieceNode = squareNode.firstChild;
    sqClass = squareClass(ctrl, key, piece);

    // should not happen
    if (squareNode === undefined || squareNode === null) {
      console.log('Chessground: attempt to diff against unexisting square element ' + key);
      return;
    }

    // update highlights
    if (squareNode.className !== sqClass) squareNode.className = sqClass;

    // remove previous captured if any when animation is finished
    if (!captured) {
      var capturedEls = squareNode.getElementsByClassName('captured');
      while (capturedEls[0]) squareNode.removeChild(capturedEls[0]);
    }
    // there is a piece at this square
    if (piece) {
      // a piece Vnode is already there
      if (curPieceNode) {
        // if piece not being dragged, remove dragging style
        if (!dragging && curPieceNode.cgDragging) {
          curPieceNode.classList.remove('dragging');
          curPieceNode.classList.remove('magnified');
          curPieceNode.removeAttribute('style');
          curPieceNode.cgDragging = false;
        }
        // animate piece during animation
        if (anim) {
          curPieceNode.style[util.transformProp()] = util.translate(anim[1]);
          curPieceNode.cgAnimating = true;
        }
        // remove animation style after animation
        else if (curPieceNode.cgAnimating) {
          curPieceNode.removeAttribute('style');
          curPieceNode.cgAnimating = false;
        }
        // same piece same square: do nothing
        if (curPieceNode.cgRole === piece.role && curPieceNode.cgColor === piece.color) {
          continue;
        }
        // different pieces: remove old piece and put new one
        else {
          squareNode.replaceChild(renderPieceDom(renderPiece(ctrl, key, piece)), curPieceNode);
          // during an animation we render a temporary 'captured' piece
          // make sure there is no captured piece already (may happen with promotion)
          capturedEls = capturedEls || squareNode.getElementsByClassName('captured');
          if (captured && !capturedEls[0]) {
            squareNode.appendChild(renderCapturedDom(captured));
          }
        }
      } // empty square before: just put the piece
      else {
        squareNode.appendChild(renderPieceDom(renderPiece(ctrl, key, piece)));
      }
    } // no piece at this square
    else {
      // remove any piece that was here
      while (squareNode.firstChild) squareNode.removeChild(squareNode.firstChild);
    }
  }
}

function pieceClass(p) {
  return p.role + ' ' + p.color;
}

function renderPiece(ctrl, key, p) {
  var animation;
  var draggable = ctrl.data.draggable.current;
  var dragging = draggable.orig === key && draggable.started;
  if (ctrl.data.animation.current.anims) {
    animation = ctrl.data.animation.current.anims[key];
  }
  var attrs = {
    style: {},
    className: pieceClass(p),
    cgRole: p.role,
    cgColor: p.color,
    oncreate: function(vnode) {
      var el = vnode.dom;
      el.cgRole = p.role;
      el.cgColor = p.color;
      if (dragging) p.cgDragging = true;
      else if (animation) p.cgAnimating = true;
    }
  };
  if (dragging) {
    attrs.style[util.transformProp()] = util.translate([
      draggable.pos[0] + draggable.dec[0],
      draggable.pos[1] + draggable.dec[1]
    ]);
    attrs.className += ' dragging';
  }
  else if (animation) attrs.style[util.transformProp()] = util.translate(animation[1]);
  return Vnode(
    'piece',
    null,
    attrs,
    undefined,
    undefined,
    undefined
  );
}

function renderPieceDom(vdom) {
  var p = document.createElement('piece');
  var trans = vdom.attrs.style[util.transformProp()];
  p.className = vdom.attrs.className;
  p.cgRole = vdom.attrs.cgRole;
  p.cgColor = vdom.attrs.cgColor;
  if (trans) {
    p.style[util.transformProp()] = trans;
    if (p.className.indexOf('dragging') === -1) {
      p.cgAnimating = true;
    }
  }
  return p;
}

function renderCapturedDom(p) {
  var cap = document.createElement('piece');
  cap.className = pieceClass(p) + ' captured';
  cap.cgCaptured = true;
  return cap;
}

function squareClass(ctrl, key, piece) {
  var d = ctrl.data;
  return key + ' ' + util.classSet({
    'selected': d.selected === key,
    'check': d.highlight.check && d.check === key,
    'last-move': d.highlight.lastMove && util.contains2(d.lastMove, key),
    'move-dest': d.movable.showDests && util.containsX(d.movable.dests[d.selected], key),
    'premove-dest': d.premovable.showDests && util.containsX(d.premovable.dests, key),
    'current-premove': key === d.predroppable.current.key || util.contains2(d.premovable.current, key),
    'occupied': !!piece,
    'exploding': ctrl.vm.exploding && ctrl.vm.exploding.indexOf(key) !== -1
  });
}

function renderSquare(ctrl, pos, asWhite) {
  var file = util.files[pos[0] - 1];
  var rank = pos[1];
  var key = file + rank;
  var piece = ctrl.data.pieces[key];
  var bpos = util.boardpos(pos, asWhite);
  var attrs = {
    className: squareClass(ctrl, key, piece),
    style: {
      left: bpos.left + '%',
      bottom: bpos.bottom + '%'
    },
    oncreate: function(vnode) {
      ctrl.data.squareEls[key] = vnode.dom;
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
  return Vnode(
    'square',
    key,
    attrs,
    children,
    undefined,
    undefined
  );
}

function renderMinimalDom(ctrl, asWhite) {
  var children = [];
  if (ctrl.data.lastMove) ctrl.data.lastMove.forEach(function(key) {
    var pos = util.key2pos(key);
    var bpos = util.boardpos(pos, asWhite);
    var attrs = {
      className: 'last-move',
      style: {
        left: bpos.left + '%',
        bottom: bpos.bottom + '%'
      }
    };
    var node = Vnode('square', null, attrs, undefined, undefined, undefined);
    children.push(node);
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
      className: pieceClass(ctrl.data.pieces[key])
    };
    children.push({
      tag: 'piece',
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

function bindEvents(ctrl, el) {
  var onstart = drag.start.bind(undefined, ctrl.data);
  var onmove = drag.move.bind(undefined, ctrl.data);
  var onend = drag.end.bind(undefined, ctrl.data);
  var oncancel = drag.cancel.bind(undefined, ctrl.data);
  if (!ctrl.data.viewOnly) {
    el.addEventListener('touchstart', onstart);
    el.addEventListener('touchmove', onmove);
    el.addEventListener('touchend', onend);
    el.addEventListener('touchcancel', oncancel);
  }
}
