
'use strict';

const nodeError = require('./node-error');

const rootTypes = {

  auth: 'any',
  root: 'RuleDataSnapshot',
  data: 'RuleDataSnapshot',
  now: 'number'

};

const binaryArithmeticOperatorTypes = {
  '-': true,
  '*': true,
  '/': true,
  '%': true
};

const binaryComparisonOperatorTypes = {
  '==': true,
  '!=': true,
  '===': true,
  '!==': true,
  '>': true,
  '>=': true,
  '<': true,
  '<=': true
};

const unaryOperatorTypes = {
  '-': 'number',
  '!': 'boolean'
};

const properties = {

  string: {
    contains: {name: 'contains', args: ['string'], returnType: 'boolean'},
    beginsWith: {name: 'beginsWith', args: ['string'], returnType: 'boolean'},
    endsWith: {name: 'endsWith', args: ['string'], returnType: 'boolean'},
    replace: {name: 'replace', args: ['string', 'string'], returnType: 'string'},
    toLowerCase: {name: 'toLowerCase', args: [], returnType: 'string'},
    toUpperCase: {name: 'toUpperCase', args: [], returnType: 'string'},
    matches: {name: 'matches', args: ['RegExp'], returnType: 'boolean'},
    length: 'number'
  },
  RuleDataSnapshot: {
    val: {name: 'val', args: [], returnType: 'primitive'},
    child: {name: 'child', args: ['string'], returnType: 'RuleDataSnapshot'},
    parent: {name: 'parent', args: [], returnType: 'RuleDataSnapshot'},
    hasChild: {name: 'hasChild', args: ['string'], returnType: 'boolean'},
    hasChildren: {
      name: 'hasChildren',
      args(scope, node) {

        if (node.arguments.length === 0) {
          return;
        }

        if (node.arguments.length > 1) {
          throw nodeError(node, 'Too many arguments to hasChildren');
        }

        const argument = node.arguments[0];

        if (argument.type !== 'ArrayExpression') {
          throw nodeError(node, 'hasChildren takes 1 argument: an array of strings');
        }

        if (argument.elements.length === 0) {
          throw nodeError(node, 'hasChildren got an empty array, expected some strings in there');
        }

        for (let i = 0; i < argument.elements.length; i++) {
          const argType = scope.inferType(argument.elements[i]);

          if (fuzzyType(argType)) {
            continue;
          }

          if (argType !== 'string') {
            throw nodeError(node, 'hasChildren got an array with a non-string value');
          }

        }

      },
      returnType: 'boolean'
    },
    exists: {name: 'exists', args: [], returnType: 'boolean'},
    getPriority: {name: 'getPriority', args: [], returnType: 'any'},
    isNumber: {name: 'isNumber', args: [], returnType: 'boolean'},
    isString: {name: 'isString', args: [], returnType: 'boolean'},
    isBoolean: {name: 'isoolean', args: [], returnType: 'boolean'}
  }

};

const primitiveTypes = new Set(['string', 'number', 'boolean', 'primitive']);

function isPrimitiveType(type) {
  return primitiveTypes.has(type);
}

function fuzzyType(type) {
  return type === 'any' || type === 'primitive';
}

function Scope(types) {
  this.types = Object.assign({}, types, rootTypes);
}

