
'use strict';

const Rule = require('./parser/rule');
const helpers = require('./helpers');

/**
 * Rule parsing related error.
 *
 * Holds the the path to the rule in the rules set and append it to the error
 * message.
 *
 */
class RuleError extends Error {

  constructor(stack, message) {
    super(`${stack.join('/')}: ${message}`);
    this.path = stack;
  }

}

/**
 * Test the value is an object.
 *
 * @param  {any} value Value to test
 * @return {boolean}
 */
function isObject(value) {
  return value && (typeof value === 'object');
}

/**
 * Test the the rule as the type and of an existing kind (read/write/validate/indexOn).
 *
 * @param  {array}  stack Path to the rule in the rule set.
 * @param  {string} kind  The rule kind (read/write/validate/indexOn)
 * @param  {any}    value The rule value
 */
function testRuleType(stack, kind, value) {
  const ruleType = typeof value;

  switch (kind) {

  case '.indexOn':
    if (ruleType !== 'string' && !Array.isArray(value)) {
      throw new RuleError(stack, `Expected .indexOn to be a string or an Array, got ${ruleType}`);
    }

    if (Array.isArray(value) && value.some(i => typeof i !== 'string')) {
      throw new RuleError(stack, `Expected .indexOn an Array of string, got ${value.map(x => typeof x).join(', ')}`);
    }

    return;

  case '.read':
  case '.write':
  case '.validate':
    if (ruleType !== 'string' && ruleType !== 'boolean') {
      throw new RuleError(stack, `Expected .indexOn to be a string or a boolean, got ${ruleType}`);
    }
    return;

  default:
    throw new RuleError(stack, `Invalid rule types: ${kind}`);

  }
}

/**
 * Hold a tree of read/write/validate rules.
 *
 * Used to simulate a firebase read, write or patch (update) operation.
 *
 */
class Ruleset {

  /**
   * Ruleset constructor.
   *
   * Should throw if the definition cannot be publish on Firebase.
   *
   * @param  {object} rulesDefinition A rule set object.
   */
  constructor(rulesDefinition) {

    if (!rulesDefinition) {
      throw new Error('No rules definition provided');
    }

    if (!isObject(rulesDefinition)) {
      throw new Error('Rules definition must be an object');
    }

    if (!rulesDefinition.rules || Object.keys(rulesDefinition).length !== 1) {
      throw new Error('Rules definition must have a single root object with property "rules"');
    }

    this.rules = new RuleNode([], rulesDefinition.rules);

    Object.freeze(this);
  }

  /**
   * Simulate a read (on/once) operation.
   *
   * It will traverse the tree from the root to the the node to access until
   * it finds a '.read' rule which evaluating to true.
   *
   * The operation is allowed if it found a read rule evaluating to true.
   *
   * @param  {string}      path  Path to the node to read
   * @param  {Database}    data  Database to read
   * @param  {object|null} auth  User data to simulate
   * @param  {number}      [now] Timestamp of the read operation
   * @return {{info: string, allowed: boolean}}
   */
  tryRead(path, data, auth, now) {

    const result = Result.read(path, data, auth);
    let state = {
      root: result.root,
      auth: result.auth,
      now: now || Date.now()
    };

    this.rules.$traverse(path, (currentPath, rules, wildchildren) => {

      if (!rules.$read) {
        return;
      }

      state = Object.assign({}, state, wildchildren, {data: data.snapshot(currentPath)});
      Ruleset.evaluate(rules, 'read', currentPath, state, result);

      return result.allowed;

    });

    return result;
  }

