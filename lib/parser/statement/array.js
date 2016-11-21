/**
 * Node handling array expression validation and evaluation.
 *
 * There's no requirement regarding its element types.
 *
 */

'use strict';

const base = require('./base');

const Node = base.Node;

class ArrayNode extends Node {

  init(source, astNode, scope) {
    this.elements = astNode.elements.map(n => Node.from(source, n, scope));
  }

  inferType() {
    return 'array';
  }

  evaluate(state) {
    return this.elements.map(e => e.evaluate(state));
  }

}

Node.register('ArrayExpression', ArrayNode);
