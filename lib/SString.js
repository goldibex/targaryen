
var replaceall = require('replaceall');


String.prototype.contains = function(substr) {
  return this._str.indexOf(substr) !== -1;
};


String.prototype.beginsWith = function(substr) {
  return this._str.indexOf(substr) === 0;
};


String.prototype.endsWith = function(substr) {
  return this._str.indexOf(substr) + substr.length === this.length;
};


String.prototype.replace = function(substr, replacement) {
  return new SString(replaceall(substr, replacement, this._str));
};


String.prototype.matches = function(regex) {
  return regex.test(this._str);
};

