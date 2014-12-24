
'use strict';

var extend = require('extend'),
  nodeError = require('./node-error');

var rootTypes = {

  auth: 'object',
  root: 'RuleDataSnapshot',
  data: 'RuleDataSnapshot',
  now: 'number'

};

var binaryArithmeticOperatorTypes = {
  '-': true,
  '*': true,
  '/': true,
  '%': true,
};

var binaryComparisonOperatorTypes = {
  '==': true,
  '!=': true,
  '===': true,
  '!==': true,
  '>': true,
  '>=': true,
  '<': true,
  '<=': true
};

var unaryOperatorTypes = {
  '-': 'number',
  '!': 'boolean'
};

var properties = {

  string: {
    contains: { args: ['string'], returnType: 'boolean' },
    beginsWith: { args: ['string'], returnType: 'boolean' },
    endsWith: { args: ['string'], returnType: 'boolean' },
    replace: { args: ['string', 'string'], returnType: 'string' },
    toLowerCase: { args: [], returnType: 'string' },
    toUpperCase: { args: [], returnType: 'string' },
    matches: { args: ['RegExp'], returnType: 'boolean' },
    length: 'number'
  },
  RuleDataSnapshot: {
    val: { args: [] },
    child: { args: ['string'], returnType: 'RuleDataSnapshot' },
    parent: { args: ['string'], returnType: 'RuleDataSnapshot' },
    hasChild: { args: ['string'], returnType: 'boolean' },
    hasChildren: {
      args: function(scope, node) {

        if (node.arguments.length > 1) {
          throw nodeError(node, 'Too many arguments to hasChildren');
        } else if (node.arguments.length === 1) {

          var argument = node.arguments[0];
          if (argument.type !== 'ArrayExpression') {
            throw nodeError(node, 'hasChildren takes 1 argument: an array of strings');
          } else if (argument.elements.length === 0) {
            throw nodeError(node, 'hasChildren got an empty array, expected some strings in there');
          } else {

            for (var i = 0; i < argument.elements.length; i++) {

              if (scope.inferType(argument.elements[i]) && argument.elements[i].inferredType !== 'string') {
                throw nodeError(node, 'hasChildren got an array with a non-string value');
              }

            }

          }

        }

      },
      returnType: 'boolean'
    },
    exists: { args: [], returnType: 'boolean' },
    getPriority: { args: [] },
    isNumber: { args: [], returnType: 'boolean' },
    isString: { args: [], returnType: 'boolean' },
    isBoolean: { args: [], returnType: 'boolean' }
  }

};

function Scope(types) {
  this.types = extend({}, types, rootTypes);
}

Scope.prototype.inferType = function(node) {

  if (!node.inferredType) {

    switch(node.type) {
    case 'LogicalExpression':
      node.inferredType = 'boolean';
      break;
    case 'ExpressionStatement':
      node.inferredType = this.inferType(node.expression);
      break;
    case 'Literal':
      this._inferLiteral(node);
      break;
    case 'UnaryExpression':
      this._inferUnaryExpression(node);
      break;
    case 'Identifier':
      this._inferIdentifier(node);
      break;
    case 'CallExpression':
      this._inferCallExpression(node);
      break;
    case 'MemberExpression':
      this._inferMemberExpression(node);
      break;
    case 'ConditionalExpression':
      this._inferConditionalExpression(node);
      break;
    case 'BinaryExpression':
      this._inferBinaryExpression(node);
      break;
    default:
      throw nodeError(node, 'Unexpected ' + node.type);
    }
  }

  return node.inferredType;

};

Scope.prototype._inferLiteral = function(node) {

  // one hiccup: is this a regular expression literal? esparse does not help with this
  // we need to check the raw value to find out

  if (/^\/.+\/[igm]?$/.test(node.raw)) {

    // regular expression. construct it.
    if ('igm'.indexOf(node.raw.slice(-1)) !== -1) {
      // we have a modifier letter
      node.value = new RegExp(node.raw.slice(1, -2), node.raw.slice(-1));
    } else {
      node.value = new RegExp(node.raw.slice(1, -1));
    }

    node.inferredType = 'RegExp';

  } else if (node.value === undefined) {
    throw nodeError(node, 'undefined is not valid in rules');
  } else {
    node.inferredType = typeof node.value;
  }

};

