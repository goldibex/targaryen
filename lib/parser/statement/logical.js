/**
 * Node handling logical expressions validation and evaluation.
 *
 * Left and right child node must infer to a boolean and it cannot be delay to
 * run time evaluation.
 */

'use strict';

const base = require('./base');
const pad = require('../../pad');

const Node = base.Node;
const ParseError = base.ParseError;

class LogicalNode extends Node {

  init(source, astNode, scope) {
    this.left = Node.from(source, astNode.left, scope);
    this.right = Node.from(source, astNode.right, scope);
  }

  get operator() {
    return this.astNode.operator;
  }

  /**
   * Infer type of the logical expression and assert it's a boolean.
   *
   * Each side of the expression must infer to a boolean:
   *
   * - `auth.uid && auth.isAdmin` would throw.
   * - `auth.uid != null && auth.isAdmin == true` would return `boolean`.
   *
   * @return {string}
   */
  inferType() {
    const left = this.left.inferredType;
    const right = this.right.inferredType;
    const mustComply = true;
    const msg = side => `${side} operand of ${this.operator} must be boolean.`;

    this.assertType(left, 'boolean', {mustComply, msg: msg('Left')});
    this.assertType(right, 'boolean', {mustComply, msg: msg('Right')});

    return 'boolean';
  }

  evaluate(state) {
    switch (this.operator) {

    case '&&':
      return this.left.evaluate(state) && this.right.evaluate(state);

    case '||':
      return this.left.evaluate(state) || this.right.evaluate(state);

    default:
      throw new ParseError(this, `unknown logical operator ${this.operator}`);

    }
  }

  debug(state, cb) {
    let value, left, right;

    switch (this.operator) {

    case '&&':
      left = this.left.debug(state, cb);
      value = left.value;
      if (!left.value) {
        right = {detailed: this.right.toString()};
        break;
      }

      right = this.right.debug(state, cb);
      value = right.value;
      break;

    case '||':
      left = this.left.debug(state, cb);
      value = left.value;
      if (left.value) {
        right = {detailed: this.right.toString()};
        break;
      }

      right = this.right.debug(state, cb);
      value = right.value;
      break;

    default:
      throw new ParseError(this, `unknown logical operator ${this.operator}`);

    }

    const lFormat = pad.lines(left.detailed).trimRight();
    const rFormat = pad.lines(right.detailed).trim();
    const detailed = `(\n${lFormat}  [=> ${left.value}]\n  ${this.operator} ${rFormat}  [=> ${right.value}]\n)`;

    cb({
      type: this.astNode.type,
      original: this.original,
      detailed,
      value
    });

    return {value, detailed};
  }

  toString() {
    const left = pad.lines(this.left.toString()).trimRight();
    const right = pad.lines(this.right.toString()).trimRight();

    return `(\n${left} ${this.operator}\n${right}\n)`;
  }

}

Node.register('LogicalExpression', LogicalNode);
