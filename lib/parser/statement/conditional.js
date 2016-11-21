/**
 * Node handling tertiary expressions validation and evaluation.
 *
 * Validate the test and the two concequences nodes.
 *
 * The test inferred type must be boolean and cannot be delayed. There is no
 * requirement of the tertiay inferred type; it can be anything.
 *
 */

'use strict';

const base = require('./base');
const types = require('../types');

const Node = base.Node;

class ConditionalNode extends Node {

  init(source, astNode, scope) {
    this.test = Node.from(source, astNode.test, scope);
    this.consequent = Node.from(source, astNode.consequent, scope);
    this.alternate = Node.from(source, astNode.alternate, scope);
  }

  /**
   * Infer type of a conditional node.
   *
   * The test must inferred to a boolean.
   *
   * The two branches can have any type; they don't need to be identical.
   *
   * @return {[type]} [description]
   */
  inferType() {
    const mustComply = true;
    const msg = ' condition of ? must be boolean.';

    this.assertType(this.test.inferredType, 'boolean', {mustComply, msg});

    const consequent = this.consequent.inferredType;
    const alternate = this.alternate.inferredType;

    if (consequent === alternate) {
      return consequent;
    }

    const isPrimitive = types.isPrimitive(consequent) && types.isPrimitive(alternate);

    return isPrimitive ? 'primitive' : 'any';
  }

  evaluate(state) {
    const test = this.test.evaluate(state);

    return test ? this.consequent.evaluate(state) : this.alternate.evaluate(state);
  }

}

Node.register('ConditionalExpression', ConditionalNode);
