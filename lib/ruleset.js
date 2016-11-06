
'use strict';

const Rule = require('./parser/rule');
const paths = require('./paths');
const results = require('./results');

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

    this.root = new RulesetNode([], rulesDefinition.rules);

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
   * @param  {number}      [now] Timestamp of the read operation
   * @return {{info: string, allowed: boolean}}
   */
  tryRead(path, data, now) {

    const result = results.read(path, data);
    let state = {
      root: data.snapshot('/'),
      auth: result.auth,
      now: now
    };

    this.root.$traverse(path, (currentPath, rules, wildchildren) => {

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
   * Evaluate the '.write' and '.validate' rules for `#tryWrite` and `#tryPatch`.
   *
   * @param  {string}       path     Path to evaluate
   * @param  {Database}     data     Original data
   * @param  {Database}     newData  Resulting data
   * @param  {any}          newValue Plain value (for the result)
   * @return {Result}
   * @private
   */
  tryWrite(path, data, newData, newValue) {
    const stop = true;
    const result = results.write(path, data, newData, newValue);
    let state = {
      root: data.snapshot('/'),
      auth: data.auth || null,
      now: newData.timestamp
    };

    this.root.$traverse(path, (currentPath, rules, wildchildren) => {

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
      const child = this.root.$child(childPath);

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
class RulesetNode {

  /**
   * RulesetNode constructor.
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

    childrens.forEach(k => (this[k] = new RulesetNode(stack.concat(k), rules[k])));
    this.$wildchild = wildchildName ? new RulesetNode(stack.concat(wildchildName), rules[wildchildName]) : null;

    Object.freeze(this);
  }

  /**
   * Find a children rule applying to the name.
   *
   * @param  {string} name         Path to the the rule node
   * @param  {object} wildchildren Map of wildchild  name/value to extend
   * @return {{child: RulesetNode, wildchildren: object}|void}
   */
  $child(name, wildchildren) {
    wildchildren = wildchildren || {};

    const parts = paths.split(name);
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
   * @param  {function(path: string, rules: RulesetNode, wildchildren: object): boolean} cb Receive each node traversed.
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

    paths.split(path).some(key => {
      const child = currentRules.$child(key, wildchildren);

      if (!child) {
        return stop;
      }

      currentPath = paths.join(currentPath, key);
      currentRules = child.rules;
      wildchildren = child.wildchildren;

      return cb(currentPath, currentRules, wildchildren);
    });
  }

}

exports.create = function(rulesDefinition) {
  if (rulesDefinition instanceof Ruleset) {
    return rulesDefinition;
  }

  return new Ruleset(rulesDefinition);
};
