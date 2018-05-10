/**
 * targaryen/plugins/jest - Reference implementation of a jest plugin for
 * targaryen.
 *
 */

'use strict';

const json = require('firebase-json');
const targaryen = require('../');

// Need to disable eslint rule for jest's utils: this.utils.EXPECTED_COLOR('a')
/* eslint-disable new-cap */

function toBeAllowed(result) {
  const pass = result.allowed === true;
  const message = pass ?
    () => `Expected operation to be ${this.utils.EXPECTED_COLOR('denied')} but it was ${this.utils.RECEIVED_COLOR('allowed')}\n\n${result.info}` :
    () => `Expected operation to be ${this.utils.EXPECTED_COLOR('allowed')} but it was ${this.utils.RECEIVED_COLOR('denied')}\n\n${result.info}`;

  return {
    message,
    pass
  };
}

function toAllowRead(database, path, options) {
  const result = database
    .with({debug: true})
    .read(path, options);

  const pass = result.allowed === true;
  const message = pass ?
    () => `Expected ${this.utils.EXPECTED_COLOR('read')} to be ${this.utils.EXPECTED_COLOR('denied')} but it was ${this.utils.RECEIVED_COLOR('allowed')}\n\n${result.info}` :
    () => `Expected ${this.utils.EXPECTED_COLOR('read')} to be ${this.utils.EXPECTED_COLOR('allowed')} but it was ${this.utils.RECEIVED_COLOR('denied')}\n\n${result.info}`;

  return {
    message,
    pass
  };
}

function toAllowWrite(database, path, value, options) {
  const result = database
    .with({debug: true})
    .write(path, value, options);

  const pass = result.allowed === true;
  const message = pass ?
    () => `Expected ${this.utils.EXPECTED_COLOR('write')} to be ${this.utils.EXPECTED_COLOR('denied')} but it was ${this.utils.RECEIVED_COLOR('allowed')}\n\n${result.info}` :
    () => `Expected ${this.utils.EXPECTED_COLOR('write')} to be ${this.utils.EXPECTED_COLOR('allowed')} but it was ${this.utils.RECEIVED_COLOR('denied')}\n\n${result.info}`;

  return {
    message,
    pass
  };
}

function toAllowUpdate(database, path, patch, options) {
  const result = database
    .with({debug: true})
    .update(path, patch, options);

  const pass = result.allowed === true;
  const message = pass ?
    () => `Expected ${this.utils.EXPECTED_COLOR('update')} to be ${this.utils.EXPECTED_COLOR('denied')} but it was ${this.utils.RECEIVED_COLOR('allowed')}\n\n${result.info}` :
    () => `Expected ${this.utils.EXPECTED_COLOR('update')} to be ${this.utils.EXPECTED_COLOR('allowed')} but it was ${this.utils.RECEIVED_COLOR('denied')}\n\n${result.info}`;

  return {
    message,
    pass
  };
}

/**
 * Expose `targaryen.database()` for conveniently creating a
 * database for a jest test.
 *
 * @return {Database}
 */
const getDatabase = targaryen.database;

/**
 * Simple wrapper for `targaryen.database()` that also enables debug mode for
 * detailed error messages.
 *
 * @return {Database}
 */
function getDebugDatabase() {
  return targaryen.database.apply(this, arguments).with({debug: true});
}

const jestTargaryen = {
  toBeAllowed,
  toAllowRead,
  toAllowWrite,
  toAllowUpdate,

  // NOTE: Exported for convenience only
  getDatabase,
  getDebugDatabase,
  json,
  users: targaryen.util.users
};

module.exports = jestTargaryen;
