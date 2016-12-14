/**
 * Node handling binary expressions validation and evaluation.
 *
 * Requirements vary depending of the operator. However they can all delay type
 * validation till runtime evaluation. But even then type restrictions are
 * stricter than JS':
 *
 * - addition only support operations on non null string and number.
 * - other arithmetic operations only support non null number.
 * - (in)equality operations support must types except RegExp.
 * - comparison operations support nullable string and number; it also require
 * the type on each side of the operation.
 *
 */

'use strict';

const base = require('./base');
const types = require('../types');

const Node = base.Node;
const ParseError = base.ParseError;

class BinaryNode extends Node {

  get operator() {
    return this.astNode.operator;
  }

  init(source, astNode, scope) {
    this.left = Node.from(source, astNode.left, scope);
    this.right = Node.from(source, astNode.right, scope);
  }

  inferType() {
    switch (this.operator) {

    case '+':
      this.assertInferredTypes(BinaryNode.additionTypes);

      if (types.isString(this.left.inferredType) || types.isString(this.right.inferredType)) {
        return 'string';
      } else if (types.isNumber(this.left.inferredType) && types.isNumber(this.right.inferredType)) {
        return 'number';
      }

      return 'primitive';

    case '-':
    case '*':
    case '/':
    case '%':
      this.assertInferredTypes(BinaryNode.arithmeticTypes);

      return 'number';

    case '==':
    case '===':
    case '!=':
    case '!==':
      this.assertInferredTypes(BinaryNode.equalityTypes);
      return 'boolean';

    case '>':
    case '>=':
    case '<':
    case '<=':
      this.assertInferredTypes(BinaryNode.comparisonTypes, true);
      return 'boolean';

    default:
      throw new ParseError(this, `Unknown operator "${this.operator}".`);

    }
  }

  toString() {
    return `${this.left} ${this.operator} ${this.right}`;
  }

  evaluate(state) {
    const left = this.left.evaluate(state);
    const right = this.right.evaluate(state);

    return this.evaluateWith(state, left, right);
  }

  debug(state, cb) {
    const left = this.left.debug(state, cb);
    const right = this.right.debug(state, cb);

    const value = this.evaluateWith(state, left.value, right.value);
    const detailed = `${left.detailed} ${this.operator} ${right.detailed}`;

    cb({
      type: this.astNode.type,
      original: this.original,
      detailed,
      value
    });

    return {detailed, value};
  }

  evaluateWith(state, left, right) {
    const lType = types.from(left);
    const rType = types.from(right);
    const mustComply = true;
    const assertTypes = allowed => this.assertBranchTypes(lType, rType, allowed, mustComply);
    const assertSameType = () => {
      if (lType !== rType) {
        throw new ParseError(this, `Invalid ${this.operator} expression: Left and right sides types are differents.`);
      }
    };

    switch (this.operator) {

    case '+':
      assertTypes(BinaryNode.additionTypes);
      return left + right;

    case '-':
      assertTypes(BinaryNode.arithmeticTypes);
      return left - right;

    case '/':
      assertTypes(BinaryNode.arithmeticTypes);
      return right === 0 ? NaN : left / right;

    case '*':
      assertTypes(BinaryNode.arithmeticTypes);
      return left * right;

    case '%':
      assertTypes(BinaryNode.arithmeticTypes);
      return left % right;

    case '!=':
    case '!==':
      assertTypes(BinaryNode.equalityTypes);
      return left !== right;

    case '==':
    case '===':
      assertTypes(BinaryNode.equalityTypes);
      return left === right;

    case '>':
      assertTypes(BinaryNode.comparisonTypes);
      assertSameType();
      return left > right;

    case '>=':
      assertTypes(BinaryNode.comparisonTypes);
      assertSameType();
      return left >= right;

    case '<':
      assertTypes(BinaryNode.comparisonTypes);
      assertSameType();
      return left < right;

    case '<=':
      assertTypes(BinaryNode.comparisonTypes);
      assertSameType();
      return left <= right;

    default:
      throw new ParseError(this, `unknown binary operator "${this.operator}"`);

    }
  }

  assertInferredTypes(allowedTypes, sameType) {
    const left = this.left.inferredType;
    const right = this.right.inferredType;

    this.assertBranchTypes(left, right, allowedTypes);

    if (
      !sameType ||
      types.isFuzzy(left) ||
      types.isFuzzy(right)
    ) {
      return;
    }

    if (left !== right) {
      throw new ParseError(this, `Invalid ${this.operator} expression: Left and right sides types are differents.`);
    }

  }

  assertBranchTypes(left, right, allowedTypes, mustComply) {
    allowedTypes = [].concat(allowedTypes);

    const msg = side => `Invalid ${this.operator} expression: ${side} operand is not a ${allowedTypes.join(' or ')}`;

    this.assertType(left, allowedTypes, {mustComply, msg: msg('Left')});
    this.assertType(right, allowedTypes, {mustComply, msg: msg('Right')});
  }

  static get additionTypes() {
    return ['string', 'number'];
  }

  static get arithmeticTypes() {
    return 'number';
  }

  static get equalityTypes() {
    return ['string', 'number', 'boolean', 'null', 'Object'];
  }

  static get comparisonTypes() {
    return ['string', 'number', 'null'];
  }

}

Node.register('BinaryExpression', BinaryNode);
