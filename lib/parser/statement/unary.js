/**
 * Node handling unary expressions validation and evaluation.
 *
 * - Only support "-" and "!" operations (doesn't support "+" operation).
 * - "!" only support operations on a boolean element and type validation can't
 *   be delayed until runtime evaluation.
 * - "-" only support operations on a number element but validation can be
 *   delayed.
 *
 */

'use strict';

const base = require('./base');
const types = require('../types');

const Node = base.Node;
const ParseError = base.ParseError;

class UnaryNode extends Node {

  init(source, astNode, scope) {
    this.argument = Node.from(source, astNode.argument, scope);
  }

  get operator() {
    return this.astNode.operator;
  }

  /**
   * Infer the expression and argument types.
   *
   * It will throw the the type of the logical NOT operator argument is not a
   * number.
   *
   * A unary negation operator argument type check can be done at run time.
   *
   * @return {string}
   */
  inferType() {
    const argType = this.argument.inferredType;
    const mustComply = true;
    const msg = type => `${this.operator} only operate on ${type}`;

    switch (this.operator) {

    case '!':
      this.assertType(argType, 'boolean', {mustComply, msg: msg('boolean')});
      return 'boolean';

    case '-':
      this.assertType(argType, 'number', {msg: msg('number')});
      return 'number';

    default:
      throw new ParseError(this, `Unary expressions may not contain "${this.operator}" operator.`);

    }
  }

  evaluate(state) {
    const value = this.argument.evaluate(state);

    switch (this.operator) {

    case '!':
      return !value;

    case '-':
      this.assertType(types.from(value), 'number', {mustComply: true, msg: '- only operate on number'});
      return -value;

    default:
      throw new ParseError(this, `Unary expressions may not contain "${this.operator}" operator.`);

    }
  }

}

Node.register('UnaryExpression', UnaryNode);
