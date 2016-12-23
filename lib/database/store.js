/**
 * Create firebase data trees from various format.
 */

'use strict';

const paths = require('../paths');
const primitiveTypes = new Set(['string', 'number', 'boolean']);
const priorityTypes = new Set(['string', 'number']);
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
  return primitiveTypes.has(typeof value);
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
 * Test the priority is valid.
 *
 * It tests if it's either be a string or a number.
 *
 * @param  {any}  priority Value to test
 * @return {Boolean}
 */
function isValidPriority(priority) {
  return priorityTypes.has(typeof priority);
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

    if (this[priorityKey] != null && !isValidPriority(this[priorityKey])) {
      throw new Error(`Invalid node priority ${this[priorityKey]}`);
    }

    if (this[valueKey] != null && !isPrimitive(this[valueKey])) {
      throw new Error(`Invalid node value ${this[valueKey]}`);
    }

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

    if (!isObject(value) && !Array.isArray(value)) {
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
   * @return {boolean}
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
      const nodePath = paths.join(path, key);
      const stop = cb(nodePath, path, key);

      if (stop) {
        return;
      }

      this[key].$walk(nodePath, cb);
    });
  }

  /**
   * Return a child node.
   *
   * @param  {string} path to the child.
   * @return {DataNode}
   */
  $child(path) {
    return paths.split(path).reduce(
      (parent, key) => parent[key] || DataNode.null(),
      this
    );
  }

  /**
   * Return a copy of this node with the data replaced at the path location.
   *
   * @param  {string} path       The node location
   * @param  {any}    value      The replacement value
   * @param  {any}    [priority] The node priority
   * @param  {number} [now]      This update timestamp
   * @return {DataNode}
   */
  $set(path, value, priority, now) {

    path = paths.trim(path);
    now = now || Date.now();

    const newNode = DataNode.from(value, priority, now);

    if (!path) {
      return newNode;
    }

    if (newNode.$isNull()) {
      return this.$remove(path, now);
    }

    const copy = {};
    let currSrc = this;
    let currDest = copy;

    paths.split(path).forEach((key, i, pathParts) => {

      const siblings = Object.keys(currSrc).filter(k => k !== key);
      const isLast = pathParts.length - i === 1;

      siblings.forEach(k => {
        currDest[k] = currSrc[k];
      });

      currSrc = currSrc[key] || {};

      currDest[key] = isLast ? newNode : {};
      currDest = currDest[key];

    });

    return DataNode.from(copy, this.$priority(), now);

  }

  /**
   * Return a copy of this node with the data replaced at the path locations.
   *
   * @param  {string} path  A root location for all the node to update
   * @param  {object} patch Map of path (relative to the root location above) to their new data
   * @param  {number} [now] This update timestamp
   * @return {DataNode}
   */
  $merge(path, patch, now) {
    path = paths.trim(path);
    now = now || Date.now();

    return Object.keys(patch).reduce((node, endPath) => {
      const pathToNode = paths.join(path, endPath);

      return node.$set(pathToNode, patch[endPath], undefined, now);
    }, this);
  }

  /**
   * Return a copy of the node with node at the path location.
   *
   * Any parent of the removed node becoming null as a result should be removed.
   *
   * @param  {string} path Location to the node to remove
   * @param  {number} now  This operation timestamp
   * @return {DataNode}
   */
  $remove(path, now) {

    path = paths.trim(path);

    if (!path) {
      return DataNode.null();
    }

    const newRoot = {};
    let currSrc = this;
    let dest = () => newRoot;

    paths.split(path).every(key => {
      const siblings = Object.keys(currSrc).filter(k => k !== key);
      const currDest = dest();

      siblings.forEach(k => {
        currDest[k] = currSrc[k];
      });

      currSrc = currSrc[key];

      // We will only create the next level if there's anything to copy.
      dest = () => {
        currDest[key] = {};

        return currDest[key];
      };

      // we can abort the iteration if the branch node to remove doesn't exist.
      return currSrc !== undefined;
    });

    return DataNode.from(newRoot, this.$priority(), now || Date.now());

  }

}

/**
 * Create a new data tree.
 *
 * It Takes a plain object or Firebase export data format.
 *
 * @param  {any}                                        data    The initial data
 * @param  {{path: string, priority: any, now: number}} options Data conversion options.
 * @return {DataNode}
 */
exports.create = function(data, options) {
  options = options || {};

  if (!options.path || options.path === '/') {
    return DataNode.from(data, options.priority, options.now);
  }

  const root = DataNode.null();

  return root.$set(options.path, data, options.priority, options.now);
};
