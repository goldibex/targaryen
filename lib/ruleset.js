
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
  (function traverse(rulesObject, stack) {

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

            rulesObject[key] = new Rule(rulesObject[key], wildchildren, key === '.write' || key === '.validate');
            rulesObject[key].wildchildren = wildchildren;

          } catch(e) {
            throw ruleError(stack, e.message);
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
          traverse(rulesObject[key], stack);
        }

      }

      stack.pop();

    });

  })(rulesDefinition.rules, []);

  this._rules = rulesDefinition.rules;

}


Ruleset.prototype.get = function(path, kind) {

  var rules = [];

  if (kind.charAt(0) !== '.') {
    kind = '.' + kind;
  }

  (function traverse(ruleNode, currentPath, remainingPath) {

    var rule = ruleNode[kind];
    if (rule === undefined) {
      rule = null;
    }

    var ruleDef = {
      path: '/' + currentPath.join('/'),
      rule: rule
    };

    if (ruleNode['.name']) {
      ruleDef.wildchild = {
        name: ruleNode['.name'],
        value: currentPath[currentPath.length-1]
      };
    }

    rules.push(ruleDef);

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

Ruleset.prototype.tryRead = function(path, root, auth) {

  var state = {
    auth: auth === undefined ? null : auth,
    now: Date.now(),
    root: root,
    data: root.child(path)
  };

  // get the rules
  var rules = this.get(path, 'read');

  var result = {
    path: path,
    type: 'read',
    info: '',
    allowed: false
  };

  for (var i = 0; i < rules.length; i++) {

    var ruleDef = rules[i];
    result.info += ruleDef.path;
    if (ruleDef.rule === null) {
      result.info += ':<no rules>\n';
    } else {

      if (ruleDef.wildchild) {
        state[ruleDef.wildchild.name] = ruleDef.wildchild.value;
      }

      result.info += '/: "' + ruleDef.rule.toString() + '"\n';

      var thisRuleResult;
      try {
        thisRuleResult = ruleDef.rule.evaluate(state);
      } catch(e) {
        result.info += e.message + '\n';
        thisRuleResult = false;
      }

      result.info += '    => ' + thisRuleResult + '\n';

      if (thisRuleResult === true) {
        result.allowed = true;
        break;
      }

    }

  }

  if (result.allowed) {
    result.info += 'Read was allowed.';
  } else {
    result.info += 'No .read rule allowed the operation.\n';
    result.info += 'Read was denied.';
  }

  return result;

};


Ruleset.prototype.tryWrite = function(path, root, newData, auth) {

  // write encompasses both the cascading write rules and the
  // non-cascading validate rules

  var state = {
    auth: auth === undefined ? null : auth,
    now: Date.now(),
    root: root,
    data: root.child(path),
    newData: newData
  };

  // get the rules
  var writeRules = this.get(path, 'write'),
    validateRules = this.get(path, 'validate');

  var result = {
    path: path,
    type: 'write',
    info: '',
    allowed: false,
    writePermitted: false,
    validated: true
  };

  for (var i = 0; i < writeRules.length; i++) {

    var writeRuleDef = writeRules[i],
      validateRuleDef = validateRules[i],
      thisRuleResult;

    if (writeRuleDef.rule === null && validateRuleDef.rule === null) {
      result.info += writeRuleDef.path + ':<no rules>\n';
      continue;
    }

    if (writeRuleDef.rule !== null && !result.writePermitted) {

      if (writeRuleDef.wildchild) {
        state[writeRuleDef.wildchild.name] = writeRuleDef.wildchild.value;
      }

      result.info += writeRuleDef.path + '/:write: "' + writeRuleDef.rule.toString() + '"\n';

      try {
        thisRuleResult = writeRuleDef.rule.evaluate(state);
      } catch(e) {
        result.info += e.message + '\n';
        thisRuleResult = false;
      }

      result.info += '    => ' + thisRuleResult + '\n';

      if (thisRuleResult === true) {
        result.writePermitted = true;
      }

    }

    if (validateRuleDef.rule !== null && result.validated) {

      if (validateRuleDef.wildchild) {
        state[validateRuleDef.wildchild.name] = validateRuleDef.wildchild.value;
      }

      result.info += validateRuleDef.path + '/:validate: "' + validateRuleDef.rule.toString() + '"\n';

      try {
        thisRuleResult = validateRuleDef.rule.evaluate(state);
      } catch(e) {
        result.info += e.message + '\n';
        thisRuleResult = false;
      }

      result.info += '    => ' + thisRuleResult + '\n';

      if (thisRuleResult === false) {
        result.validated = false;
        break;
      }

    }

  }

  if (!result.writePermitted) {
    result.info += 'No .write rule allowed the operation.\n';
  } else if (!result.validated) {
    result.info += 'Validation failed.\n';
  }

  if (result.writePermitted && result.validated) {
    result.allowed = true;
    result.info += 'Write was allowed.';
  } else {
    result.info += 'Write was denied.';
  }

  return result;
};



module.exports = Ruleset;
