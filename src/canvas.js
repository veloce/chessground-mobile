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

function drawPossibleDest(pos, color, ctx) {
  ctx.fillStyle = color;
  var r = pos.width * 0.16;
  ctx.beginPath();
  ctx.arc(pos.x + pos.width / 2, pos.y + pos.width / 2, r, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.fill();
}

function drawPossibleDestOccupied(pos, color, ctx) {
  var r = (pos.width / 2) * 1.15;
  var x = pos.x + pos.width / 2;
  var y = pos.y + pos.width / 2;
  var gradient = ctx.createRadialGradient(x, y, r, x, y, 0);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.01, 'transparent');
  ctx.fillStyle = gradient;
  ctx.fillRect(pos.x, pos.y, pos.width, pos.height);
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

  var pos = squarePos(key, data.bounds, asWhite);

  // clear any prev state
  if (wasSelected || wasMoveDest || wasLastMove || wasCheck || wasPremove ||
    wasPremoveDest || isResize) {
    clearSquare(pos, ctx);
  }

  if (isSelected) {
    drawSquare(pos, 'rgba(216, 85, 0, 0.3)', ctx);
  }
  else if (isMoveDest) {
    if (occupied)
      drawPossibleDestOccupied(pos, 'rgba(20,85,30,0.5)', ctx);
    else
      drawPossibleDest(pos, 'rgba(20,85,30,0.5)', ctx);
  }
  else if (isLastMove) {
    drawSquare(pos, 'rgba(155, 199, 0, 0.4)', ctx);
  }
  else if (isPremove) {
    drawSquare(pos, 'rgba(20, 30, 85, 0.5)', ctx);
  }
  else if (isPremoveDest) {
    if (occupied)
      drawPossibleDestOccupied(pos, 'rgba(20, 30, 85, 0.5)', ctx);
    else
      drawPossibleDest(pos, 'rgba(20, 30, 85, 0.5)', ctx);
  }
  else if (isCheck) {
    drawCheck(pos, ctx);
  }
}

module.exports = drawLights;
