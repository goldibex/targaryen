/**
 * Node handling literal expressions validation and evaluation.
 *
 * The only validation concernes the RepExp flags of which on "i" is supported
 * by firebase.
 *
 * TODO: support of ther RexExp limitations.
 *
 */

'use strict';

const base = require('./base');
const types = require('../types');

const Node = base.Node;

class LiteralNode extends Node {

  init() {
    const value = this.astNode.value;

    this.value = value instanceof RegExp ? LiteralNode.regExp(this.astNode.raw) : value;
  }

  inferType() {
    const type = types.from(this.value);
    const mustComply = true;

    this.assertType(type, ['number', 'boolean', 'string', 'null', 'RegExp'], {mustComply});

    return type;
  }

  evaluate() {
    return this.value;
  }

  toString() {
    return JSON.stringify(this.value);
  }

  static regExp(rawValue) {
    const regExpDef = /^\/(.+)\/(.*)$/.exec(rawValue);

    if (!regExpDef) {
      throw new Error(`Unsupported RegExp literal "${rawValue}".`);
    }

    const body = regExpDef[1];
    const flags = regExpDef[2];

    if (flags && flags !== 'i') {
      throw new Error(`Unsupported RegExp flags ${flags}.`);
    }

    return new RegExp(body, flags);
  }

}

Node.register('Literal', LiteralNode);
