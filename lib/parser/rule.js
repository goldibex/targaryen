
'use strict';

var esprima = require('esprima'),
  Scope = require('./scope'),
  nodeError = require('./node-error');

function Rule(ruleStr, wildchildren) {

  var localTypes = wildchildren.reduce(function(otherTypes, wildchild) {
    otherTypes[wildchild] = 'string';
    return otherTypes;
  }, {});

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

  this._ast = ast;

}

Rule.prototype.evaluate = function(state) {
  return new RuleEvaluator(state).evaluate(this._ast);
};


function RuleEvaluator(state) {
  this.state = state;
}

RuleEvaluator.prototype.evaluate = function(node) {

  switch(node.type) {
  case 'ExpressionStatement':
    return this.evaluate(node.expressionStatement);
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

  var object = this.evaluate(node.object);

  if (object.hasOwnProperty(node.property.name) && typeof object[node.property.name] === 'function') {
    return function() {
      return object[node.property.name].apply(object, arguments);
    };
  } else if (object.hasOwnProperty(node.property.name)) {
    return object[node.property.name];
  } else {
    throw nodeError(node, object + ' has no property "' + node.property.name + '"');
  }

};

RuleEvaluator.prototype._evalCallExpression = function(node) {

  // get the arguments first
  var methodArguments = node.arguments.map(function(argument) {
    return this.evaluate(argument);
  });

  var method = this.evaluate(node.callee);
  if (typeof method === 'function') {
    return method.apply(methodArguments);
  } else {
    throw nodeError(node, method + ' is not a function or method');
  }

};

module.exports = Rule;
