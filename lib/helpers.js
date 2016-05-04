'use strict';

var RuleDataSnapshot = require('./rule-data-snapshot');

exports.pathSplitter = function(path) {

  if (path[0] === '/') {
    path = path.substr(1);
  }

  return path.split('/');
};

exports.makeNewDataSnap = function(path, newData) {

  path = path.replace(/^\/+/, '');
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
