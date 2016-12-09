/**
 * Client helper for a live Firebase DB.
 */

'use strict';

const log = require('debug')('targaryen:firebase');
const FirebaseTokenGenerator = require('firebase-token-generator');
const path = require('path');
const request = require('request-promise-native');

const secretPath = process.env.TARGARYEN_SECRET || path.resolve('targaryen-secret.json');

/**
 * Deploy rules to a Firebase Database.
 *
 * By default it will look for the Firebase secret key in "./secret.json"
 * (should hold the "projectId" and "secret")
 *
 * @param  {object|string}                               rules   Rules to upload
 * @param  {{secret: {projecId: string, token: string}}} options Client options
 * @return {Promise<void,Error>}
 */
exports.deployRules = function(rules, options) {
  options = options || {};

  const secret = options.secret || require(secretPath);
  const databaseURL = `https://${secret.projectId}.firebaseio.com`;

  const uri = `${databaseURL}/.settings/rules.json?auth=${secret.token}`;
  const method = 'PUT';
  const body = typeof rules === 'string' ? rules : JSON.stringify({rules}, undefined, 2);

  return request({uri, method, body});
};

/**
 * Deploy data to a Firebase Database.
 *
 * By default it will look for the Firebase secret key in "./secret.json"
 * (should hold the "projectId" and "secret").
 *
 * @param  {any}    data    root data to import
 * @param  {{secret: {projecId: string, token: string}}} options Client options
 * @return {Promise<void,Error>}
 */
exports.deployData = function(data, options) {
  options = options || {};

  const secret = options.secret || require(secretPath);
  const databaseURL = `https://${secret.projectId}.firebaseio.com`;

  const uri = `${databaseURL}/.json?auth=${secret.token}`;
  const method = 'PUT';
  const body = JSON.stringify(data || null);

  return request({uri, method, body});
};

/**
 * Create legacy id token for firebase REST api authentication.
 *
 * By default it will look for the Firebase secret key in "./secret.json"
 * (should hold the "projectId" and "secret").
 *
 * @param  {object} users   Map of name to auth object.
 * @param  {{secret: {projecId: string, token: string}}} options Client options
 * @return {object}
 */
exports.tokens = function(users, options) {
  options = options || {};

  const secret = options.secret || require(secretPath);
  const tokenGenerator = new FirebaseTokenGenerator(secret.token);

  return Object.keys(users || {}).reduce((tokens, name) => {
    const user = users[name];

    tokens[name] = user ? tokenGenerator.createToken(user) : null;

    return tokens;
  }, {});
};

/**
 * Test a path can be read with the given id token.
 *
 * Resolve to true if it can or false if it couldn't. Reject if there was an
 * issue with the request.
 *
 * By default it will look for the Firebase secret key in "./secret.json"
 * (should hold the "projectId" and "secret").
 *
 * @param  {string} path    Path to read.
 * @param  {string} token   Legacy id token to use.
 * @param  {{secret: {projecId: string}}} options Client options
 * @return {Promise<boolean,Error>}
 */
exports.canRead = function(path, token, options) {
  options = options || {};

  const secret = options.secret || require(secretPath);
  const databaseURL = `https://${secret.projectId}.firebaseio.com`;

  const auth = token ? `?auth=${token}` : '';
  const uri = `${databaseURL}/${path}.json${auth}`;
  const method = 'GET';

  log(`${method} ${uri}`);

  return request({uri, method}).then(
    () => true,
    e => {
      if (e.statusCode === 403 || e.statusCode === 401) {
        return false;
      }

      return Promise.reject(e);
    }
  );
};
