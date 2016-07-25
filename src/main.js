var m = require('mithril');
var ctrl = require('./ctrl');
var view = require('./view');
var api = require('./api');

function render(element, controller) {
  m.render(element, [view(controller)]);
}

// for usage outside of mithril
function init(element, config) {

  var controller = new ctrl(config);

  render(element, controller);

  return api(controller);
}

module.exports = init;
module.exports.render = render;
module.exports.controller = ctrl;
module.exports.fen = require('./fen');
module.exports.util = require('./util');
module.exports.configure = require('./configure');
module.exports.anim = require('./anim');
module.exports.board = require('./board');
module.exports.drag = require('./drag');
