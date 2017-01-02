/**
 * Helpers for each operation type.
 */

'use strict';

const paths = require('../paths');
const pad = require('../pad');
const logsKey = Symbol('raw log list');

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
    this[logsKey] = [];
    this.permitted = false;
    this.validated = true;
    this.database = db;
    this.newDatabase = opts.newDatabase;
    this.newValue = opts.newValue;
  }

  get logs() {
    if (this[logsKey].some(r => r.kind === this.permissionType)) {
      return this[logsKey];
    }

    return [{path: paths.trim(this.path), hasNoRules: true}].concat(this[logsKey]);
  }

  get allowed() {
    return this.permitted && this.validated;
  }

  get permissionType() {
    return this.type === 'read' ? 'read' : 'write';
  }

  get info() {
    const info = [
      this.description,
      this.evaluations
    ];

    if (this.allowed) {
      info.push(`${this.type} was allowed.`);

      return info.join('\n');
    }

    if (!this.permitted) {
      info.push(`No .${this.permissionType} rule allowed the operation.`);
    }

    if (!this.validated) {
      info.push('One or more .validate rules disallowed the operation.');
    }

    info.push(`${this.type} was denied.`);

    return info.join('\n');
  }

  get description() {
    const op = `Attempt to ${this.type} ${this.path} as ${JSON.stringify(this.auth)}.\n`;

    switch (this.type) {

    case 'write':
      return `${op}New Value: "${JSON.stringify(this.newValue, undefined, 2)}".\n`;

    case 'patch':
      return `${op}Patch: "${JSON.stringify(this.newValue, undefined, 2)}".\n`;

    default:
      return op;

    }
  }

  get evaluations() {
    return this.logs.map(r => {
      if (r.hasNoRules === true) {
        return `/${r.path}: ${this.permissionType} <no rules>\n`;
      }

      const header = `/${r.path}: ${r.kind} "${r.rule}"`;
      const result = r.error == null ? r.value : r.error;

      if (r.detailed == null) {
        return `${header}  => ${result}\n`;
      }

      return `${header}  => ${result}\n${pad.lines(r.detailed)}\n`;
    }).join('\n');
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

    this[logsKey].push({
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
    result[logsKey] = result[logsKey].concat(r.logs);
    result.permitted = r.permitted && result.permitted;
    result.validated = r.validated && result.validated;
  });

  return result;
};