Scope.prototype.inferType = function(node) {

  if (!node.inferredType) {

    switch (node.type) {
    case 'LogicalExpression':
      this._inferLogicalExpression(node);
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

Scope.prototype.assertIndentifiersExist = function(node) {
  const stack = [node];

  while (stack.length > 0) {
    const currNode = stack.pop();

    switch (currNode.type) {

    case 'LogicalExpression':
    case 'BinaryExpression':
      stack.push(currNode.right, currNode.left);
      break;

    case 'ConditionalExpression':
      stack.push(currNode.test, currNode.consequent, currNode.alternate);
      break;

    case 'ExpressionStatement':
      stack.push(currNode.expression);
      break;

    case 'CallExpression':
      stack.push(currNode.callee);
      break;

    case 'MemberExpression':
      stack.push(currNode.object);
      break;

    case 'UnaryExpression':
      stack.push(currNode.argument);
      break;

    case 'Identifier':
      this._assertIdentifier(currNode);
      break;

    default:
      break;

    }
  }
};

Scope.prototype._inferLogicalExpression = function(node) {
  const left = this.inferType(node.left);
  const right = this.inferType(node.right);

  if (left !== 'boolean') {
    throw nodeError(node, `Left operand of ${node.operator} must be boolean.`);
  }

  if (right !== 'boolean') {
    throw nodeError(node, `Right operand of ${node.operator} must be boolean.`);
  }

  node.inferredType = 'boolean';
};

Scope.prototype._inferLiteral = function(node) {

  // one hiccup: is this a regular expression literal? esparse does not help with this
  // we need to check the raw value to find out
  if (/^\/.+\/[igm]?$/.test(node.raw)) {

    // regular expression. construct it.
    if ('igm'.indexOf(node.raw.slice(-1)) > -1) {
      // we have a modifier letter
      node.value = new RegExp(node.raw.slice(1, -2), node.raw.slice(-1));
    } else {
      node.value = new RegExp(node.raw.slice(1, -1));
    }

    node.inferredType = 'RegExp';
    return;

  }

  if (node.value === undefined) {
    throw nodeError(node, 'undefined is not valid in rules');
  }

  node.inferredType = typeof node.value;

};

Scope.prototype._inferUnaryExpression = function(node) {

  if (!unaryOperatorTypes[node.operator]) {
    throw nodeError(node, 'Unknown operator "' + node.operator + '"');
  }

  node.inferredType = unaryOperatorTypes[node.operator];
};

Scope.prototype._inferBinaryExpression = function(node) {

  const left = this.inferType(node.left);
  const right = this.inferType(node.right);

  if (node.operator === '+') {

    const validTypes = new Set(['any', 'primitive', 'string', 'number']);

    if (!validTypes.has(left)) {
      throw nodeError(node, 'Invalid + expression: left operand is not a number or string');
    }

    if (!validTypes.has(right)) {
      throw nodeError(node, 'Invalid + expression: left operand is not a number or string');
    }

    if (left === 'number' && right === 'number') {
      node.inferredType = 'number';
    } else if (left === 'string' || right === 'string') {
      node.inferredType = 'string';
    } else {
      node.inferredType = 'primitive';
    }

    return;

  }

  if (binaryArithmeticOperatorTypes[node.operator]) {

    const validTypes = new Set(['any', 'primitive', 'number']);

    if (!validTypes.has(left)) {
      throw nodeError(node, `Invalid ${node.operator} expression: left operand is not a number.`);
    }

    if (!validTypes.has(right)) {
      throw nodeError(node, `Invalid ${node.operator} expression: right operand is not a number.`);
    }

    node.inferredType = 'number';
    return;

  }

  if (binaryComparisonOperatorTypes[node.operator]) {

    node.inferredType = 'boolean';
    return;

  }

  throw nodeError(node, 'Unknown operator "' + node.operator + '"');

};

Scope.prototype._inferIdentifier = function(node) {

  this._assertIdentifier(node);
  node.inferredType = this.types[node.name];

};

Scope.prototype._assertIdentifier = function(node) {

  if (!this.types[node.name]) {
    throw nodeError(node, 'Unknown variable "' + node.name + '"');
  }

};

Scope.prototype._inferCallExpression = function(node) {

  let functionSignature = this.inferType(node.callee);

  if (fuzzyType(functionSignature)) {
    functionSignature = this._inferMemberExpressionAsStringMethod(node.callee);
  }

  if (typeof functionSignature !== 'object') {
    throw nodeError(node, 'Type error: Function call on target that is not a function.');
  }

  node.inferredType = functionSignature.returnType;
  node.callee.inferredType = 'Function';

  // check the type and arity of the arguments

  if (typeof functionSignature.args === 'function') {
    functionSignature.args(this, node);
    return;
  }

  if (!Array.isArray(functionSignature.args)) {
    return;
  }

  if (node.arguments.length !== functionSignature.args.length) {
    throw nodeError(node, 'method expects ' + functionSignature.args.length +
      ' arguments, but got ' + node.arguments.length + ' instead');
  }

  node.arguments.forEach(function(arg, i) {
    const argType = this.inferType(arg);

    if (fuzzyType(argType)) {
      return;
    }

    if (argType !== functionSignature.args[i]) {
      throw nodeError(arg, 'method expects argument ' + (i + 1) + ' to be a ' +
        functionSignature.args[i] + ', but got ' + arg.inferredType);
    }

  }, this);

};

Scope.prototype._inferMemberExpression = function(node) {

  const objectType = this.inferType(node.object);

  if (isPrimitiveType(objectType) && !properties.string[node.property.name]) {
    throw nodeError(node, `No such method/property '${node.property.name}'`);
  }

  if (!properties[objectType]) {
    node.inferredType = 'any';
    return;
  }

  node.inferredType = properties[objectType][node.property.name];

  if (!node.inferredType) {
    throw nodeError(node, `Could not find property "${node.property.name}" of "${objectType}"`);
  }
};

Scope.prototype._inferMemberExpressionAsStringMethod = function(node) {

  const inferredType = properties.string[node.property.name];

  if (!inferredType || typeof inferredType !== 'object') {
    node.inferredType = 'any';
  } else {
    node.inferredType = inferredType;
    node.object.inferredType = 'string';
  }

  return node.inferredType;
};

Scope.prototype._inferConditionalExpression = function(node) {

  const consequent = this.inferType(node.consequent);
  const alternate = this.inferType(node.alternate);

  if (consequent === alternate) {
    node.inferredType = consequent;
    return;
  }

  const isPromitive = isPrimitiveType(consequent) && isPrimitiveType(alternate);

  node.inferredType = isPromitive ? 'primitive' : 'any';
};

module.exports = Scope;
