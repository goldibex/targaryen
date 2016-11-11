/**
 * Simulate read / write / update operations against a rule set, an initial data
 * tree and the current user state.
 *
 */

'use strict';

const paths = require('./paths');
const store = require('./store');
const ruleset = require('./ruleset');
const results = require('./results');

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
   * @param  {{rules: object}} rules Firebase rule definition.
   * @param  {any}             data The database data.
   * @param  {object|null}     auth  Current user auth data.
   * @param  {number}          [now] The database current timestamps
   */
  constructor(rules, data, auth, now) {

    now = now || Date.now();

    this.rules = ruleset.create(rules);
    this.root = store.create(data, {now: this.timestamp});
    this.auth = auth || null;
    this.timestamp = now;

    Object.freeze(this);

  }

  /**
   * Copy and extend the current database with new value, rules or user.
   *
   * @param  {{rules: {rules: object}, data: any, auth: any, now: number}} updates Database attribute to replace.
   * @return {Database}
   */
  with(updates) {
    const attr = Object.assign({
      rules: this.rules,
      data: this.root,
      auth: this.auth
    }, updates);

    return new Database(attr.rules, attr.data, attr.auth, attr.now);
  }

  /**
   * returns a copy of the Database with new user data.
   *
   * @param  {object|null} auth New user data.
   * @return {Database}
   */
  as(auth) {
    return this.with({auth});
  }

  /**
   * Returns a RuleDataSnapshot containing data from a database location.
   *
   * @param  {string} path The database location
   * @return {RuleDataSnapshot}
   */
  snapshot(path) {
    return new RuleDataSnapshot(this.root, path);
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
    this.root.$child(path).$walk(path, nodePath => cb(this.snapshot(nodePath)));
  }

  /**
   * Simulate a read operation.
   *
   * @param  {string} path  Path to read
   * @param  {nuber}  [now] Operation current time stamp
   * @return {Result}
   */
  read(path, now) {
    return this.rules.tryRead(path, this, now);
  }

  /**
   * Return a copy of the data with replaced value at the path location.
   *
   * @param  {string} path       The location of the value to replace
   * @param  {any}    value      The replacement value
   * @param  {any}    [priority] The node priority
   * @param  {number} [now]      This update timestamp
   * @return {Result}
   */
  write(path, value, priority, now) {
    now = now || Date.now();

    const newRoot = this.root.$set(path, value, priority, now);
    const newData = this.with({data: newRoot, now});

    return this.rules.tryWrite(path, this, newData, value, now);
  }

  /**
   * Similate a patch (update) operation
   *
   * Update the database with the patch data and then test each updated
   * node could be written and is valid.
   *
   * It similar to a serie of write operation except that all changes happens
   * at once.
   *
   * @param  {string}      path  Path to the node to write
   * @param  {Database}    data  Database to edit
   * @param  {object}      patch Map of path/value to update the database.
   * @param  {object|null} auth  User data to simulate
   * @param  {number}      [now] Timestamp of the write operation
   * @return {{info: string, allowed: boolean}}
   */
  update(path, patch, now) {

    now = now || Date.now();

    let newRoot = this.root;

    const pathsToTest = Object.keys(patch).map(endPath => {
      const pathToNode = paths.join(path, endPath);

      newRoot = newRoot.$set(pathToNode, patch[endPath], undefined, now);

      return pathToNode;
    });

    const newData = this.with({data: newRoot, now});
    const writeResults = pathsToTest.map(
      p => this.rules.tryWrite(p, this, newData, patch, now)
    );

    return results.update(path, this, patch, writeResults);
  }

}

// RuleDataSnapshot private property keys.
const rootKey = Symbol('root');
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
   * @param  {DataNode} root A Database object representing the database at a specific time
   * @param  {string}   path Path to the data location
   */
  constructor(root, path) {
    this[rootKey] = root;
    this[pathKey] = paths.trim(path);
  }

  /**
   * Private getter to the DataNode at that location.
   *
   * The Data is only retrieved if needed.
   *
   * @type {DataNode}
   */
  get [nodeKey]() {
    return this[rootKey].$child(this[pathKey]);
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
    const newPath = paths.join(this[pathKey], childPath);

    return new RuleDataSnapshot(this[rootKey], newPath);
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

    return new RuleDataSnapshot(this[rootKey], path);
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
   * @param  {array}   [names] Optional non-empty array of relative path to children to test.
   * @return {boolean}
   */
  hasChildren(names) {
    const node = this[nodeKey];

    if (node.$isPrimitive()) {
      return false;
    }

    if (!names) {
      return Object.keys(node).length > 0;
    }

    if (!names.length) {
      throw new Error('`hasChildren()` requires a non empty array.');
    }

    return names.every(path => this.hasChild(path));
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
 * @param  {Ruleset|object}  rules DB's rule set
 * @param  {DataNode|object} data  DB's data
 * @param  {number}          [now] Last operation timestamp
 * @return {Database}
 */
exports.create = function(rules, data, now) {
  return new Database(rules, data, null, now);
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
  const db = new Database({rules: {}}, null);

  now = now || Date.now();

  return db
    .with({data: db.root.$set(path, value, undefined, now), now})
    .snapshot();

};
