/**
 * Client helper for a live Firebase DB.
 */

'use strict';

const FirebaseTokenGenerator = require('firebase-token-generator');
const fs = require('fs');
const log = require('debug')('targaryen:firebase');
const path = require('path');
const request = require('request-promise-native');

const SECRET_PATH = process.env.TARGARYEN_SECRET_PATH || path.resolve('targaryen-secret.json');
let CACHED_SECRET;

function readFile(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, (err, content) => {
      if (err) {
        reject(err);
      } else {
        resolve(content);
      }
    });
  });
}

function loadSecret(options) {
  if (options && options.secret) {
    return Promise.resolve(options.secret);
  }

  if (CACHED_SECRET !== undefined) {
    return Promise.resolve(CACHED_SECRET);
  }

  return readFile(SECRET_PATH).then(
    content => JSON.parse(content),
    () => Promise.reject(new Error(`Failed to load ${SECRET_PATH}!

      You need to create a firebase project to run the live tests. This project
      must be empty; the rules and the data will be reset for each tests.
      DO NOT USE YOUR PRODUCTION DATABASE.

      You should then create a JSON encoded file at "./targaryen-secret.json";
      it should define "token" (your firebase database secret) and "projectId"
      (your project ID).

      You can create a database secret from:

          project console > settings > service account > database secrets


      You can save this file at an other location and save the path as the
      TARGARYEN_SECRET_PATH environment variable.

    `))
  ).then(secret => {
    CACHED_SECRET = secret;

    return secret;
  });
}

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

  return loadSecret(options).then(secret => {
    const databaseURL = `https://${secret.projectId}.firebaseio.com`;

    const uri = `${databaseURL}/.settings/rules.json?auth=${secret.token}`;
    const method = 'PUT';
    const body = typeof rules === 'string' ? rules : JSON.stringify({rules}, undefined, 2);

    return request({uri, method, body});
  });
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

  return loadSecret(options).then(secret => {
    const databaseURL = `https://${secret.projectId}.firebaseio.com`;

    const uri = `${databaseURL}/.json?auth=${secret.token}`;
    const method = 'PUT';
    const body = JSON.stringify(data || null);

    return request({uri, method, body});
  });
};

/**
 * Create legacy id token for firebase REST api authentication.
 *
 * By default it will look for the Firebase secret key in "./secret.json"
 * (should hold the "projectId" and "secret").
 *
 * @param  {object} users   Map of name to auth object.
 * @param  {{secret: {projecId: string, token: string}}} options Client options
 * @return {Promise<object,Error>}
 */
exports.tokens = function(users, options) {
  options = options || {};

  return loadSecret(options).then(secret => {
    const tokenGenerator = new FirebaseTokenGenerator(secret.token);

    return Object.keys(users || {}).reduce((tokens, name) => {
      const user = users[name];

      tokens[name] = user ? tokenGenerator.createToken(user) : null;

      return tokens;
    }, {});
  });
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

  return loadSecret(options).then(secret => {
    const databaseURL = `https://${secret.projectId}.firebaseio.com`;

    const auth = token ? `?auth=${token}` : '';
    const uri = `${databaseURL}/${path}.json${auth}`;
    const method = 'GET';

    log(`${method} ${databaseURL}/${path}.json${auth.slice(0, 6)}`);

    return request({uri, method}).then(
      () => true,
      e => {
        if (e.statusCode === 403 || e.statusCode === 401) {
          return false;
        }

        return Promise.reject(e);
      }
    );
  });
};
