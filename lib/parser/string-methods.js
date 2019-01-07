/**
 * String methods.
 *
 * Might have a different behaviour and have stricter type validation.
 *
 */

'use strict';

const replaceall = require('replaceall');

module.exports = {

  contains(str, substr) {
    if (typeof substr !== 'string') {
      throw new Error(`${substr} is not a string.`);
    }

    return str.indexOf(substr) !== -1;
  },

  beginsWith(str, substr) {
    if (typeof substr !== 'string') {
      throw new Error(`${substr} is not a string.`);
    }

    return str.indexOf(substr) === 0;
  },

  endsWith(str, substr) {
    if (typeof substr !== 'string') {
      throw new Error(`${substr} is not a string.`);
    }

    const strSuffix = str.substring(str.length - substr.length, str.length)
    return strSuffix === substr
  },

  replace(str, substr, replacement) {
    if (typeof substr !== 'string' || typeof replacement !== 'string') {
      throw new Error(`${substr} is not a string.`);
    }

    return replaceall(substr, replacement, str);
  },

  matches(str, regex) {
    return regex.test(str);
  }

};
