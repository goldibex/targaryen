
'use strict';

const esprima = require('esprima');
const Scope = require('./scope');
const nodeError = require('./node-error');
const stringMethods = require('./string-methods');

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

function Rule(ruleStr, wildchildren, isWrite) {

  this._str = ruleStr;
  this.wildchildren = wildchildren;

  const localTypes = wildchildren.reduce((otherTypes, wildchild) => {
    otherTypes[wildchild] = 'string';
    return otherTypes;
  }, {});

  if (isWrite) {
    localTypes.newData = 'RuleDataSnapshot';
  }

  const scope = new Scope(localTypes);
  const ast = esprima.parse(ruleStr, {range: true});

  if (ast.body.length !== 1 || ast.body[0].type !== 'ExpressionStatement') {
    throw new Error('Rule is not a single expression');
  }

  this._ast = ast.body[0];

  // remember the source text associated with each node
  (function markOriginal(node) {

    // slice the chunk of text from the rule expression associated with this node
    node.original = ruleStr.slice(node.range[0], node.range[1]);

    Object.keys(node).forEach(propertyName => {

      [].concat(node[propertyName]).forEach(property => {

        if (typeof property === 'object' && property !== null && property.range) {
          markOriginal(property);
        }

      });

    });

  })(ast);

  scope.inferType(this._ast);
  scope.assertIndentifiersExist(this._ast);

  if (this._ast.expression.inferredType !== 'boolean') {
    throw new Error('Expression must evaluate to a boolean.');
  }

}

Rule.prototype.evaluate = function(state, skipOnNoValue) {
  return new RuleEvaluator(state).evaluate(this._ast, skipOnNoValue);
};

Rule.prototype.toString = function() {
  return this._str;
};

function RuleEvaluator(state) {
  this.state = state;
}

RuleEvaluator.prototype.evaluate = function(node, skipOnNoValue) {
  if (skipOnNoValue && (typeof node.value === 'undefined' || node.value === null)) {
    return true;
  }

  switch (node.type) {
  case 'ExpressionStatement':
    return this.evaluate(node.expression);
  case 'LogicalExpression':
    return this._evalLogicalExpression(node);
  case 'UnaryExpression':
    return this._evalUnaryExpression(node);
  case 'BinaryExpression':
    return this._evalBinaryExpression(node);
  case 'ConditionalExpression':
    return this._evalConditionalExpression(node);
  case 'MemberExpression':
    return this._evalMemberExpression(node);
  case 'CallExpression':
    return this._evalCallExpression(node);
  case 'ArrayExpression':
    return this._evalArrayExpression(node);
  case 'Literal':
    return this._evalLiteral(node);
  case 'Identifier':
    return this._evalIdentifier(node);
  default:
    throw new Error('Unexpected ' + node.type);
  }

};

RuleEvaluator.prototype._evalIdentifier = function(node) {
  if (!hasOwnProperty(this.state, node.name)) {
    throw nodeError(node, 'unknown variable ' + node.name);
  }

  return this.state[node.name];
};

RuleEvaluator.prototype._evalLiteral = function(node) {
  return node.value;
};

RuleEvaluator.prototype._evalLogicalExpression = function(node) {

  switch (node.operator) {
  case '&&':
    return this.evaluate(node.left) && this.evaluate(node.right);
  case '||':
    return this.evaluate(node.left) || this.evaluate(node.right);
  default:
    throw nodeError(node, 'unknown logical operator ' + node.operator);
  }

};

const additionTypes = new Set(['number', 'string']);

RuleEvaluator.prototype._evalBinaryExpression = function(node) {

  const left = this.evaluate(node.left);
  const right = this.evaluate(node.right);

  switch (node.operator) {

  case '-':
  case '/':
  case '*':
  case '%':
    if (typeof left !== 'number') {
      throw nodeError(node, `${node.left} should evaluate to a number.`);
    }

    if (typeof right !== 'number') {
      throw nodeError(node, `${node.right} should evaluate to a number.`);
    }

    break;

  case '+':
    if (!additionTypes.has(typeof left)) {
      throw nodeError(node, `${node.left} should evaluate to a ${Array.from(additionTypes).join(' or ')}.`);
    }

    if (!additionTypes.has(typeof right)) {
      throw nodeError(node, `${node.right} should evaluate to a ${Array.from(additionTypes).join(' or ')}.`);
    }

    break;

  case '>':
  case '>=':
  case '<':
  case '<=':
    if ((typeof left) !== (typeof right)) {
      throw nodeError(node, `${node.right} and ${node.left} should evaluate to values of the same type.`);
    }

    break;

  default:
    break;
  }

  switch (node.operator) {
  case '+':
    return left + right;
  case '-':
    return left - right;
  case '/':
    return left / right;
  case '*':
    return left * right;
  case '%':
    return left % right;
  case '!=':
  case '!==':
    return left !== right;
  case '==':
  case '===':
    return left === right;
  case '>':
    return left > right;
  case '>=':
    return left >= right;
  case '<':
    return left < right;
  case '<=':
    return left <= right;
  default:
    throw nodeError(node, 'unknown binary operator ' + node.operator);
  }

};

RuleEvaluator.prototype._evalUnaryExpression = function(node) {
  const value = this.evaluate(node.argument);

  switch (node.operator) {
  case '!':
    return !value;
  case '-':
    if (typeof value !== 'number') {
      throw nodeError(node, `${nodeError.argument} should evaluate to a number`);
    }

    return -value;
  default:
    throw nodeError(node, 'unknown unary operator ' + node.operator);
  }

};

RuleEvaluator.prototype._evalConditionalExpression = function(node) {
  const test = this.evaluate(node.test);

  return test ? this.evaluate(node.consequent) : this.evaluate(node.alternate);
};

RuleEvaluator.prototype._evalMemberExpression = function(node) {

  const object = this.evaluate(node.object);
  const key = node.computed ? this.evaluate(node.property) : node.property.name;
  const isPatched = typeof object === 'string' && stringMethods[key];
  const property = isPatched ? stringMethods[key] : (object && object[key]);

  if (property === undefined) {
    return null;
  }

  if (typeof property !== 'function') {
    return property;
  }

  return isPatched ? property.bind(null, object) : property.bind(object);

};

RuleEvaluator.prototype._evalCallExpression = function(node) {

  const methodArguments = node.arguments.map(arg => this.evaluate(arg));
  const method = this.evaluate(node.callee);

  if (typeof method !== 'function') {
    throw nodeError(node, method + ' is not a function or method');
  }

  return method.apply(null, methodArguments);
};

RuleEvaluator.prototype._evalArrayExpression = function(node) {

  return node.elements.map(function(element) {
    return this.evaluate(element);
  }, this);

};

module.exports = Rule;
