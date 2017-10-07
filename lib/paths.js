/**
 * Paths helpers functions to avoid multiple path separator issues.
 */

'use strict';

const invalidChar = ['.', '#', '$', '[', ']'];

exports.isValid = function(path) {
  return invalidChar.some(char => path.includes(char)) === false;
};

exports.mustBeValid = function(path) {
  if (!exports.isValid(path)) {
    throw new Error(`Invalid location "${path}" contains one of [${invalidChar.join(', ')}]`);
  }
};

exports.trimLeft = function(path) {
  path = path || '';

  return path.replace(/^\/+/, '');
};

exports.trimRight = function(path) {
  path = path || '';

  return path.replace(/\/+$/, '');
};

exports.trim = function(path) {
  return exports.trimLeft(exports.trimRight(path));
};

exports.join = function(root, path) {
  root = exports.trim(root);
  path = exports.trimLeft(path);

  if (!root) {
    return path;
  }

  if (!path) {
    return root;
  }

  return root + '/' + path;
};

exports.split = function(path) {
  path = exports.trimLeft(path);

  if (!path) {
    return [];
  }

  return path.split('/');
};
