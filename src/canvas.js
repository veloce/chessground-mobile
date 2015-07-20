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

function clearSquare(key, bounds, asWhite, ctx) {
  var pos = squarePos(key, bounds, asWhite);
  ctx.clearRect(pos.x, pos.y, pos.width, pos.height);
}

function drawSquare(key, bounds, asWhite, color, ctx) {
  var pos = squarePos(key, bounds, asWhite);
  ctx.fillStyle = color;
  ctx.fillRect(pos.x, pos.y, pos.width, pos.height);
}

function drawLights(data, prevState) {
  var canvas = document.getElementById('cg-lights');
  var ctx = canvas.getContext('2d');
  var asWhite = data.orientation === 'white';

  if (data.selected)
    drawSquare(data.selected, data.bounds, asWhite, 'rgb(20, 85, 30)', ctx);
  if (prevState.selected && prevState.selected !== data.selected)
    clearSquare(prevState.selected, data.bounds, asWhite, ctx);
}

module.exports = drawLights;
