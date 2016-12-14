/**
 * Helpers for each operation type.
 */

'use strict';

const pad = require('../pad');

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
    this.permitted = false;
    this.validated = true;
    this.database = db;
    this.newDatabase = opts.newDatabase;
    this.newValue = opts.newValue;
  }

  get allowed() {
    return this.permitted && this.validated;
  }

  get info() {
    const logs = this.logs.map(r => {
      const header = `/${r.path}: ${r.kind} "${r.rule}"`;
      const result = r.error == null ? r.value : r.error;

      if (r.detailed == null) {
        return `${header}\n    => ${result}`;
      }

      return `${header}  => ${result}\n${pad.lines(r.detailed)}\n`;
    });

    if (this.allowed) {
      logs.push(`${this.type} was allowed.`);

      return logs.join('\n');
    }

    if (!this.permitted) {
      logs.push(`No .${this.type} rule allowed the operation.`);
    }

    if (!this.validated) {
      logs.push('One or more .validate rules disallowed the operation.');
    }

    logs.push(`${this.type} was denied.`);

    return logs.join('\n');
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
   * @param {string}   path   The rule path
   * @param {string}   kind   The rule kind
   * @param {NodeRule} rule   The rule
   * @param {{value: boolean, error: Error, detailed: string}}  result The evaluation result
   */
  add(path, kind, rule, result) {

    this.logs.push({
      path,
      kind,
      rule: rule.toString(),
      value: result.value == null ? false : result.value,
      error: result.error,
      detailed: result.detailed
    });

    switch (kind) {

    case 'validate':
      this.validated = this.validated && result.value === true;
      break;

    case 'write':
    case 'read':
      this.permitted = this.permitted || result.value === true;
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

  result.permitted = true;

  writeResults.forEach(r => {
    result.newDatabase = r.newDatabase;
    result.logs = result.logs.concat(r.logs);
    result.permitted = r.permitted && result.permitted;
    result.validated = r.validated && result.validated;
  });

  return result;
};
