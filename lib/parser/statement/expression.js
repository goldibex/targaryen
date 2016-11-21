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

}

Node.register('ExpressionStatement', ExpressionNode);
