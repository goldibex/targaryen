
'use strict';

var extend = require('extend'),
  Rule = require('./parser/rule'),
  RuleDataSnapshot = require('./rule-data-snapshot');

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


function makeNewDataSnap(path, newData) {

  path = path.replace(/^\/+/, '');
  var result;

  if (path.length === 0) {
    result = newData;
  } else {

    var workObject = {};
    result = workObject;

    path.split('/').forEach(function(pathPart, i, pathParts) {

      if (pathParts.length - i === 1) {
        workObject[pathPart] = newData;
      } else {
        workObject[pathPart] = {};
      }
      workObject = workObject[pathPart];

    });

  }

  return new RuleDataSnapshot(result);

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

        if (!validRuleKinds.hasOwnProperty(key)) {
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
    auth: state.auth,
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

  var newDataRoot = makeNewDataSnap(path, RuleDataSnapshot.convert(newData));

  var result = {
    path: path,
    type: 'write',
    info: '',
    allowed: false,
    auth: auth === undefined ? null : auth,
    writePermitted: false,
    validated: true,
    data: root.child(path).val(),
    newData: newDataRoot.child(path).val()
  };

  // walk down the rules hierarchy -- to get the .write and .validate rules along here
  (function traverse(pathParts, remainingPath, rules, wildchildren) {

    var currentPath = pathParts.join('/'),
      rule,
      nextPathPart;

    var state = extend({
      auth: result.auth,
      now: Date.now(),
      root: root,
      data: root.child(currentPath),
      newData: newDataRoot.child(currentPath)
    }, wildchildren);

    if (!result.writePermitted && rules.hasOwnProperty('.write')) {

      rule = rules['.write'];
      result.info += '/' + currentPath + ':.write: "' + rule + '"\n';

      try {

        if (rule.evaluate(state) === true) {

          result.writePermitted = true;
          result.info += '    => true\n';

        } else {
          result.info += '    => false\n';
        }

      } catch(e) {
        result.info += e.message + '\n';
      }

    }

    if (rules.hasOwnProperty('.validate') && result.validated) {

      rule = rules['.validate'];
      result.info += '/' + pathParts.join('/') + ':.validate: "' + rule.toString() + '"\n';

      try {

        if (rule.evaluate(state) === true) {
          result.info += '    => true\n';
        } else {

          result.validated = false;
          result.info += '    => false\n';

        }

      } catch(e) {
        result.info += e.message + '\n';
      }

    }

    if (( nextPathPart = remainingPath.shift() )) {

      if (rules.hasOwnProperty(nextPathPart)) {
        traverse(pathParts.concat(nextPathPart), remainingPath, rules[nextPathPart], wildchildren);
      } else if (rules.hasOwnProperty('$')) {
        // wildchild.
        wildchildren = extend({}, wildchildren);
        wildchildren[rules.$['.name']] = nextPathPart;
        traverse(pathParts.concat(nextPathPart), remainingPath, rules.$, wildchildren);
      }

    } else {

      var val = newDataRoot.child(currentPath).val();
      if (typeof val === 'object' && val !== null) {

        Object.keys(val).forEach(function(key) {

          if (rules.hasOwnProperty(key)) {
            traverse(pathParts.concat(key), remainingPath, rules[key], wildchildren);
          } else if (rules.hasOwnProperty('$')) {
            // wildchild.
            wildchildren = extend({}, wildchildren);
            wildchildren[rules.$['.name']] = nextPathPart;
            traverse(pathParts.concat(key), remainingPath, rules.$, wildchildren);
          }

        });

      }


    }

  })([], path.split('/'), this._rules, {});

  result.allowed = result.writePermitted && result.validated;

  if (!result.writePermitted) {
    result.info += 'No .write rule allowed the operation.\n';
    result.info += 'Write was denied.';
  } else if (!result.validated) {
    result.info += 'Validation failed.\n';
    result.info += 'Write was denied.';
  } else {
    result.info += 'Write was allowed.';
  }

  return result;

};


module.exports = Ruleset;
