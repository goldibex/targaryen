/**
 * targaryen/plugins/jest - Reference implementation of a jest plugin for
 * targaryen.
 *
 */

'use strict';

const targaryen = require('../');

function toBeAllowed({ info, allowed }) {
  const pass = allowed === true;
  const message = pass
    ? () => `Expected operation to be ${this.utils.EXPECTED_COLOR('denied')} but it was ${this.utils.RECEIVED_COLOR('allowed')}\n\n${info}`
    : () => `Expected operation to be ${this.utils.EXPECTED_COLOR('allowed')} but it was ${this.utils.RECEIVED_COLOR('denied')}\n\n${info}`;

    return {
    message,
    pass,
  };
}

function toAllowRead(database, path, options) {
  const { info, allowed } = database
    .with({ debug: true })
    .read(path, options);

  const pass = allowed === true;
  const message = pass
    ? () => `Expected ${this.utils.EXPECTED_COLOR('read')} to be ${this.utils.EXPECTED_COLOR('denied')} but it was ${this.utils.RECEIVED_COLOR('allowed')}\n\n${info}`
    : () => `Expected ${this.utils.EXPECTED_COLOR('read')} to be ${this.utils.EXPECTED_COLOR('allowed')} but it was ${this.utils.RECEIVED_COLOR('denied')}\n\n${info}`;

  return {
    message,
    pass,
  };
}

function toAllowWrite(database, path, value, options) {
  const { info, allowed } = database
    .with({ debug: true })
    .write(path, value, options);

  const pass = allowed === true;
  const message = pass
    ? () => `Expected ${this.utils.EXPECTED_COLOR('write')} to be ${this.utils.EXPECTED_COLOR('denied')} but it was ${this.utils.RECEIVED_COLOR('allowed')}\n\n${info}`
    : () => `Expected ${this.utils.EXPECTED_COLOR('write')} to be ${this.utils.EXPECTED_COLOR('allowed')} but it was ${this.utils.RECEIVED_COLOR('denied')}\n\n${info}`;

  return {
    message,
    pass,
  };
}

function toAllowUpdate(database, path, patch, options) {
  const { info, allowed } = database
    .with({ debug: true })
    .update(path, patch, options);

  const pass = allowed === true;
  const message = pass
    ? () => `Expected ${this.utils.EXPECTED_COLOR('update')} to be ${this.utils.EXPECTED_COLOR('denied')} but it was ${this.utils.RECEIVED_COLOR('allowed')}\n\n${info}`
    : () => `Expected ${this.utils.EXPECTED_COLOR('update')} to be ${this.utils.EXPECTED_COLOR('allowed')} but it was ${this.utils.RECEIVED_COLOR('denied')}\n\n${info}`;

  return {
    message,
    pass,
  };
}

/**
 * Simple wrapper for `targaryen.database()` for conveniently creating a
 * database for a jest test.
 */
function getDatabase(...args) {
  return targaryen.database(...args);
}

/**
 * Simple wrapper for `targaryen.database()` that also enables debug mode for
 * detailed error messages.
 */
function getDebugDatabase(...args) {
  return targaryen.database(...args).with({ debug: true });
}

const jestTargaryen = {
  toBeAllowed,
  toAllowRead,
  toAllowWrite,
  toAllowUpdate,

  // NOTE: Exported for convenience only
  getDatabase,
  getDebugDatabase,
  json: require('firebase-json'),
  users: targaryen.util.users,
};

module.exports = jestTargaryen;
