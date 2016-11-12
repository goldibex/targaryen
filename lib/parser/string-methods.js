
'use strict';

const replaceall = require('replaceall');

module.exports = {

  contains(str, substr) {
    return str.indexOf(substr) !== -1;
  },
  beginsWith(str, substr) {
    return str.indexOf(substr) === 0;
  },
  endsWith(str, substr) {
    return str.indexOf(substr) + substr.length === str.length;
  },
  replace(str, substr, replacement) {
    return replaceall(substr, replacement, str);
  },
  matches(str, regex) {
    return regex.test(str);
  }

};
