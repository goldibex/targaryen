
'use strict';

var esprima = require('esprima'),
  Scope = require('./scope'),
  nodeError = require('./node-error'),
  stringMethods = require('./string-methods');


function Rule(ruleStr, wildchildren, isWrite) {

  this._str = ruleStr;

  var localTypes = wildchildren.reduce(function(otherTypes, wildchild) {
    otherTypes[wildchild] = 'string';
    return otherTypes;
  }, {});

  if (isWrite) {
    localTypes.newData = 'RuleDataSnapshot';
  }

  var scope = new Scope(localTypes);
  var ast = esprima.parse(ruleStr, { range: true });

  if (ast.body.length !== 1 || ast.body[0].type !== 'ExpressionStatement') {
    throw new Error('Rule is not a single expression');
  }

  this._ast = ast.body[0];

  scope.inferType(this._ast);

  if (this._ast.expression.inferredType !== 'boolean') {
    throw new Error('Expression does not evaluate to a boolean');
  }

}

Rule.prototype.evaluate = function(state) {
  return new RuleEvaluator(state).evaluate(this._ast);
};

Rule.prototype.toString = function() {
  return this._str;
};


function RuleEvaluator(state) {
  this.state = state;
}

RuleEvaluator.prototype.evaluate = function(node) {

  switch(node.type) {
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

  if (this.state.hasOwnProperty(node.name)) {
    return this.state[node.name];
  } else {
    throw nodeError(node, 'unknown variable ' + node.name);
  }

};

RuleEvaluator.prototype._evalLiteral = function(node) {
  return node.value;
};

RuleEvaluator.prototype._evalLogicalExpression = function(node) {

  if (node.operator === '&&') {
    return this.evaluate(node.left) && this.evaluate(node.right);
  } else if (node.operator === '||') {
    return this.evaluate(node.left) || this.evaluate(node.right);
  } else {
    throw nodeError(node, 'unknown logical operator ' + node.operator);
  }

};

RuleEvaluator.prototype._evalBinaryExpression = function(node) {

  var left = this.evaluate(node.left),
    right = this.evaluate(node.right);

  switch(node.operator) {
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

  switch (node.operator) {
  case '!':
    return !this.evaluate(node.argument);
  case '-':
    return -this.evaluate(node.argument);
  default:
    throw nodeError(node, 'unknown unary operator ' + node.operator);
  }

};

RuleEvaluator.prototype._evalConditionalExpression = function(node) {

  var test = this.evaluate(node.test);

  if (test) {
    return this.evaluate(node.consequent);
  } else {
    return this.evaluate(node.alternate);
  }

};

RuleEvaluator.prototype._evalMemberExpression = function(node) {

  var object = this.evaluate(node.object),
    property = object[node.property.name];

  if (typeof object === 'string' && stringMethods[node.property.name]) {

    // swizzle in the string methods, if object is a string
    return function() {
      var args = Array.prototype.slice.call(arguments, 0);
      return stringMethods[node.property.name].apply(null, [object].concat(args));
    };

  } else if (typeof property === 'function') {

    return function() {
      return property.apply(object, arguments);
    };

  } else if (property !== undefined) {
    return property;
  } else {
    throw nodeError(node, object + ' has no property "' + node.property.name + '"');
  }

};

RuleEvaluator.prototype._evalCallExpression = function(node) {

  // get the arguments first
  var methodArguments = node.arguments.map(function(argument) {
    return this.evaluate(argument);
  }, this);

  var method = this.evaluate(node.callee);
  if (typeof method === 'function') {
    return method.apply(null, methodArguments);
  } else {
    throw nodeError(node, method + ' is not a function or method');
  }

};

RuleEvaluator.prototype._evalArrayExpression = function(node) {

  return node.elements.map(function(element) {
    return this.evaluate(element);
  }, this);

};

module.exports = Rule;