  /**
   * Simulate a write operation.
   *
   * It will traverse the tree from the root to the the node to update an
   * evaluate each '.write' rules until one permits the operation and each
   * '.validate' rules. It also evaluate the '.validate' rules any new node
   * (the new node and its children).
   *
   * The operation is allowed if any visited '.write' rule evaluate to true and
   * if no visited '.validate' rule evaluate to false.
   *
   *
   * @param  {string}      path     Path to the node to write
   * @param  {Database}    data     Database to edit
   * @param  {any}         newValue Replacement value
   * @param  {object|null} auth     User data to simulate
   * @param  {number}      [now]    Timestamp of the write operation
   * @return {{info: string, allowed: boolean}}
   */
  tryWrite(path, data, newValue, auth, now) {
    now = now || Date.now();

    const newData = data.set(path, newValue, undefined, now);

    return this.evaluateWrite(path, data, newData, newValue, auth, now);
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
  tryPatch(path, data, patch, auth, now) {
    const pathsToTest = [];
    let newData = data;

    now = now || Date.now();

    Object.keys(patch).forEach(function(endPath){
      var pathToNode = helpers.pathMerger(path, endPath);

      newData = newData.set(pathToNode, patch[endPath], undefined, now);
      pathsToTest.push(pathToNode);
    });

    const results = pathsToTest.map(p => this.evaluateWrite(p, data, newData, patch, auth, now));

    return Result.patch(path, data, newData, patch, auth, results);
  }

  /**
   * Evaluate the '.write' and '.validate' rules for `#tryWrite` and `#tryPatch`.
   *
   * @param  {string}       path     Path to evaluate
   * @param  {Database}     data     Original data
   * @param  {Database}     newData  Resulting data
   * @param  {any}          newValue Plain value (for the result)
   * @param  {object|null}  auth     User data to simulate
   * @param  {number}       now      Operation timestamp
   * @return {Result}
   * @private
   */
  evaluateWrite(path, data, newData, newValue, auth, now) {
    const stop = true;
    const result = Result.write(path, data, newData, newValue, auth);
    let state = {
      root: result.root,
      auth: result.auth,
      now: now
    };

    this.rules.$traverse(path, (currentPath, rules, wildchildren) => {

      state = Object.assign({}, state, wildchildren, {
        data: data.snapshot(currentPath),
        newData: newData.snapshot(currentPath)
      });

      if (result.writePermitted && !state.newData.exists()) {
        return stop;
      }

      if (!result.writePermitted) {
        Ruleset.evaluate(rules, 'write', currentPath, state, result);
      }

      if (state.newData.exists()) {
        Ruleset.evaluate(rules, 'validate', currentPath, state, result);
      }

      return !stop;
    });

    if (!result.newData.exists()) {
      return result;
    }

    newData.walk(path, snap => {
      const childPath = snap.toString();
      const child = this.rules.$child(childPath);

      if (!child || !snap.exists()) {
        // Note that it only stop walking down that branch; the callback will be
        // called with siblings.
        return stop;
      }

      state = Object.assign({}, state, child.wildchildren, {
        data: data.snapshot(childPath),
        newData: snap
      });

      Ruleset.evaluate(child.rules, 'validate', childPath, state, result);

      return !stop;
    });

    return result;
  }

  /**
   * Helper function evaluating a rule and logging the result.
   *
   * @param  {Rule}   rules  Rule to evaluate
   * @param  {string} kind   Rule Kind
   * @param  {string} path   Data path
   * @param  {object} state  State to evaluate the rule with
   * @param  {Result} result Result object to log the result to
   * @private
   */
  static evaluate(rules, kind, path, state, result) {
    const rule = rules[`$${kind}`];

    if (!rule) {
      return;
    }

    try {
      const allowed = rule.evaluate(state);

      result.add(path, kind, rule, allowed);
    } catch(e) {
      result.add(path, kind, rule, e);
    }
  }

}

/**
 * Represent a Rule Node
 */
class RuleNode {

  /**
   * RuleNode constructor.
   *
   * @param  {array}  stack Path to the rule in the ruleset.
   * @param  {object} rules Node rules and its children
   */
  constructor(stack, rules) {

    if (!rules) {
      throw new RuleError(stack, 'no rule provided');
    }

    if (!isObject(rules)) {
      throw new RuleError(stack, `rules should be an object, got ${typeof rules}`);
    }

    // validate rule kinds
    const ruleKinds = Object.keys(rules).filter(k => k.startsWith('.'));

    ruleKinds.forEach(k => testRuleType(stack, k, rules[k]));

    // validate wildchild
    const wildchildren = stack.filter(k => k.startsWith('$'));
    const wildchild = Object.keys(rules).filter(k => k.startsWith('$'));

    if (wildchild.length > 1) {
      throw new RuleError(stack, 'There can only be one wildchild at a given path.');
    }

    const wildchildName = wildchild.pop();

    if (wildchildName && wildchildren.indexOf(wildchildName) > -1) {
      throw new RuleError(stack, 'got identical wildchild names in the stack.');
    }

    // Setup flag and parse rules.
    const isWrite = true;
    const name = stack.slice(-1).pop();

    Object.defineProperties(this, {
      $name: {value: name},
      $isWildchild: {value: name && name.startsWith('$')},
      $read: {value: rules['.read'] != null ? new Rule(rules['.read'].toString(), wildchildren, !isWrite) : null},
      $write: {value: rules['.write'] != null ? new Rule(rules['.write'].toString(), wildchildren, isWrite) : null},
      $validate: {value: rules['.validate'] != null ? new Rule(rules['.validate'].toString(), wildchildren, isWrite) : null}
    });

    // setup children rules
    const childrens = Object.keys(rules).filter(k => !k.startsWith('.') && !k.startsWith('$'));

    childrens.forEach(k => (this[k] = new RuleNode(stack.concat(k), rules[k])));
    this.$wildchild = wildchildName ? new RuleNode(stack.concat(wildchildName), rules[wildchildName]) : null;

    Object.freeze(this);
  }

