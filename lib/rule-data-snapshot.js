
'use strict';

var extend = require('extend');

function RuleDataSnapshot(data, path) {
  this._data = data;
  this._path = path;
}

RuleDataSnapshot.prototype._getVal = function() {

  var pathParts;
  if (this._path) {
    pathParts = this._path.split('/');
  } else {
    pathParts = [];
  }

  return (function traverse(tree) {

    var nextKey;
    if ( (nextKey = pathParts.shift()) ) {

      if (tree.hasOwnProperty(nextKey)) {
        return traverse(tree[nextKey]);
      } else {
        return {
          '.value': null,
          '.priority': null
        };
      }

    } else {

      // end of the line
      if (tree) {
        return extend({}, tree);
      } else {
        return {
          '.value': null,
          '.priority': null
        };
      }

    }

  })(this._data);

};

RuleDataSnapshot.prototype.val = function() {

  return (function traverse(rawData) {

    if (rawData.hasOwnProperty('.value')) {
      return rawData['.value'];
    } else {

      var value = {};
      Object.keys(rawData)
      .filter(function(k) { return k.charAt(0) !== '.'; })
      .forEach(function(key) {
        value[key] = traverse(rawData[key]);
      });

      return value;

    }

  })(this._getVal());

};

RuleDataSnapshot.prototype.getPriority = function() {
  return this._getVal()['.priority'];
};

RuleDataSnapshot.prototype.exists = function() {
  return this.val() !== null;
};

RuleDataSnapshot.prototype.child = function(childPath) {
  var newPath;
  if (this._path) {
    newPath = [this._path, childPath].join('/');
  } else {
    newPath = childPath;
  }
  return new RuleDataSnapshot(this._data, newPath);
};

RuleDataSnapshot.prototype.parent = function() {

  if (this._path) {
    var parentPath = this._path.split('/').slice(0, -1).join('/');
    return new RuleDataSnapshot(this._data, parentPath);
  } else {
    return null;
  }

};

RuleDataSnapshot.prototype.hasChild = function(name) {
  return this.child(name).exists();
};

RuleDataSnapshot.prototype.hasChildren = function(names) {

  if (names !== undefined && !Array.isArray(names)) {
    throw new Error('Non-array value supplied to hasChildren');
  }

  if (names === undefined) {
    return Object.keys(this._getVal()).filter(function(key) {
      return key.charAt(0) !== '.';
    }).length > 0;

  } else {

    return names.every(function(name) {
      return this.child(name).exists();
    }, this);

  }

};

RuleDataSnapshot.prototype.isNumber = function() {
  return typeof this.val() === 'number';
};

RuleDataSnapshot.prototype.isString = function() {
  return typeof this.val() === 'string';
};

RuleDataSnapshot.prototype.isBoolean = function() {
  return typeof this.val() === 'boolean';
};


module.exports = RuleDataSnapshot;
