/**
 * Node handling Object's property expressions validation and evaluation.
 */

'use strict';

const stringMethods = require('../string-methods');
const base = require('./base');
const types = require('../types');
const scopeFactory = require('../scope');

const Node = base.Node;
const ParseError = base.ParseError;

class MemberNode extends Node {

  static get properties() {
    return {

      string: {
        contains: {name: 'contains', args: ['string'], returnType: 'boolean'},
        beginsWith: {name: 'beginsWith', args: ['string'], returnType: 'boolean'},
        endsWith: {name: 'endsWith', args: ['string'], returnType: 'boolean'},
        replace: {name: 'replace', args: ['string', 'string'], returnType: 'string'},
        toLowerCase: {name: 'toLowerCase', args: [], returnType: 'string'},
        toUpperCase: {name: 'toUpperCase', args: [], returnType: 'string'},
        matches: {name: 'matches', args: ['RegExp'], returnType: 'boolean'},
        length: 'number'
      },

      RuleDataSnapshot: {
        val: {name: 'val', args: [], returnType: 'primitive'},
        child: {name: 'child', args: ['string'], returnType: 'RuleDataSnapshot'},
        parent: {name: 'parent', args: [], returnType: 'RuleDataSnapshot'},
        hasChild: {name: 'hasChild', args: ['string'], returnType: 'boolean'},
        hasChildren: {
          name: 'hasChildren',
          args(scope, fnNode, mustComply) {

            if (fnNode.arguments.length === 0) {
              return;
            }

            if (fnNode.arguments.length > 1) {
              throw new ParseError(fnNode, 'Too many arguments to hasChildren');
            }

            const keyList = fnNode.arguments[0];

            if (!keyList.elements) {
              throw new ParseError(fnNode, 'hasChildren takes 1 argument: an array of strings');
            }

            if (keyList.elements.length === 0) {
              throw new ParseError(fnNode, 'hasChildren got an empty array, expected some strings in there');
            }

            keyList.elements.forEach(
              element => fnNode.assertType(element.inferredType, 'string', {
                mustComply,
                msg: 'hasChildren got an array with a non-string value'
              })
            );

          },
          returnType: 'boolean'
        },
        exists: {name: 'exists', args: [], returnType: 'boolean'},
        getPriority: {name: 'getPriority', args: [], returnType: 'any'},
        isNumber: {name: 'isNumber', args: [], returnType: 'boolean'},
        isString: {name: 'isString', args: [], returnType: 'boolean'},
        isBoolean: {name: 'isoolean', args: [], returnType: 'boolean'}
      }

    };
  }

  init(source, astNode, scope) {
    this.object = Node.from(source, astNode.object, scope);

    const msg = `No such method/property ${this.astNode.property.name}`;
    let objectType = this.object.inferredType;

    this.assertType(objectType, ['RuleDataSnapshot', 'string'], {msg});

    if (types.isPrimitive(objectType)) {
      objectType = this.object.inferredType = 'string';
    }

    if (this.computed) {
      this.property = Node.from(source, astNode.property, scope);
      return;
    }

    try {
      this.property = Node.from(
        source,
        astNode.property,
        objectType === 'any' ? scopeFactory.any() : scopeFactory.create(MemberNode.properties[objectType])
      );
    } catch (e) {
      throw new ParseError(this, msg);
    }
  }

  get computed() {
    return this.astNode.computed;
  }

  inferType() {
    if (!this.computed) {
      return this.property.inferredType;
    }

    const msg = 'Invalid property access.';
    const objectType = this.object.inferredType;

    if (types.isFuzzy(objectType)) {
      return 'any';
    }

    if (this.property.type !== 'Literal') {
      throw new ParseError(this, msg);
    }

    const scope = MemberNode.properties[objectType];

    if (scope == null) {
      throw new ParseError(this, msg);
    }

    const type = scope[this.property.value];

    if (type == null) {
      throw new ParseError(this, msg);
    }

    return type;
  }

  inferAsStringMethod() {
    this.object.inferredType = 'string';

    if (!this.computed) {
      this.property.inferredType = this.property.inferType(scopeFactory.create(MemberNode.properties.string));
    }

    return this.inferType();
  }

  evaluate(state) {
    const object = this.object.evaluate(state);
    const key = this.computed ? this.property.evaluate(state) : this.property.name;

    return this.evaluateWith(state, object, key);
  }

  debug(state, cb) {
    const object = this.object.debug(state, cb);
    let detailed, key;

    if (this.computed) {
      const ev = this.property.debug(state, cb);

      key = ev.value;
      detailed = `${object.detailed}[${ev.detailed}]`;
    } else {
      key = this.property.name;
      detailed = `${object.detailed}.${key}`;
    }

    const value = this.evaluateWith(state, object.value, key);

    cb({
      type: this.astNode.type,
      original: this.original,
      detailed,
      value
    });

    return {detailed, value};
  }

  evaluateWith(state, object, key) {
    const isPatched = types.isString(types.from(object)) && stringMethods[key];
    const property = isPatched ? stringMethods[key] : (object && object[key]);

    if (property === undefined) {
      return null;
    }

    if (typeof property !== 'function') {
      return property;
    }

    return isPatched ? property.bind(null, object) : property.bind(object);
  }

  toString() {
    return this.computer ? `${this.object}[${this.property}]` : `${this.object}.${this.property}`;
  }

}

Node.register('MemberExpression', MemberNode);
