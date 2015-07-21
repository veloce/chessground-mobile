var util = require('./util');

function squarePos(key, bounds, asWhite) {
  var pos = util.key2pos(key);
  var squareW = bounds.width * 0.125;
  var x = (asWhite ? pos[0] - 1 : 8 - pos[0]) * squareW;
  var y = (asWhite ? 8 - pos[1] : pos[1] - 1) * squareW;
  return {
    x: x,
    y: y,
    width: squareW,
    height: squareW
  };
}

function clearSquare(pos, ctx) {
  ctx.clearRect(pos.x, pos.y, pos.width, pos.height);
}

function drawSquare(pos, color, ctx) {
  ctx.fillStyle = color;
  ctx.fillRect(pos.x, pos.y, pos.width, pos.height);
}

function drawPossibleDest(pos, ctx) {
  ctx.fillStyle = 'rgba(20,85,30,0.5)';
  var circle = new Path2D();
  var r = pos.width * 0.16;
  circle.arc(pos.x + pos.width / 2, pos.y + pos.width / 2, r, 0, Math.PI * 2, true);
  ctx.fill(circle);
}

function drawCheck(pos, ctx) {
  var r1 = pos.width * 0.7;
  var r2 = 1;
  var x = pos.x + pos.width / 2;
  var y = pos.y + pos.width / 2;
  var gradient = ctx.createRadialGradient(x, y, r1, x, y, r2);
  gradient.addColorStop(0, 'rgba(169, 0, 0, 0)');
  gradient.addColorStop(1, 'red');
  ctx.fillStyle = gradient;
  ctx.fillRect(pos.x, pos.y, pos.width, pos.height);
}

function drawLights(ctx, key, asWhite, data, prevState, isResize) {
  var isMoveDest = data.movable.showDests && util.containsX(data.movable.dests[data.selected], key);
  var wasMoveDest = data.movable.showDests && util.containsX(prevState.dests[prevState.selected], key);
  var isSelected = key === data.selected;
  var wasSelected = key === prevState.selected;
  var isLastMove = data.highlight.lastMove && util.contains2(data.lastMove, key);
  var wasLastMove = data.highlight.lastMove && util.contains2(prevState.lastMove, key);
  var isCheck = data.highlight.check && data.check === key;
  var wasCheck = data.highlight.check && prevState.check === key;

  var pos = squarePos(key, data.bounds, asWhite);

  // clear any prev state
  if (wasSelected || wasMoveDest || wasLastMove || wasCheck || isResize) {
    clearSquare(pos, ctx);
  }

  // highlight
  if (isSelected) {
    drawSquare(pos, 'rgba(216, 85, 0, 0.3)', ctx);
  }
  else if (isMoveDest) {
    drawPossibleDest(pos, ctx);
  }
  else if (isLastMove) {
    drawSquare(pos, 'rgba(155, 199, 0, 0.4)', ctx);
  }
  if (isCheck) {
    drawCheck(pos, ctx);
  }
}

module.exports = drawLights;
