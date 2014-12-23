
'use strict';

var parseRule = require('./parser/parse-rule');

var validRuleKinds = {
  read: true,
  write: true,
  validate: true,
  indexOn: true
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

        var ruleKind = key.slice(1);
        if (!isValidRuleKind(ruleKind)) {
          throw ruleError(stack, 'invalid rule type "' + ruleKind + '"');
        } else if (typeof rulesObject[key] === 'boolean') {
          rulesObject[key] = rulesObject[key].toString();
        } else if (typeof rulesObject[key] !== 'string') {
          throw ruleError(stack, 'expected string or boolean, but got ', typeof rulesObject[key]);
        }

        if (ruleKind === 'read' || ruleKind === 'write' || ruleKind === 'validate') {

          try {

            // get all the wildchildren out of the stack
            var wildchildren = stack.filter(function(key) {
              return key.charAt(0) === '$';
            });
            rulesObject[key] = parseRule(rulesObject[key], wildchildren);

          } catch(e) {
            throw ruleError(stack, '"' + rulesObject[key] + '"' +
              e.start + ':' + e.message);
          }


        } else if (ruleKind === 'indexOn' && typeof rulesObject[key] !== 'string') {
          throw ruleError(stack, 'indexOn expects a string, but got ' + typeof rulesObject[key]);
        }

      } else {

        if (typeof rulesObject[key] !== 'object' || rulesObject[key] === 'null') {
          throw ruleError(stack, 'should be object, but got ' + rulesObject[key] === null ? null : typeof rulesObject[key]);
        } else {
          traverse(rulesObject[key]);
        }

      }

      stack.pop(key);

    });

  })(rulesDefinition.rules);

}


module.exports = Ruleset;
