/**
 * Define an abstract Node.
 *
 * It include a method to register each Node implementation mapping to the
 * expression is handle; it avoids circular reference.
 *
 * @typedef {{name: string, returnType: string, args: function|array}} FuncSignature
 *
 */

'use strict';

const types = require('../types');
const expressionTypes = new Map([]);

/**
 * Error reporting an invalid expression.
 */
class ParseError extends Error {

  constructor(node, msg) {
    super(node.original + ': ' + msg);

    this.start = node.astNode.range[0];
    this.end = node.astNode.range[1];
  }

}

/**
 * A Node must ensure an expression is supported by firebase an valid. It then
 * must evaluate the expression.
 *
 * During instantiation, a node must walk each children expression and should
 * attempt to infer its type.
 *
 * The type of its children must be valididated. If they are invalid it must
 * throw an Error. Some expressions can delay type validation until runtime
 * evaluation and will infer their type to 'any' or 'primitive' in this case.
 *
 */
class Node {

  constructor(source, astNode, scope) {
    this.original = source.slice(astNode.range[0], astNode.range[1]);
    this.astNode = astNode;
    this.inferredType = undefined;

    this.init(source, astNode, scope);
    this.inferredType = this.inferType(scope);
  }

  /**
   * AST node type.
   *
   * @return {string} This expression node type
   */
  get type() {
    return this.astNode.type;
  }

  /**
   * Hook called before type inferring.
   *
   * Should be used to setup children nodes.
   *
   * @param  {string} source  Rule getting evaluated
   * @param  {object} astNode ast node to represent
   * @param  {object} scope   list of defined variable/properties.
   * @return {void}
   */
  init() {}

  /**
   * Infer type of the expression the node describe.
   *
   * Should return the type as a string or as an object when the expression
   * infer to a function.
   *
   * @abstract
   * @param  {object} scope   list of defined variable/properties.
   * @return {string|FuncSignature}
   */
  inferType() {
    throw new ParseError(this, `inferring ${this.astNode.type} is not supported`);
  }

  /**
   * Evaluate expression.
   *
   * @abstract
   * @param  {object} state Avalaible variables
   * @return {string|number|boolean|RegExp|object}
   */
  evaluate() {
    throw new ParseError(this, `evaluating ${this.astNode.type} is not supported`);
  }

  /**
   * Return the original expression unparsed by esprima.
   *
   * @return {string}
   */
  toString() {
    return this.original;
  }

  /**
   * Yield every evaluation and return formatted representation of the expression.
   *
   * @param  {object} state Avalaible variables
   * @param  {function({original: string, detailed: string, type: string, value: any}): void} cb Evaluation accumulator
   * @return {string}
   */
  debug(state, cb) {
    const value = this.evaluate(state);
    const detailed = this.toString();

    cb({
      type: this.astNode.type,
      original: this.original,
      detailed,
      value
    });

    return {detailed, value};
  }

  /**
   * Helper checking a type is one of an allowed list of type.
   *
   * It will return `true` when it is and false it could be one. An exception
   * is raised when the type is not allowed or when the `mustComply` option is
   * set to `true` (false by default) and the type is fuzzy.
   *
   * @param  {string}                             nodeType      Type to check
   * @param  {string|array<string>}               allowedTypes  Allowed types
   * @param  {{mustComply: boolean, msg: string}} opts          Options
   * @return {boolean}
   */
  assertType(nodeType, allowedTypes, opts) {
    allowedTypes = [].concat(allowedTypes);
    opts = opts || {};

    if (!allowedTypes.length) {
      throw new Error('No allowed type(s) provided');
    }

    if (allowedTypes.some(t => t === nodeType)) {
      return true;
    }

    if (!opts.mustComply && types.isFuzzy(nodeType)) {
      return false;
    }

    throw new ParseError(this, opts.msg || `Expected type(s) "${allowedTypes.join(', ')}"; Got "${nodeType}." `);
  }

  /**
   * Parse a js AST.
   *
   * @param  {string} source  Original rule getting parsed
   * @param  {object} astNode AST of the node to evaluate
   * @param  {Scope}  scope   Context scope
   * @return {Node}
   */
  static from(source, astNode, scope) {
    const Klass = expressionTypes.get(astNode.type);

    if (!Klass) {
      throw new Error(`${astNode.type} is not supported.`);
    }

    return new Klass(source, astNode, scope);
  }

  static register(type, Klass) {
    expressionTypes.set(type, Klass);
  }

}

exports.Node = Node;
exports.ParseError = ParseError;
