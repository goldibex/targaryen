
'use strict';

const helpers = require('./helpers');
const primitives = new Set(['string', 'number', 'boolean']);
const invalidChar = ['.', '$', '[', ']', '#', '/'];

/**
 * Test the value is plain object.
 *
 * @param  {any} value Value to test
 * @return {boolean}
 */
function isObject(value) {
  return value && (typeof value === 'object') && value.constructor === Object;
}

/**
 * Test the value is a primitive value supported by Firebase.
 *
 * @param  {any} value Value to test
 * @return {boolean}
 */
function isPrimitive(value) {
  return primitives.has(typeof value);
}

/**
 * Test the name is valid key name.
 *
 * @param  {string}  key Key name to test
 * @return {boolean}
 */
function isValidKey(key) {
  return !invalidChar.some(c => key.includes(c));
}

/**
 * Test the value is a server value.
 *
 * @param  {object}  value Value to test
 * @return {boolean}
 */
function isServerValue(value) {
  return isObject(value) && value['.sv'] !== undefined;
}

/**
 * Convert a server value.
 *
 * @param  {object} value Value to convert
 * @param  {number} now   Operation current timestamp
 * @return {number}
 */
function convertServerValue(value, now) {
  if (value['.sv'] !== 'timestamp') {
    throw new Error(`invalid server value type "${value}".`);
  }

  return now;
}

// DataNode private property keys.
const valueKey = Symbol('.value');
const priorityKey = Symbol('.priority');
let nullNode;

/**
 * A DataNode contains the priority of a node, and its primitive value or
 * the node children.
 */
class DataNode {

  /**
   * DataNode constructor.
   *
   * The created node will be frozen.
   *
   * @param  {object} value The node value
   * @param  {number} now   The current update timestamp
   */
  constructor(value, now) {
    this[priorityKey] = value['.priority'];
    this[valueKey] = value['.value'];

    const keys = value['.value'] === undefined ? Object.keys(value) : [];

    keys.filter(isValidKey).forEach(key => {
      const childNode = DataNode.from(value[key], undefined, now);

      if (childNode.$isNull()) {
        return;
      }

      this[key] = childNode;
    });

    if (this[valueKey] === undefined && Object.keys(this).length === 0) {
      this[valueKey] = null;
    }

    Object.freeze(this);
  }

  /**
   * Create a DataNode representing a null value.
   *
   * @return {DataNode}
   */
  static null() {
    if (!nullNode) {
      nullNode = new DataNode({'.value': null});
    }

    return nullNode;
  }

  /**
   * Create a DataNode from a compatible value.
   *
   * The value can be primitive value supported by Firebase, an object in the
   * Firebase data export format, a plain object, a DataNode or a mix of them.
   *
   * @param  {any}    value      The node value
   * @param  {any}    [priority] The node priority
   * @param  {number} [now]      The current update timestamp
   * @return {DataNode}
   */
  static from(value, priority, now) {

    if (value instanceof DataNode) {
      return value;
    }

    if (value == null || value['.value'] === null) {
      return DataNode.null();
    }

    if (isPrimitive(value)) {
      return new DataNode({'.value': value, '.priority': priority});
    }

    if (!isObject(value)) {
      throw new Error(`Invalid data node type: ${value} (${typeof value})`);
    }

    priority = priority || value['.priority'];

    if (isPrimitive(value['.value'])) {
      return new DataNode({'.value': value['.value'], '.priority': priority});
    }

    now = now || Date.now();

    if (isServerValue(value)) {
      return new DataNode({'.value': convertServerValue(value, now), '.priority': priority});
    }

    return new DataNode(
      Object.assign({}, value, {'.priority': priority, '.value': undefined}),
      now
    );
  }

  /**
   * Returns the node priority.
   *
   * @return {any}
   */
  $priority() {
    return this[priorityKey];
  }

  /**
   * Returns the node value of a primitive or a plain object.
   *
   * @return {any}
   */
  $value() {
    if (this[valueKey] !== undefined) {
      return this[valueKey];
    }

    return Object.keys(this).reduce(
      (acc, key) => Object.assign(acc, {[key]: this[key].$value()}),
      {}
    );
  }

  /**
   * Returns true if the node represent a null value.
   *
   * @return {boolean}
   */
  $isNull() {
    return this[valueKey] === null;
  }

