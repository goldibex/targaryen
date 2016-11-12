/**
 * Helpers for each operation type.
 */

'use strict';

/**
 * Hold an evaluation result.
 */
class Result {

  constructor(path, operationType, db, opts) {
    const isRead = operationType === 'read';

    opts = opts || {};

    if (!isRead && !opts.newDatabase) {
      throw new Error('The resulting database should be provided.');
    }

    this.path = path;
    this.auth = isRead ? db.auth : opts.newDatabase.auth;
    this.type = operationType;
    this.logs = [];
    this.readPermitted = !isRead;
    this.writePermitted = isRead;
    this.validated = true;
    this.database = db;
    this.newDatabase = opts.newDatabase;
    this.newValue = opts.newValue;
  }

  get allowed() {
    return this.readPermitted && this.writePermitted && this.validated;
  }

  get info() {
    let logs = this.logs
      .map(r => `/${r.path}: ${r.kind} "${r.rule}"\n    => ${r.result}`)
      .join('\n');

    if (this.allowed) {
      return `${logs}\n${this.type} was allowed.`;
    }

    if (!this.writePermitted) {
      logs += '\nNo .write rule allowed the operation.';
    }

    if (!this.readPermitted) {
      logs += '\nNo .read rule allowed the operation.';
    }

    if (!this.validated) {
      logs += '\nNo .validate rule allowed the operation.';
    }

    return `${logs}\n${this.type} was denied.`;
  }

  get root() {
    return this.database.snapshot('/');
  }

  get newRoot() {
    return this.newDatabase.snapshot('/');
  }

  get data() {
    return this.database.snapshot(this.path);
  }

  get newData() {
    return this.newDatabase.snapshot(this.path);
  }

  /**
   * Logs the evaluation result.
   *
   * @param {string}        path   The rule path
   * @param {string}        kind   The rule kind
   * @param {NodeRule}      rule   The rule
   * @param {boolean|Error} result The evaluation result
   */
  add(path, kind, rule, result) {
    this.logs.push({path, kind, result, rule: rule.toString()});

    const success = result instanceof Error ? false : result;

    switch (kind) {

    case 'validate':
      this.validated = this.validated && success;
      break;

    case 'write':
      this.writePermitted = this.writePermitted || success;
      break;

    case 'read':
      this.readPermitted = this.readPermitted || success;
      break;

    /* istanbul ignore next */
    default:
      throw new Error(`Unknown type: ${kind}`);

    }

  }

}

/**
 * Create the result for a read operation.
 *
 * @param  {string}      path Path to node to read
 * @param  {Database}    data Database to read
 * @return {Result}
 */
exports.read = function(path, data) {
  return new Result(path, 'read', data);
};

/**
 * Create the result for a write operation.
 *
 * @param  {string}      path         Path to node to write
 * @param  {Database}    data         Database to edit
 * @param  {Database}    newDatabase  Resulting database
 * @param  {any}         newValue     Value to edit with
 * @return {Result}
 */
exports.write = function(path, data, newDatabase, newValue) {
  return new Result(path, 'write', data, {newDatabase, newValue});
};

/**
 * Create the result for a patch operation from w serie of write evaluation
 * result.
 *
 * @param  {string}       path         Path to node to patch
 * @param  {Database}     data         Database to edit
 * @param  {object}       patch        Values to edit with
 * @param  {array}        writeResults List of write eveluation result to merge.
 * @return {Result}
 */
exports.update = function(path, data, patch, writeResults) {
  const result = new Result(path, 'patch', data, {newDatabase: data, newValue: patch});

  result.writePermitted = true;

  writeResults.forEach(r => {
    result.newDatabase = r.newDatabase;
    result.logs = result.logs.concat(r.logs);
    result.writePermitted = r.writePermitted && result.writePermitted;
    result.validated = r.validated && result.validated;
  });

  return result;
};
