/**
 * Node handling root expressions validation and evaluation (delefated to its
 * child).
 *
 */

'use strict';

const base = require('./base');

const Node = base.Node;

class ExpressionNode extends Node {

  init(source, astNode, scope) {
    this.expression = Node.from(source, astNode.expression, scope);
  }

  inferType() {
    return this.expression.inferredType;
  }

  evaluate(state) {
    return this.expression.evaluate(state);
  }

  toString() {
    return this.expression.toString();
  }

  debug(state, cb) {
    const ev = this.expression.debug(state, cb);
    const value = ev.value;
    const detailed = ev.detailed;

    cb({
      type: this.astNode.type,
      original: this.original,
      detailed,
      value
    });

    return {detailed, value};
  }

}

Node.register('ExpressionStatement', ExpressionNode);
