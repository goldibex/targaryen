
'use strict';

var extend = require('extend'),
  initialCommitTime = new Date('Tue Dec 23 2014 18:35:40 GMT+0000 (GMT)').getTime();

function RuleDataSnapshot(data, path) {

  if (typeof path === 'string' && path.charAt(0) === '/') {
    // remove any leading slash from the snapshot, it screws us up downstream
    path = path.slice(1);
  }

  this._data = data;
  this._path = path;

}

RuleDataSnapshot.now = function() {
  return initialCommitTime;
}

RuleDataSnapshot.convert = function(data) {

  return (function firebaseify(node) {

    if (typeof node !== 'object' || node === null) {

      return {
        '.value': node,
        '.priority': null
      };

    } else if (node.hasOwnProperty('.value')) {
      return node;
    } else if (node.hasOwnProperty('.sv')) {

      // server value. right now that just means timestamp
      if (node['.sv'] === 'timestamp') {

        return {
          '.value': RuleDataSnapshot.now(),
          '.priority': node.hasOwnProperty('.priority') ? node['.priority'] : null
        };

      } else {
        throw new Error('Unrecognized server value "' + node['.sv'] + '"');
      }

    } else {

      var newObj = {
        '.priority': node.hasOwnProperty('.priority') ? node['.priority'] : null
      };

      Object.keys(node).forEach(function(key) {
        if (key != '.priority') {
          newObj[key] = firebaseify(node[key]);
        }
      });

      return newObj;

    }

  })(data);

};


RuleDataSnapshot.prototype.merge = function(other) {
  if (this._path || other._path) {
    throw new Error('can only merge top-level RuleDataSnapshots');
  }

  var data = extend(true, {}, this._data, other._data);
  return new RuleDataSnapshot(data);
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

  var rawVal = this._getVal();

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

  })(rawVal);

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