  /**
   * Find a children rule applying to the name.
   *
   * @param  {string} name         Path to the the rule node
   * @param  {object} wildchildren Map of wildchild  name/value to extend
   * @return {{child: RuleNode, wildchildren: object}|void}
   */
  $child(name, wildchildren) {
    wildchildren = wildchildren || {};

    const parts = helpers.pathSplitter(name);
    let rules = this;

    for (let i = 0; i < parts.length; i++) {
      let key = parts[i];

      if (rules[key]) {
        rules = rules[key];
        continue;
      }

      if (!rules.$wildchild) {
        return;
      }

      rules = rules.$wildchild;
      wildchildren = Object.assign({}, wildchildren, {[rules.$name]: key});
    }

    return {rules, wildchildren};
  }

  /**
   * Traverse the path and yield each node on the way.
   *
   * The callback function can return `true` to stop traversing the path.
   *
   * @param  {string}   path           Path to traverse
   * @param  {object}   [wildchildren] Map of wildchild name/value to extend
   * @param  {function(path: string, rules: RuleNode, wildchildren: object): boolean} cb Receive each node traversed.
   */
  $traverse(path, wildchildren, cb) {
    let currentPath = '';
    let currentRules = this;

    if (typeof wildchildren === 'function') {
      cb = wildchildren;
      wildchildren = {};
    }

    cb(currentPath, currentRules, wildchildren);

    const stop = true;

    helpers.pathSplitter(path).some(key => {
      const child = currentRules.$child(key, wildchildren);

      if (!child) {
        return stop;
      }

      currentPath = helpers.pathMerger(currentPath, key);
      currentRules = child.rules;
      wildchildren = child.wildchildren;

      return cb(currentPath, currentRules, wildchildren);
    });
  }

}

/**
 * Hold an evaluation result.
 */
class Result {

  /**
   * Create the result for a read operation.
   *
   * @param  {string}      path Path to node to read
   * @param  {Database}    data Database to read
   * @param  {object|null} auth User data to simulate
   * @return {Result}
   */
  static read(path, data, auth) {
    return new Result(path, 'read', data, undefined, undefined, auth);
  }

  /**
   * Create the result for a write operation.
   *
   * @param  {string}      path     Path to node to write
   * @param  {Database}    data     Database to edit
   * @param  {Database}    newData  Resulting database
   * @param  {any}         newValue Value to edit with
   * @param  {object|null} auth     User data to simulate
   * @return {Result}
   */
  static write(path, data, newData, newValue, auth) {
    return new Result(path, 'write', data, newData, newValue, auth);
  }

  /**
   * Create the result for a patch operation from w serie of write evaluation
   * result.
   *
   * @param  {string}       path         Path to node to patch
   * @param  {Database}     data         Database to edit
   * @param  {Database}     newData      Resulting database
   * @param  {object}       patch        Values to edit with
   * @param  {object|null}  auth         User data to simulate
   * @param  {array}        writeResults List of write eveluation result to merge.
   * @return {Result}
   */
  static patch(path, data, newData, patch, auth, writeResults) {
    const result = new Result(path, 'patch', data, newData, patch, auth);

    result.writePermitted = true;

    writeResults.forEach(r => {
      result.logs = result.logs.concat(r.logs);
      result.writePermitted = r.writePermitted && result.writePermitted;
      result.validated = r.validated && result.validated;
    });

    return result;
  }

  constructor(path, operationType, data, newData, newValue, auth) {
    const isRead = operationType === 'read';

    this.path = path;
    this.auth = auth;
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

module.exports = Ruleset;