  /**
   * Returns true if the the node represent a primitive value (including null).
   *
   * @return {boolean} [description]
   */
  $isPrimitive() {
    return this[valueKey] !== undefined;
  }

  /**
   * Yield every child nodes.
   *
   * The callback can return true to cancel descending down a branch. Sibling
   * nodes would still get yield.
   *
   * @param  {string}   path Path to the current node
   * @param  {function(path: string, parentPath: string, nodeKey: string): boolean} cb  Callback receiving a node path
   */
  $walk(path, cb) {
    Object.keys(this).forEach(key => {
      const nodePath = helpers.pathMerger(path, key);
      const stop = cb(nodePath, path, key);

      if (stop) {
        return;
      }

      this[key].$walk(nodePath, cb);
    });
  }

}

/**
 * Hold the data and the timestamp of its last update.
 */
class Database {

  /**
   * Database constructor.
   *
   * Takes a node tree, a plain object or Firebase export data format.
   *
   * It returns an immutable object.
   *
   * @param  {any}    value The database data
   * @param  {number} [now] The database current timestamps
   */
  constructor(value, now) {

    this.timestamp = now || Date.now();
    this.root = DataNode.from(value, undefined, this.timestamp);

    Object.freeze(this);

  }

  /**
   * Returns a RuleDataSnapshot containing data from a database location.
   *
   * @param  {string} path The database location
   * @return {RuleDataSnapshot}
   */
  snapshot(path) {
    return new RuleDataSnapshot(this, path);
  }

  /**
   * Returns a DataNode at a database location.
   *
   * @param  {string} path The DataNode location
   * @return {DataNode}
   */
  get(path) {
    return helpers.pathSplitter(path).reduce(
      (parent, key) => parent[key] || DataNode.null(),
      this.root
    );
  }

  /**
   * Return a copy of the database with the data replaced at the path location.
   *
   * @param  {string} path       The data location
   * @param  {any}    value      The replacement value
   * @param  {any}    [priority] The node priority
   * @param  {number} [now]      This update timestamp
   * @return {Database}
   */
  set(path, value, priority, now) {

    path = helpers.trim(path);
    now = now || Date.now();

    if (!path) {
      return new Database(value, now);
    }

    const newNode = DataNode.from(value, priority, now);

    if (newNode.$isNull()) {
      return this.remove(path, now);
    }

    const newRoot = {};
    let currSrc = this.root;
    let currDest = newRoot;

    helpers.pathSplitter(path).forEach((key, i, pathParts) => {

      const siblings = Object.keys(currSrc).filter(k => k !== key);
      const isLast = pathParts.length - i === 1;

      siblings.forEach(k => (currDest[k] = currSrc[k]));

      currSrc = currSrc[key] || {};

      currDest[key] = isLast ? newNode : {};
      currDest = currDest[key];

    });

    return new Database(newRoot, now);

  }

  /**
   * Return a copy of the database with the data removed at the path location.
   *
   * The node itself should be removed and any parent node becoming null as
   * a result.
   *
   * @param  {string} path Data location to remove
   * @param  {number} now  This operation timestamp
   * @return {Database}
   */
  remove(path, now) {

    path = helpers.trim(path);

    if (!path) {
      return new Database(null, now);
    }

    const newRoot = {};
    let currSrc = this.root;
    let dest = () => newRoot;

    helpers.pathSplitter(path).every((key) => {
      const siblings = Object.keys(currSrc).filter(k => k !== key);

      // If the path doesn't exist from this point,
      // or the only item is the one to remove,
      // abort iteration.
      if (siblings.length === 0) {
        return false;
      }

      // Or copy other items
      const currDest = dest();

      siblings.forEach(k => (currDest[k] = currSrc[k]));

      currSrc = currSrc[key];

      // We will only create the next level if there's anything to copy.
      dest = () => (currDest[key] = {});

      return true;

    });

    return new Database(newRoot, now || Date.now());

  }

  /**
   * Walk each child nodes from the path and yield each of them as snapshot.
   *
   * The callback can returns true to cancel yield of the child value of the
   * currently yield snapshot.
   *
   * @param  {string}   path starting node path (doesn't get yield).
   * @param  {function(snap: RuleDataSnapshot): boolean} cb   Callback receiving a snapshot.
   */
  walk(path, cb) {
    this.get(path).$walk(path, nodePath => cb(this.snapshot(nodePath)));
  }

}

