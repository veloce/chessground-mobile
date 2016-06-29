var util = require('./util');

var initial = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';

var roles = {
  p: 'pawn',
  r: 'rook',
  n: 'knight',
  b: 'bishop',
  q: 'queen',
  k: 'king'
};

var letters = {
  pawn: 'p',
  rook: 'r',
  knight: 'n',
  bishop: 'b',
  queen: 'q',
  king: 'k'
};

function read(fen) {
  if (fen === 'start') fen = initial;
  var pieces = {};
  var space = fen.indexOf(' ');
  var first = space !== -1 ? fen.substr(0, space) : fen;
  var parts = first.split('/');
  for (var i = 0, len = parts.length; i < len; i++) {
    var row = parts[i];
    var x = 0;
    for (var j = 0, jlen = row.length; j < jlen; j++) {
      var v = row[j];
      if (v === '~') continue;
      var nb = parseInt(v, 10);
      if (nb) x += nb;
      else {
        x++;
        pieces[util.pos2key([x, 8 - i])] = {
          role: roles[v.toLowerCase()],
          color: v === v.toLowerCase() ? 'black' : 'white'
        };
      }
    }
  }

  return pieces;
}

function write(pieces) {
  return [8, 7, 6, 5, 4, 3, 2].reduce(
    function(str, nb) {
      return str.replace(new RegExp(Array(nb + 1).join('1'), 'g'), nb);
    },
    util.invRanks.map(function(y) {
      return util.ranks.map(function(x) {
        var piece = pieces[util.pos2key([x, y])];
        if (piece) {
          var letter = letters[piece.role];
          return piece.color === 'white' ? letter.toUpperCase() : letter;
        } else return '1';
      }).join('');
    }).join('/'));
}

module.exports = {
  initial: initial,
  read: read,
  write: write
};
