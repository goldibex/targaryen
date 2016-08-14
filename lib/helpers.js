'use strict';

exports.trimLeft = function(path) {
  path = path || '';

  return path.replace(/^\/+/, '');
}

exports.trimRight = function(path) {
  path = path || '';

  return path.replace(/\/+$/, '');
}

exports.trim = function(path) {
  return exports.trimLeft(exports.trimRight(path));
}

exports.pathMerger = function(root, path) {
  root = exports.trim(root);
  path = exports.trimLeft(path);

  return root + '/' + path;
}

exports.pathSplitter = function(path) {
  return exports.trimLeft(path).split('/');
};

exports.makeNewDataSnap = function() {
  var RuleDataSnapshot = require('./rule-data-snapshot');

  console.log('makeNewDataSnap is deprecated. Use RuleDataSnapshot.create instead.');

  return RuleDataSnapshot.create.apply(null, arguments);
};
