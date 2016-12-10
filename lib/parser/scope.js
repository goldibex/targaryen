/**
 * Scopes are used to check check the type of variables and object properties
 * during rules type inference.
 */

'use strict';

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

/**
 * Check if a variable/property will be available during a rule evaluation.
 */
class Scope {

  /**
   * Scope constructor.
   *
   * @param  {object} types Map variable/properties to their type.
   */
  constructor(types) {
    this.types = Object.assign({}, types);
  }

  /**
   * Test if a variable/property is available.
   *
   * @param  {string}  name Scope name to test
   * @return {boolean}
   */
  has(name) {
    return hasOwnProperty(this.types, name);
  }

  /**
   * Return the type of a variable/property.
   *
   * @param  {string} name Name of variable/property
   * @return {string|FuncSignature|undefined}
   */
  getTypeOf(name) {
    return this.types[name];
  }

  /**
   * Create a `Scope` from a list of wildchildren.
   *
   * @param  {Array<string>} wildchildren List of wildchildren
   * @return {Scope}
   */
  static from(wildchildren) {
    const types = {};

    wildchildren.filter(
      name => name.startsWith('$')
    ).forEach(
      name => { types[name] = 'string'; }
    );

    return new Scope(types);
  }

  // Map of variables available during read and write operations.
  static get rootTypes() {
    return {
      auth: 'any',
      root: 'RuleDataSnapshot',
      data: 'RuleDataSnapshot',
      now: 'number'
    };
  }

  // Map of extra variables available during a write operation.
  static get writeTypes() {
    return {newData: 'RuleDataSnapshot'};
  }

}

/**
 * Create a new `Scope`.
 *
 * @param  {object} types Map variable/properties to their type.
 * @return {Scope}
 */
exports.create = function(types) {
  return new Scope(types);
};

/**
 * Create a scope for a read operation.
 *
 * @param  {Array<string>} wildchildren List of wildchildren
 * @return {Scope}
 */
exports.read = function(wildchildren) {
  const scope = Scope.from(wildchildren);

  Object.assign(scope.types, Scope.rootTypes);

  return scope;
};

/**
 * Create a scope for a write operation.
 *
 * @param  {Array<string>} wildchildren List of wildchildren
 * @return {Scope}
 */
exports.write = function(wildchildren) {
  const scope = Scope.from(wildchildren);

  Object.assign(scope.types, Scope.rootTypes, Scope.writeTypes);

  return scope;
};

/**
 * Create a scope for auth properties access.
 * @return {Scope}
 */
exports.any = function() {
  return {
    get hasNewData() { return false; },
    has() { return true; },
    getTypeOf() { return 'any'; }
  };
};
