
'use strict';

var replaceall = require('replaceall');

module.exports = {

  contains: function(str, substr) {
    return str.indexOf(substr) !== -1;
  },
  beginsWith: function(str, substr) {
    return str.indexOf(substr) === 0;
  },
  endsWith: function(str, substr) {
    return str.indexOf(substr) + substr.length === str.length;
  },
  replace: function(str, substr, replacement) {
    return replaceall(substr, replacement, str);
  },
  matches: function(str, regex) {
    return regex.test(str);
  }

};
