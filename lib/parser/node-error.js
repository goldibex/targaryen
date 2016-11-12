
'use strict';

function nodeError(node, msg) {

  const err = new Error(node.original + ': ' + msg);

  err.name = 'ParseError';
  err.start = node.range[0];
  err.end = node.range[1];

  return err;

}

module.exports = nodeError;
