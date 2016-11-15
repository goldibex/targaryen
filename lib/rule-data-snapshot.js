
'use strict';

var merge = require('lodash.mergewith'),
    helpers = require('./helpers');

function literal(value, priority) {
  return {
    '.value': value,
     '.priority': priority !== undefined ? priority : null
  };
}

function isObject(obj) {
  return (
    obj &&
    typeof obj == 'object' &&
    obj.constructor === Object
  );
}

function isEmptyObj (obj) {
  if (!isObject(obj)) {
    return false;
  }

  const length = Object.keys(obj).length;

  return length === 0 || length === 1 && obj.hasOwnProperty('.priority');
}

function coerce(v) {
  return isEmptyObj(v) ? null : v;
}

function isNullNode(node) {
  return node == null || node['.value'] === null || isEmptyObj(node);
}

function prune(obj) {
  if (!isObject(obj)) {
    return obj;
  }

  const dest = Object.keys(obj).reduce(function(dest, key) {
    const value = prune(obj[key]);

    if (!isNullNode(value)) {
      dest[key] = value;
    }

    return dest;
  }, {});

  return isNullNode(dest) ? literal(null) : dest;
}

function RuleDataSnapshot(data, pathOrNow, path) {

  var now = pathOrNow;

  if (typeof now === 'string') {
    path = pathOrNow;
    now = Date.now();
  } else if (isNaN(now)) {
    now = Date.now();
  }

  if (typeof path === 'string' && path.charAt(0) === '/') {
    // remove any leading slash from the snapshot, it screws us up downstream
    path = path.slice(1);
  }

  this._data = data;
  this._timestamp = now;
  this._path = path;

}

RuleDataSnapshot.create = function(path, newData, now) {
  const empty = new RuleDataSnapshot();

  return empty.set(path, newData, now);
};

RuleDataSnapshot.convert = function(data, now) {

  return (function firebaseify(node, ts) {

    node = coerce(node);

    if (typeof node !== 'object' || node === null) {

      return literal(node);

    } else if (node.hasOwnProperty('.value')) {
      return node;
    } else if (node.hasOwnProperty('.sv')) {

      // server value. right now that just means timestamp
      if (node['.sv'] === 'timestamp') {

        return literal(ts, node['.priority']);

      } else {
        throw new Error('Unrecognized server value "' + node['.sv'] + '"');
      }

    } else {

      var newObj = {
        '.priority': node.hasOwnProperty('.priority') ? node['.priority'] : null
      };

      Object.keys(node).forEach(function(key) {
        if (key != '.priority') {
          newObj[key] = firebaseify(node[key], ts);
        }
      });

      return newObj;

    }

  })(data, now || Date.now());

};

RuleDataSnapshot.prototype.prune = function() {
  return new RuleDataSnapshot(prune(this._data), this._timestamp, this._path);
};

RuleDataSnapshot.prototype.merge = function(other) {
  if (this._path || other._path) {
    throw new Error('can only merge top-level RuleDataSnapshots');
  }

  var data = merge({}, this._data);

  data = merge(data, other._data, function customizer(oldNode, newNode) {
    var oldNodeIsLiteral = oldNode && oldNode['.value'] !== undefined;
    var newNodeIsLiteral = newNode && newNode['.value'] !== undefined;
    var oldPriority, hasNewPriority;

    if (!oldNodeIsLiteral && !newNodeIsLiteral) {
      // let lodash.mergeWith merge old and new node.
      return undefined;
    }

    oldPriority = oldNode && oldNode['.priority'];
    hasNewPriority = newNode && newNode.hasOwnProperty('.priority');

    if (hasNewPriority || oldPriority == null) {
      // replace the old node (no merge).
      return merge({}, newNode);
    }

    // replace the old node but preserve its priority
    return merge({'.priority': oldPriority}, newNode);
  });

  return new RuleDataSnapshot(prune(data), other._timestamp);
};

RuleDataSnapshot.prototype.set = function(path, newData, now) {

  now = now || Date.now();
  path = helpers.trim(path);
  newData = RuleDataSnapshot.convert(newData, now);

  if (path.length === 0) {
    return new RuleDataSnapshot(prune(newData), now);
  }

  let data = merge({}, this._data);
  let currentNode = data;

  helpers.pathSplitter(path).forEach(function(key, i, pathParts) {
    const isLast = pathParts.length - i === 1;


    if (isLast) {
      const nodePriority = currentNode[key] && currentNode[key]['.priority'] || null;

      currentNode[key] = newData;
      currentNode[key]['.priority'] = nodePriority;

      return;
    }

    if (!currentNode[key] || currentNode[key].hasOwnProperty('.value')) {
      currentNode[key] = {};
    }

    currentNode = currentNode[key];
  });

  return new RuleDataSnapshot(prune(data), now)
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
        return literal(null);
      }

    } else {

      // end of the line
      if (tree) {
        return Object.assign({}, tree);
      } else {
        return literal(null);
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

  if (typeof childPath !== 'string') {
    throw new Error(`${childPath} should be a string.`);
  }

  if (this._path) {
    newPath = [this._path, childPath].join('/');
  } else {
    newPath = childPath;
  }
  return new RuleDataSnapshot(this._data, this._timestamp, newPath);
};


RuleDataSnapshot.prototype.parent = function() {

  if (this._path) {
    var parentPath = this._path.split('/').slice(0, -1).join('/');
    return new RuleDataSnapshot(this._data, this._timestamp, parentPath);
  } else {
    return null;
  }

};


RuleDataSnapshot.prototype.hasChild = function(name) {
  if (typeof name !== 'string') {
    throw new Error(`${name} should be a string.`);
  }

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
  }

  if (names.some(n => typeof n !== 'string')) {
    throw new Error(`${names} should be an array of string.`);
  }

  return names.every(function(name) {
    return this.child(name).exists();
  }, this);

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