Scope.prototype._inferUnaryExpression = function(node) {

  if (!unaryOperatorTypes[node.operator]) {
    throw nodeError(node, 'Unknown operator "' + node.operator + '"');
  }
  node.inferredType = unaryOperatorTypes[node.operator];
};


Scope.prototype._inferBinaryExpression = function(node) {

  var left = this.inferType(node.left),
    right = this.inferType(node.right);

  if (node.operator === '+') {

    if (left === 'string' && right === 'string') {
      node.inferredType = 'string';
    } else if (left === 'number' && right === 'number') {
      node.inferredType = 'number';
    } else {
      throw nodeError(node, '+ needs 2 operands of types number or string, but got ' +
        left + ' and ' + right + ' instead.');
    }

  } else if (binaryArithmeticOperatorTypes[node.operator]) {

    if ((left && left === 'number') &&
        (right && right === 'number')) {
      node.inferredType = left;
    } else {
      throw nodeError(node, 'Both sides of arithmetic ' + node.operator +
        ' must have type number, but got ' + left + ' and ' + right);
    }

  } else if (binaryComparisonOperatorTypes[node.operator]) {

    if (left && right && (left !== right)) {
      throw nodeError(node, 'Both sides of boolean ' + node.operator +
        ' must have the same type, but got ' + left + ' and ' + right);
    } else {
      node.inferredType = 'boolean';
    }

  } else {
    throw nodeError(node, 'Unknown operator "' + node.operator + '"');
  }

};

Scope.prototype._inferIdentifier = function(node) {

  if (!this.types[node.name]) {
    throw nodeError(node, 'Unknown variable "' + node.name + '"');
  }
  node.inferredType = this.types[node.name];

};

Scope.prototype._inferCallExpression = function(node) {

  var functionSignature = this.inferType(node.callee);

  if (typeof functionSignature === 'object') {

    node.inferredType = functionSignature.returnType;
    node.callee.inferredType = 'Function';

    // check the type and arity of the arguments

    if (Array.isArray(functionSignature.args)) {

      if (node.arguments.length !== functionSignature.args.length) {
        throw nodeError(node, 'method expects ' + functionSignature.args.length +
          ' arguments, but got ' + node.arguments.length + ' instead');
      }

      node.arguments.forEach(function(arg, i) {

        if (this.inferType(arg) !== functionSignature.args[i]) {
          throw nodeError(arg, 'method expects argument ' + (i+1) + ' to be a ' +
            functionSignature.args[i] + ', but got ' + arg.inferredType);
        }

      }, this);

    } else if (typeof functionSignature.args === 'function') {
      functionSignature.args(this, node);
    }

  } else if (functionSignature !== undefined) {
    throw nodeError(node, 'result of expression is not a function or method');
  }

};

Scope.prototype._inferMemberExpression = function(node) {

  var objectType = this.inferType(node.object);

  if (properties[objectType] && properties[objectType][node.property.name]) {
    node.inferredType = properties[objectType][node.property.name];
  } else if (objectType === 'object' || !objectType) {

    // so it's a (sub)property of auth. it could be a string, check those members
    if (properties.string[node.property.name]) {
      node.inferredType = properties.string[node.property.name];
    }

  } else if (objectType) {
    throw nodeError(node, objectType + ' has no member "' + node.property.name + '"');
  }

};

Scope.prototype._inferConditionalExpression = function(node) {

  var consequent = this.inferType(node.consequent),
    alternate = this.inferType(node.alternate);

  if (consequent === alternate) {
    node.inferredType = consequent;
  }

};

module.exports = Scope;
