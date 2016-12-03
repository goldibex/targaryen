/**
 * Node handling function call expressions validation and evaluation.
 *
 * The callee must infer to a function or to a string method. The argument type
 * validation can be delayed to runtime evaluation (and is then delegated to
 * the function itself).
 *
 */

'use strict';

const base = require('./base');
const types = require('../types');

const Node = base.Node;
const ParseError = base.ParseError;

class CallNode extends Node {

  init(source, astNode, scope) {
    this.callee = Node.from(source, astNode.callee, scope);
    this.arguments = astNode.arguments.map(n => Node.from(source, n, scope));
  }

  inferType(scope) {
    const msg = 'Type error: Function call on target that is not a function.';
    let functionSignature = this.callee.inferredType;

    if (types.isFuzzy(functionSignature)) {
      functionSignature = this.callee.inferAsStringMethod();
    }

    if (typeof functionSignature !== 'object') {
      throw new ParseError(this, msg);
    }

    if (typeof functionSignature.args === 'function') {
      functionSignature.args(scope, this);

      return functionSignature.returnType;
    }

    if (!Array.isArray(functionSignature.args) || !functionSignature.args.length) {
      return functionSignature.returnType;
    }

    const expected = functionSignature.args.length;
    const actual = this.arguments.length;

    if (expected !== actual) {
      throw new ParseError(this, `method expects ${expected} arguments, but got ${actual} instead`);
    }

    this.arguments.forEach((arg, i) => {
      const expected = functionSignature.args[i];
      const actual = arg.inferredType;

      arg.assertType(actual, expected, {
        msg: `method expects argument ${i + 1} to be a ${expected}, but got ${actual}`
      });
    });

    return functionSignature.returnType;
  }

  evaluate(state) {
    const methodArguments = this.arguments.map(arg => arg.evaluate(state));
    const method = this.callee.evaluate(state);

    return this.evaluateWith(state, methodArguments, method);
  }

  debug(state, cb) {
    const argsEvaluation = this.arguments.map(arg => arg.debug(state, cb));
    const method = this.callee.debug(state, cb);

    const methodArguments = argsEvaluation.map(ev => ev.value);
    const value = this.evaluateWith(state, methodArguments, method.value);

    const args = argsEvaluation.map(ev => ev.detailed);
    const detailed = `${method.detailed}(${args.join(', ')})`;

    cb({
      type: this.astNode.type,
      original: this.original,
      detailed,
      value
    });

    return {detailed, value};
  }

  evaluateWith(state, methodArguments, method) {
    if (typeof method !== 'function') {
      throw new ParseError(this, `"${method}" is not a function or method`);
    }

    return method.apply(null, methodArguments);
  }

  toString() {
    const args = this.arguments.map(a => a.toString());

    return `${this.callee}(${args.join(', ')})`;
  }

}

Node.register('CallExpression', CallNode);
