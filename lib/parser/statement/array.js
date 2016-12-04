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

  toString() {
    const elements = this.elements.map(e => e.toString());

    return `[${elements.join(', ')}]`;
  }

  debug(state, cb) {
    const evaluations = this.elements.map(el => el.debug(state, cb));
    const value = evaluations.map(ev => ev.value);
    const detailed = `[${evaluations.map(ev => ev.detailed).join(', ')}]`;

    cb({
      type: this.astNode.type,
      original: this.original,
      detailed,
      value
    });

    return {detailed, value};
  }

}

Node.register('ArrayExpression', ArrayNode);
