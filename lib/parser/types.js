/**
 * Type related helper methods.
 */

'use strict';

const primitives = new Set(['string', 'number', 'boolean', 'null', 'primitive']);

module.exports = {

  from(value) {
    if (value === null) {
      return 'null';
    }

    const type = typeof value;

    return type === 'object' ? value.constructor.name : type;
  },

  isString(type) {
    return type === 'string';
  },

  isNumber(type) {
    return type === 'number';
  },

  isBoolean(type) {
    return type === 'boolean';
  },

  isNull(type) {
    return type === 'null';
  },

  isPrimitive(type) {
    return primitives.has(type);
  },

  isRegExp(type) {
    return type === 'RegExp';
  },

  isFuzzy(type) {
    return type === 'any' || type === 'primitive';
  },

  maybeString(type) {
    return type === 'string' || module.exports.isFuzzy(type);
  },

  maybeNumber(type) {
    return type === 'number' || module.exports.isFuzzy(type);
  },

  maybeBoolean(type) {
    return type === 'boolean' || module.exports.isFuzzy(type);
  },

  maybeNull(type) {
    return type === 'null' || module.exports.isFuzzy(type);
  },

  maybePrimitive(type) {
    return primitives.has(type) || module.exports.isFuzzy(type);
  }
};
