# Chessground mobile

This is a fork of the [chessground](https://github.com/ornicar/chessground) project. The rendering code has been rewritten to get the best performance possible on mobile devices. Unnecessary features are removed as well.

## Dependencies

- [mithril.js](https://github.com/lhorie/mithril.js) - a minimalist virtual DOM library

## Installation

```
npm install --save veloce/chessground-mobile
```

### Usage

```js
var Chessground = require("chessground-mobile");

var ground = Chessground(document.body, options);
```

## Options

All options are, well, optional.

```js
{
  orientation: "white",   // board orientation (or view angle) "white" | "black"
  turnColor: "white",     // turn to play. "white" | "black"
  check: null,            // square currently in check "a2" | null
  lastMove: null,         // squares part of the last move ["c3", "c4"] | null
  selected: null,         // square currently selected "a1" | null
  coordinates: true,      // display board coordinates as square ::after elements
  viewOnly: false,        // don't bind events: the user will never be able to move pieces around
  minimalDom: false,      // don't use square elements. Optimization to use only with viewOnly
  highlight: {
    lastMove: true,       // add last-move class to squares
    check: true          // add check class to squares
  },
  animation: {
    enabled: true,        // enable piece animations, moving and fading
    duration: 200,        // animation duration in milliseconds
  },
  movable: {
    free: true,           // all moves are valid - board editor
    color: "both",        // color that can move. "white" | "black" | "both" | null
    dests: {},            // valid moves. {a2: ["a3", "a4"], b1: ["a3", "c3"]} | null
    dropOff: "revert",    // when a piece is dropped outside the board. "revert" | "trash"
    showDests: true,      // add the move-dest class to squares
    events: {
                          // called after the move has been played
      after: function(orig, dest, metadata) {}
    }
  },
  premovable: {
    enabled: true,        // allow premoves for color that can not move
    showDests: true,      // add the premove-dest class to squares
    current: null         // keys of the current saved premove ["e2", "e4"] | null
      events: {
                          // called after the premove has been set
        set: function(orig, dest) {},
                          // called after the premove has been unset
        unset: function() {}
      }
  },
  draggable: {
    enabled: true,        // allow moves & premoves to use drag'n drop
    distance: 3,          // minimum distance to initiate a drag, in pixels
    squareTarget: false,  // display big square target
    magnified: true       // whether the piece being dragged is magnified
    centerPiece: true,    // center the piece on cursor at drag start (only if magnified is true)
  },
  events: {
    move: function(orig, dest, capturedPiece) {},
  }
}
```

## A.P.I.

There are a few functions you can call on a Chessground instance:

### Setters

```js
// reconfigure the board with above options.
// Board will be animated accordingly, if animations are enabled.
ground.reconfigure(options);

// Sets dynamic options that changes during a game.
// Accepts: 'fen', 'orientation', 'turnColor', 'check', 'lastMove', 'dests',
// 'movableColor'.
// Board will be animated accordingly, if animations are enabled.
ground.set(options);

// sets the king of this color in check
// if no color is provided, the current turn color is used
ground.setCheck(color);

// change the view angle
ground.toggleOrientation();

// perform a move programmatically
ground.move("e2", "e4");

// add and/or remove arbitrary pieces on the board
ground.setPieces({a1: null, c5: {color: "black", role: "queen"}});

// play the current premove, if any
ground.playPremove();

// cancel the current premove, if any
ground.cancelPremove();

// cancel the current move being made
ground.cancelMove();

// cancels current move and prevent further ones
ground.stop();
```

### Getters

```js
// get the view angle
var orientation = ground.getOrientation();

// get pieces on the board
// {a1: {color: "white", role: "rook"}, b1: {color: "white", role: "knight"}}
var pieces = ground.getPieces();

// get the material difference between white and black
// {white: {pawn: 3 queen: 1}, black: {bishop: 2}}
var diff = ground.getMaterialDiff();

// get the current FEN position
// rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR
var fen = ground.getFen();
```

## Developers

### Build

```
npm install
gulp
```

Then open `examples/mobile.html` in your browser.
The examples are non exhaustive, but feel free to try things out by editing `index.html`.