// RuleDataSnapshot private property keys.
const dataKey = Symbol('data');
const pathKey = Symbol('path');
const nodeKey = Symbol('node');

/**
 * A DataSnapshot contains data from a database location.
 */
class RuleDataSnapshot {

  /**
   * RuleDataSnapshot constructor.
   *
   * It returns an immutable object.
   *
   * @param  {Database} data A Database object representing the database at a specific time
   * @param  {string}   path Path to the data location
   */
  constructor(data, path) {
    this[dataKey] = data;
    this[pathKey] = helpers.trim(path);
  }

  /**
   * Private getter to the DataNode at that location.
   *
   * The Data is only retrieved if needed.
   *
   * @type {DataNode}
   */
  get [nodeKey]() {
    return this[dataKey].get(this[pathKey]);
  }

  /**
   * Returns the data.
   *
   * @todo check how Firebase behave when the node is not a Primitive value.
   * @return {object|string|number|boolean|null}
   */
  val() {
    return this[nodeKey].$value();
  }

  /**
   * Gets the priority value of the data in this DataSnapshot
   *
   * @return {string|number|null}
   */
  getPriority() {
    return this[nodeKey].$priority();
  }

  /**
   * Returns true if this DataSnapshot contains any data.
   *
   * @return {boolean}
   */
  exists() {
    return this[nodeKey].$isNull() === false;
  }

  /**
   * Gets another DataSnapshot for the location at the specified relative path.
   *
   * @param  {string} childPath Relative path from the node to the child node
   * @return {RuleDataSnapshot}
   */
  child(childPath) {
    const newPath = helpers.pathMerger(this[pathKey], childPath);

    return new RuleDataSnapshot(this[dataKey], newPath);
  }

  /**
   * Returns a RuleDataSnapshot for the node direct parent.
   *
   * @return {RuleDataSnapshot}
   */
  parent() {
    if (!this[pathKey]) {
      return null;
    }

    const path = this[pathKey].split('/').slice(0, -1).join('/');

    return new RuleDataSnapshot(this[dataKey], path);
  }

  /**
   * Returns true if the specified child path has (non-null) data
   *
   * @param  {string}  path Relative path to child node.
   * @return {boolean}
   */
  hasChild(path) {
    return this.child(path).exists();
  }

  /**
   * Tests the node children existence.
   *
   * If no path list if provided, it tests if the node has any children.
   *
   * @param  {array}   [paths] Optional non-empty array of relative path to children to test.
   * @return {boolean}
   */
  hasChildren(paths) {
    const node = this[nodeKey];

    if (node.$isPrimitive()) {
      return false;
    }

    if (!paths) {
      return Object.keys(node).length > 0;
    }

    if (!paths.length) {
      throw new Error('`hasChildren()` requires a non empty array.');
    }

    return paths.every(path => this.hasChild(path));
  }

  /**
   * Returns true the node represent a number.
   *
   * @return {boolean}
   */
  isNumber() {
    const val = this[nodeKey].$value();

    return typeof val === 'number';
  }

  /**
   * Returns true the node represent a string.
   *
   * @return {boolean}
   */
  isString() {
    const val = this[nodeKey].$value();

    return typeof val === 'string';
  }

  /**
   * Returns true the node represent a boolean.
   *
   * @return {boolean}
   */
  isBoolean() {
    const val = this[nodeKey].$value();

    return typeof val === 'boolean';
  }

  /**
   * Return the snapshot path.
   *
   * @return {string}
   */
  toString() {
    return this[pathKey];
  }

}

/**
 * Create a new Database.
 *
 * It Takes a plain object or Firebase export data format.
 *
 * @param  {any}                                        data    The initial data
 * @param  {{path: string, priority: any, now: number}} options Data conversion options.
 * @return {[type]}         [description]
 */
exports.create = function(data, options) {
  options = options || {};

  if (!options.path || options.path === '/') {
    return new Database(data, options.now);
  }

  const root = new Database(null);

  return root.set(options.path, data, options.priority, options.now);
};

/**
 * Create a snapshot to a database value.
 *
 * Meant to help transition of the tests to version 3.
 *
 * @param  {string} path  Snapshot location
 * @param  {any}    value Snapshot value
 * @param  {number} now   Timestamp for server value conversion
 * @return {RuleDataSnapshot}
 */
exports.snapshot = function(path, value, now) {
  const data = exports.create(value, {now, path});

  return new RuleDataSnapshot(data);
};
