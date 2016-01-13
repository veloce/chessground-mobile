var board = require('./board');
var util = require('./util');
var hold = require('./hold');

function renderSquareTarget(data, cur) {
  var pos = util.key2pos(cur.over),
    width = cur.bounds.width,
    targetWidth = width / 4,
    squareWidth = width / 8,
    asWhite = data.orientation === 'white';
  var sq = document.createElement('div');
  var style = sq.style;
  var vector = [
    (asWhite ? pos[0] - 1 : 8 - pos[0]) * squareWidth,
    (asWhite ? 8 - pos[1] : pos[1] - 1) * squareWidth
  ];
  style.width = targetWidth + 'px';
  style.height = targetWidth + 'px';
  style.left = (-0.5 * squareWidth) + 'px';
  style.top = (-0.5 * squareWidth) + 'px';
  style[util.transformProp()] = util.translate(vector);
  sq.className = 'cg-square-target';
  data.element.appendChild(sq);
  return sq;
}

function fixDomAfterDrag(data) {
  if (data.element) {
    var dp = data.element.querySelector('.cg-piece.dragging');
    if (dp) {
      dp.classList.remove('dragging');
      dp.removeAttribute('style');
    }
    var sqs = data.element.getElementsByClassName('cg-square-target');
    while (sqs[0]) sqs[0].parentNode.removeChild(sqs[0]);
  }
}

function start(data, e) {
  if (e.button !== undefined && e.button !== 0) return; // only touch or left click
  if (e.touches && e.touches.length > 1) return; // support one finger touch only
  e.stopPropagation();
  e.preventDefault();
  var previouslySelected = data.selected;
  var position = util.eventPosition(e);
  var bounds = data.bounds;
  var orig = board.getKeyAtDomPos(data, position, bounds);
  var hadPremove = !!data.premovable.current;
  board.selectSquare(data, orig);
  var stillSelected = data.selected === orig;
  if (data.pieces[orig] && stillSelected && board.isDraggable(data, orig)) {
    var bpos = util.boardpos(util.key2pos(orig), data.orientation === 'white');
    data.draggable.current = {
      previouslySelected: previouslySelected,
      orig: orig,
      piece: data.pieces[orig],
      rel: position,
      epos: position,
      pos: [0, 0],
      dec: [
        position[0] - (bounds.left + (bounds.width * bpos.left / 100) + (bounds.width * 0.25) / 2),
        position[1] - (bounds.top + bounds.height - (bounds.height * bpos.bottom / 100) + 10)
      ],
      bounds: bounds,
      started: false,
      squareTarget: null,
      draggingPiece: e.target,
      originTarget: e.target,
      scheduledAnimationFrame: false
    };
    if (data.draggable.centerPiece) {
      data.draggable.current.dec[1] = position[1] - (bounds.top + bounds.height - (bounds.height * bpos.bottom / 100) - (bounds.height * 0.25) / 2);
    }
    hold.start();
  } else if (hadPremove) board.unsetPremove(data);
  data.renderRAF();
}

function processDrag(data) {
  if (data.draggable.current.scheduledAnimationFrame) return;
  data.draggable.current.scheduledAnimationFrame = true;
  requestAnimationFrame(function() {
    var cur = data.draggable.current;
    cur.scheduledAnimationFrame = false;
    if (cur.orig) {
      // if moving piece is gone, cancel
      if (data.pieces[cur.orig] !== cur.piece) {
        cancel(data);
        return;
      }

      // cancel animations while dragging
      if (data.animation.current.start &&
        Object.keys(data.animation.current.anims).indexOf(cur.orig) !== -1)
        data.animation.current.start = false;

      else if (cur.started) {
        cur.pos = [
          cur.epos[0] - cur.rel[0],
          cur.epos[1] - cur.rel[1]
        ];

        cur.over = board.getKeyAtDomPos(data, cur.epos, cur.bounds);
        if (cur.over && !cur.squareTarget) {
          cur.squareTarget = renderSquareTarget(data, cur);
        } else if (!cur.over && cur.squareTarget) {
          if (cur.squareTarget.parentNode) cur.squareTarget.parentNode.removeChild(cur.squareTarget);
          cur.squareTarget = null;
        }

        // move piece
        cur.draggingPiece.style[util.transformProp()] = util.translate([
          cur.pos[0] + cur.dec[0],
          cur.pos[1] + cur.dec[1]
        ]);

        // move square target
        if (cur.over && cur.squareTarget && cur.over !== cur.prevTarget) {
          var squareWidth = cur.bounds.width / 8,
          asWhite = data.orientation === 'white',
          stPos = util.key2pos(cur.over),
          vector = [
            (asWhite ? stPos[0] - 1 : 8 - stPos[0]) * squareWidth,
            (asWhite ? 8 - stPos[1] : stPos[1] - 1) * squareWidth
          ];
          cur.squareTarget.style[util.transformProp()] = util.translate(vector);
          cur.prevTarget = cur.over;
        }
      }
      processDrag(data);
    }
  });
}

function move(data, e) {
  if (e.touches && e.touches.length > 1) return; // support one finger touch only

  var cur = data.draggable.current;
  if (cur.orig) {
    data.draggable.current.epos = util.eventPosition(e);
    if (!cur.started && util.distance(cur.epos, cur.rel) >= data.draggable.distance) {
      cur.started = true;
      cur.draggingPiece.classList.add('dragging');
      processDrag(data);
    }
  }
}

function end(data, e) {
  var draggable = data.draggable;
  var orig = draggable.current ? draggable.current.orig : null;
  var dest;
  fixDomAfterDrag(data);
  if (!orig) return;
  // comparing with the origin target is an easy way to test that the end event
  // has the same touch origin
  if (e && e.type === 'touchend' && draggable.current.originTarget !== e.target) return;
  board.unsetPremove(data);
  if (draggable.current.started) {
    dest = draggable.current.over;
    if (orig !== dest) data.movable.dropped = [orig, dest];
    board.userMove(data, orig, dest);
    data.renderRAF();
  } else if (draggable.current.previouslySelected === orig) {
    board.setSelected(data, null);
    data.renderRAF();
  }
  draggable.current = {};
}

function cancel(data) {
  fixDomAfterDrag(data);
  if (data.draggable.current.orig) {
    data.draggable.current = {};
    board.selectSquare(data, null);
  }
}

module.exports = {
  start: start,
  move: move,
  end: end,
  cancel: cancel,
  processDrag: processDrag // must be exposed for board editors
};
