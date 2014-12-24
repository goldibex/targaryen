
'use strict';

var Rule = require('./parser/rule');

var validRuleKinds = {
  '.read': true,
  '.write': true,
  '.validate': true,
  '.indexOn': true,
  '.name': true
};

function ruleError(rulePath, message) {

  var err = new Error(rulePath.join('/') + ': ' + message);
  return err;

}

function isValidRuleKind(ruleKind) {
  return validRuleKinds[ruleKind] !== undefined;
}

function Ruleset(rulesDefinition) {

  if (typeof rulesDefinition !== 'object' ||
    rulesDefinition === null ||
    Object.keys(rulesDefinition).length !== 1 ||
    !rulesDefinition.hasOwnProperty('rules')) {
    throw new Error('Rules definition must have a single root object with property "rules"');
  }

  // traverse, parse and validate all the rules
  var stack = [];
  (function traverse(rulesObject) {

    Object.keys(rulesObject).forEach(function(key) {

      stack.push(key);

      if (key.charAt(0) === '.') {

        if (!isValidRuleKind(key)) {
          throw ruleError(stack, 'invalid rule type "' + key + '"');
        } else if (key === '.indexOn' && typeof rulesObject[key] !== 'string') {
          throw ruleError(stack, 'indexOn expects a string, but got ' + typeof rulesObject[key]);
        } else if (typeof rulesObject[key] === 'boolean') {
          rulesObject[key] = rulesObject[key].toString();
        } else if (typeof rulesObject[key] !== 'string') {
          throw ruleError(stack, 'expected string or boolean, but got ' + typeof rulesObject[key]);
        }

        if (key === '.read' || key === '.write' || key === '.validate') {

          try {

            // get all the wildchildren out of the stack
            var wildchildren = stack.filter(function(key) {
              return key.charAt(0) === '$';
            });

            rulesObject[key] = new Rule(rulesObject[key], wildchildren);
            rulesObject[key].wildchildren = wildchildren;

          } catch(e) {
            throw ruleError(stack, '"' + rulesObject[key] + '":' +
              e.start + ': ' + e.message);
          }


        }

      } else {

        // handle wildchild lookups
        if (key.charAt(0) === '$') {

          // rename this to the "wild" operator on this path
          if (!rulesObject.hasOwnProperty('$')) {

            rulesObject.$ = rulesObject[key];
            rulesObject.$['.name'] = key;
            delete rulesObject[key];
            key = '$';

          } else {
            throw ruleError(stack, 'there can only be one wildchild at a given path');
          }

        }

        if (typeof rulesObject[key] !== 'object' || rulesObject[key] === 'null') {
          throw ruleError(stack, 'should be object, but got ' +
            rulesObject[key] === null ? null : typeof rulesObject[key]);
        } else {
          traverse(rulesObject[key]);
        }

      }

      stack.pop(key);

    });

  })(rulesDefinition.rules);

  this._rules = rulesDefinition.rules;

}


Ruleset.prototype.get = function(path, kind) {

  var rules = [];

  if (kind.charAt(0) !== '.') {
    kind = '.' + kind;
  }

  (function traverse(ruleNode, currentPath, remainingPath) {

    if (ruleNode.hasOwnProperty(kind)) {

      rules.push({
        path: currentPath.join('/'),
        rule: ruleNode[kind]
      });

    }

    if (remainingPath.length > 0) {

      var pathPart = remainingPath[0];

      if (ruleNode.hasOwnProperty(pathPart) || ruleNode.hasOwnProperty('$')) {

        var subnode = ruleNode[pathPart];
        if (subnode === undefined) {
          subnode = ruleNode.$;
        }

        if (typeof subnode === 'object') {
          traverse(subnode, currentPath.concat(pathPart), remainingPath.slice(1));
        }

      }

    }

  })(this._rules, [], path.split('/'));

  return rules;

};


Ruleset.prototype.canRead = function(path, root, auth) {

  var data = root.child(path);
  if (auth === undefined) {
    auth = null;
  }

  // get the rules
  var rules = this.get(path, 'read');

  rules.forEach(function(rule) {

  });

};

Ruleset.prototype.canWrite = function(path, root, newData, auth) {

  var data = root.child(path);
  if (auth === undefined) {
    auth = null;
  }

};

Ruleset.prototype.canValidate = function(path, root, newData, auth) {

  var data = root.child(path);
  if (auth === undefined) {
    auth = null;
  }

};


module.exports = Ruleset;
