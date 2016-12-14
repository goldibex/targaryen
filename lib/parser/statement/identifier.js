/**
 * Node handling binary expressions validation and evaluation (delegated to the
 * scope and state objects).
 *
 */

'use strict';

const base = require('./base');

const Node = base.Node;
const ParseError = base.ParseError;

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

class IdentifierNode extends Node {

  get name() {
    return this.astNode.name;
  }

  inferType(scope) {
    if (!scope.has(this.name)) {
      throw new ParseError(this, `${this.name} is undefined`);
    }

    return scope.getTypeOf(this.name);
  }

  evaluate(state) {
    if (!hasOwnProperty(state, this.name)) {
      throw new ParseError(this, 'unknown variable ' + this.name);
    }

    return state[this.name];
  }

}

Node.register('Identifier', IdentifierNode);
