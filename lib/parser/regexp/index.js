'use strict';

const nearley = require('nearley');
const grammar = require('./parser');

const MAIN_CTX = 'main';
const SET_CTX = 'set';

exports.from = function(source, flags) {
  const results = exports.parse(source);

  if (flags && flags !== 'i') {
    throw new Error(`Unsupported RegExp flags ${flags}.`);
  }

  return new RegExp(render(results[0], MAIN_CTX), flags);
};

exports.parse = function(source) {
  const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));

  return parser.feed(source).finish();
};

function render(ast, context) {
  const renderer = node => render(node, context);

  switch (ast.type) {
  case 'concatenation':
    return ast.concatenation.map(renderer).join('');

  case 'codePoint':
  case 'char':
    return escape(ast.value, context);

  case 'number':
  case 'charset':
    return ast.value;

  case 'endAnchor':
    return '$';

  case 'group':
    return `(${renderer(ast.group)})`;

  case 'range':
    return `${renderer(ast.start)}-${renderer(ast.end)}`;

  case 'repeat':
    return renderRepeat(ast);

  case 'series':
    return `${renderer(ast.pattern)}${renderer(ast.repeat)}`;

  case 'set':
    return ast.include ?
      `[${ast.include.map(node => render(node, SET_CTX)).join('')}]` :
      `[^${ast.exclude.map(node => render(node, SET_CTX)).join('')}]`;

  case 'startAnchor':
    return '^';

  case 'union':
    return ast.branches.map(renderer).join('|');

  default:
    throw new Error(`unknown regexp node type ("${ast.type}").`);
  }
}

const SPECIAL = new Map([
  [MAIN_CTX, new Set('+*?^$.|()[]{}\\')],
  [SET_CTX, new Set(']')]
]);

function escape(value, context) {
  const special = SPECIAL.get(context);

  return special != null && special.has(value) ? `\\${value}` : value;
}

function renderRepeat(ast) {
  const min = ast.min;
  const max = ast.max;

  switch (max) {
  case min:
    return `{${min}}`;

  case Infinity:
    return min > 1 ?
    `{${min},}` :
      min === 0 ? '*' : '+';

  case 1:
    return '?';

  default:
    return `{${min},${max}}`;
  }

}
