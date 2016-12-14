/**
 * Define a rule parser.
 */

'use strict';

const esprima = require('esprima');
const scope = require('./scope');
const Node = require('./statement/base').Node;

// Register supported expressions
require('./statement/array');
require('./statement/binary');
require('./statement/call');
require('./statement/conditional');
require('./statement/expression');
require('./statement/identifier');
require('./statement/literal');
require('./statement/logical');
require('./statement/member');
require('./statement/unary');

const debugType = new Set([
  'MemberExpression',
  'CallExpression',
  'Identifier'
]);

class Rule {

  constructor(rule, wildchildren, isWrite) {
    const ruleScope = isWrite ? scope.write(wildchildren) : scope.read(wildchildren);
    const ast = esprima.parse(rule, {range: true});

    if (!ast.body || ast.body.length !== 1 || ast.body[0].type !== 'ExpressionStatement') {
      throw new Error('Rule is not a single expression.');
    }

    this.wildchildren = wildchildren;
    this.root = Node.from(rule, ast.body[0], ruleScope);

    if (this.root.inferredType !== 'boolean') {
      throw new Error('Expression must evaluate to a boolean.');
    }
  }

  get inferredType() {
    return this.root.inferredType;
  }

  toString() {
    return this.root.original;
  }

  inferType() {
    return this.root.inferredType;
  }

  evaluate(state) {
    return this.root.evaluate(state);
  }

  debug(state) {
    const evaluations = new Map([]);
    const result = this.root.debug(state, ev => {
      if (debugType.has(ev.type) === false || typeof ev.value === 'function') {
        return;
      }

      evaluations.set(`${ev.type}::${ev.original}`, ev);
    });

    const value = result.value;
    const detailed = result.detailed;
    const stack = Array.from(evaluations.values())
      .sort((a, b) => a.original.localeCompare(b.original))
      .map(ev => `${ev.original} = ${JSON.stringify(ev.value)}`)
      .join('\n  ');

    return {
      value,
      detailed: stack ? `${detailed}  [=> ${value}]\nusing [\n  ${stack}\n]` : `${detailed}  [=> ${value}]`
    };
  }

}

/**
 * Parse the rule and walk the expression three to infer the type of each
 * node and assert the expression is supported by firebase.
 *
 * If the rule inferred type is not a boolean or cannot be inferred, it will
 * throw.
 *
 * It will check each node in the expression tree is supported by firebase;
 * some expression types are not supported or have stricker rule regarding
 * types they support.
 *
 * Some expression allow type checking to be delayed untill runtime evaluation
 * when the type cannot be inferred (snapshot value and auth properties).
 *
 * @param  {string}        rule         Rule to parse
 * @param  {array<string>} wildchildren List of wildchildren available
 * @param  {Boolean}       isWrite      Is rule meant for a write operation
 * @return {Rule}
 */
exports.parse = function(rule, wildchildren, isWrite) {
  return new Rule(rule, wildchildren, isWrite);
};
