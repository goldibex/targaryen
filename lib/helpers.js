'use strict';

var RuleDataSnapshot = require('./rule-data-snapshot');

function trimLeft(path) {
  path = path || '';

  return path.replace(/^\/+/, '');
}

function trimRight(path) {
  path = path || '';

  return path.replace(/\/+$/, '');
}

function trim(path) {
  return trimLeft(trimRight(path));
}

exports.pathMerger = function(root, path) {
  root = trim(root);
  path = trimLeft(path);

  return root + '/' + path;
}

exports.pathSplitter = function(path) {
  return trimLeft(path).split('/');
};

exports.makeNewDataSnap = function(path, newData) {

  path = trimLeft(path);
  newData = RuleDataSnapshot.convert(newData)

  var result;

  if (path.length === 0) {
    result = newData;
  } else {

    var workObject = {};
    result = workObject;

    exports.pathSplitter(path).forEach(function(pathPart, i, pathParts) {

      if (pathParts.length - i === 1) {
        workObject[pathPart] = newData;
      } else {
        workObject[pathPart] = {};
      }
      workObject = workObject[pathPart];

    });

  }

  return new RuleDataSnapshot(result);
};
