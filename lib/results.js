'use strict';

/**
 * Hold an evaluation result.
 */
class Result {

  constructor(path, operationType, data, newData, newValue) {
    const isRead = operationType === 'read';

    this.path = path;
    this.auth = isRead ? data.auth : newData.auth;
    this.type = operationType;
    this.logs = [];
    this.readPermitted = isRead ? false : true;
    this.writePermitted = isRead ? true : false;
    this.validated = true;
    this.data = data.snapshot(path);
    this.root = data.snapshot('/');

    if (isRead) {
      return;
    }

    this.newValue = newValue;
    this.newData = newData.snapshot(path);
    this.newRoot = newData.snapshot('/');
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
  return new Result(path, 'read', data, undefined, undefined);
};

/**
 * Create the result for a write operation.
 *
 * @param  {string}      path     Path to node to write
 * @param  {Database}    data     Database to edit
 * @param  {Database}    newData  Resulting database
 * @param  {any}         newValue Value to edit with
 * @return {Result}
 */
exports.write = function(path, data, newData, newValue) {
  return new Result(path, 'write', data, newData, newValue);
};

/**
 * Create the result for a patch operation from w serie of write evaluation
 * result.
 *
 * @param  {string}       path         Path to node to patch
 * @param  {Database}     data         Database to edit
 * @param  {Database}     newData      Resulting database
 * @param  {object}       patch        Values to edit with
 * @param  {array}        writeResults List of write eveluation result to merge.
 * @return {Result}
 */
exports.update = function(path, data, newData, patch, writeResults) {
  const result = new Result(path, 'patch', data, newData, patch);

  result.writePermitted = true;

  writeResults.forEach(r => {
    result.logs = result.logs.concat(r.logs);
    result.writePermitted = r.writePermitted && result.writePermitted;
    result.validated = r.validated && result.validated;
  });

  return result;
};
