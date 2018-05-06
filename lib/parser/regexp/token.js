'use strict';

const _flatten = require('lodash.flatten');
const omit = require('lodash.omit');

exports.char = function(tokens) {
  const source = exports.create(tokens);

  return Object.assign(source, {
    type: 'char',
    value: source.value.slice(-1)
  });
};

exports.concatenation = function(tokens) {
  const filtered = flatten(tokens);

  if (filtered.length < 2) {
    return filtered[0];
  }

  return merge(
    filtered.map(tok => (tok.type === 'concatenation' ? tok.concatenation : tok)),
    'concatenation'
  );
};

exports.create = function(tokens) {
  const source = first(tokens);

  return source == null ?
    null :
    omit(source, ['col', 'line', 'lineBreaks', 'text', 'toString']);
};

exports.group = function(tokens) {
  return merge(tokens, {
    type: 'group',
    group: tokens[1]
  });
};

const RANGE_RE = /^(\\.|.)-(\\.|.)$/;
const MINUS_LENGTH = 1;

exports.range = function(tokens) {
  const range = first(tokens);

  if (range == null) {
    return null;
  }

  const parts = RANGE_RE.exec(range.value);

  if (parts == null) {
    return null;
  }

  const start = exports.char({value: parts[1], offset: range.offset});
  const end = exports.char({
    value: parts[2],
    offset: start.offset + start.value.length + MINUS_LENGTH
  });

  return merge(tokens, {type: 'range', start, end});
};

exports.rename = function(type) {
  return tokens => Object.assign(exports.create(tokens), {type});
};

exports.repeat = function(min, max) {
  return tokens => merge(tokens, {
    type: 'repeat',
    min: min == null ? 0 : parseInt(min, 10),
    max: max == null ? Infinity : parseInt(max, 10)
  });
};

exports.series = function(tokens) {
  const source = flatten(tokens);

  if (source == null) {
    return null;
  }

  if (source.length !== 2) {
    throw new Error('A series should have a pattern and a quantifier.');
  }

  const pattern = source[0];
  const repeat = source[1];

  if (pattern.type !== 'number' || pattern.value.length === 1) {
    return merge([pattern, repeat], {
      pattern,
      repeat,
      type: 'series'
    });
  }

  const partial = exports.concatenation(tail(pattern));
  const series = exports.series([partial.concatenation[1], repeat]);
  const number = partial.concatenation[0];

  return exports.concatenation([number, series]);
};

exports.set = function(include) {
  return tokens => merge(tokens, {
    type: 'set',
    include: include ? tokens[1] : null,
    exclude: include ? null : tokens[1]
  });
};

exports.union = function(tokens) {
  return merge(tokens, {
    type: 'union',
    branches: flatten([tokens[0], tokens[2]].map(tok => {
      switch (tok.type) {
      case 'union':
        return tok.branches;

      default:
        return tok;
      }
    }))
  });
};

function filter(tokens) {
  return tokens.filter(tok => tok != null);
}

function first(tokens) {
  return Array.isArray(tokens) ? flatten(tokens)[0] : tokens;
}

function flatten(tokens) {
  return filter(_flatten(tokens));
}

function merge(tokens, optionsOrType) {
  const flat = flatten(tokens);
  const ref = flat[0];

  if (ref == null) {
    return null;
  }

  const options = typeof optionsOrType === 'string' ?
    {type: optionsOrType, [optionsOrType]: flat} :
    optionsOrType;

  return Object.assign({
    offset: ref.offset,
    type: ref.type,
    value: flat.map(tok => tok.value).join('')
  }, options);
}

function tail(tokens) {
  const source = first(tokens);

  if (source == null) {
    return [null, null];
  }

  if (source.value.length < 2) {
    return [null, source];
  }

  const head = Object.assign({}, source, {value: source.value.slice(0, -1)});
  const tail = {
    type: 'char',
    value: source.value[source.value.length - 1],
    offset: head.offset + head.value.length
  };

  return [head, tail];
}
