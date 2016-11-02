
'use strict';

const helpers = require('./util');
const util = require('util');

exports.util = helpers;

// Deprecate direct access to plugin helpers
Object.defineProperties(exports, [
  'setFirebaseData',
  'setFirebaseRules',
  'setDebug',
  'users'
].reduce((props, key) => {
  props[key] = {
    get: util.deprecate(
      () => helpers[key],
      `Deprecated: use "chai.${key}" or "jasmine.${key}" directly.`
    ),
    enumerable: true,
    configurable: true
  };

  return props;
}, {}));

// Deprecate direct access to plugins
Object.defineProperties(exports, [
  'chai',
  'jasmine'
].reduce((props, key) => {
  const path = `./plugins/${key}`;

  props[key] = {
    get: util.deprecate(
      () => require(path),
      `Deprecated: use "const ${key} = require('targaryen/plugins/${key}');"`
    ),
    enumerable: true,
    configurable: true
  };

  return props;
}, {}));
