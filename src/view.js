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
        ctrl.data.viewOnly ? 'view-only' : 'manipulable'
      ].join(' '),
      oncreate: function(vnode) {
        if (!ctrl.data.bounds) {
          ctrl.data.bounds = vnode.dom.getBoundingClientRect();
        }

        ctrl.data.scheduledAnimationFrame = false;

        ctrl.data.element = vnode.dom;
        ctrl.data.render = function() {
          ctrl.data.scheduledAnimationFrame = false;
          m.render(vnode.dom, renderContent(ctrl));
        };
        ctrl.data.renderRAF = function() {
          if (!ctrl.data.scheduledAnimationFrame) {
            ctrl.data.scheduledAnimationFrame = requestAnimationFrame(ctrl.data.render);
          }
        };

        bindEvents(ctrl, vnode.dom);

        ctrl.data.render();
      }
    },
    undefined,
    undefined,
    undefined
  );
};

function pieceClass(p, key) {
  return p.role + ' ' + p.color + ' p' + key;
}

function renderPiece(d, key, ctx) {
  var attrs = {
    style: {},
    class: pieceClass(d.pieces[key], key)
  };
  var translate = util.posToTranslate(util.key2pos(key), ctx.asWhite, ctx.bounds);
  var draggable = d.draggable.current;
  if (draggable.orig === key && draggable.started) {
    translate[0] += draggable.pos[0] + draggable.dec[0];
    translate[1] += draggable.pos[1] + draggable.dec[1];
    attrs.className += ' dragging';
    if (d.draggable.magnified) {
      attrs.className += ' magnified';
    }
  } else if (d.animation.current.anims) {
    var animation = d.animation.current.anims[key];
    if (animation) {
      translate[0] += animation[1][0];
      translate[1] += animation[1][1];
    }
  }
  attrs.style[ctx.transformProp] = util.translate(translate);
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
    class: classes,
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
    bounds: d.bounds,
    transformProp: util.transformProp()
  };
  var children = renderSquares(ctrl, ctx);
  if (d.animation.current.fadings) {
    d.animation.current.fadings.forEach(function(p) {
      children.push(renderFading(p, ctx));
    });
  }

  var keys = ctx.asWhite ? util.allKeys : util.invKeys;
  for (var i = 0; i < 64; i++) {
    if (d.pieces[keys[i]]) children.push(renderPiece(d, keys[i], ctx));
  }

  return children;
}

function renderFading(cfg, ctx) {
  var attrs = {
    className: 'fading ' + pieceClass(cfg.piece),
    style: {
      opacity: cfg.opacity
    }
  };
  attrs.style[ctx.transformProp] = util.translate(util.posToTranslate(cfg.piece.pos, ctx.asWhite, ctx.bounds));
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
  if (!ctrl.data.viewOnly) {
    el.addEventListener('touchstart', onstart);
    el.addEventListener('touchmove', onmove);
    el.addEventListener('touchend', onend);
    el.addEventListener('touchcancel', oncancel);
  }
}
