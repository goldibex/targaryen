
'use strict';

var esprima = require('esprima'),
  Scope = require('./Scope');

function parseRule(ruleStr, wildchildren) {

  var localTypes = wildchildren.reduce(function(otherTypes, wildchild) {
    otherTypes[wildchild] = 'string';
    return otherTypes;
  }, {});

  var scope = new Scope(localTypes);
  var ast = esprima.parse(ruleStr, { range: true });

  if (ast.body.length !== 1 || ast.body[0].type !== 'ExpressionStatement') {
    throw new Error('Rule is not a single expression');
  }

  ast = ast.body[0];

  scope.inferType(ast);

  if (ast.expression.inferredType !== 'boolean') {
    throw new Error('Expression does not evaluate to a boolean');
  }

  return ast;

}

module.exports = parseRule;
