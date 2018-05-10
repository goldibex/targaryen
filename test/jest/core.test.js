/**
 * Jest test definition to test targaryen Jest integration.
 */

'use strict';

const targaryen = require('../../plugins/jest');

expect.extend({
  toBeAllowed: targaryen.toBeAllowed
});

test('getDebugDatabase()', () => {
  const emptyRules = {rules: {}};
  const database = targaryen.getDebugDatabase(emptyRules, {});

  expect(database.debug).toBe(true);
});

test('getDatabase()', () => {
  const emptyRules = {rules: {}};
  const database = targaryen.getDatabase(emptyRules, {});

  expect(database.debug).toBe(false);
});

describe('generic matchers', () => {
  test('toBeAllowed', () => {
    const rules = {
      rules: {
        user: {
          $uid: {
            '.read': 'auth.uid !== null',
            '.write': 'auth.uid === $uid'
          }
        }
      }
    };
    const initialData = {};

    // NOTE: Create a database with debug set to true for detailed errors
    const database = targaryen.getDebugDatabase(rules, initialData);

    expect(() => {
      expect(database.as(null).read('/user')).not.toBeAllowed();
    }).not.toThrow();

    expect(() => {
      expect(database.as(null).read('/user')).toBeAllowed();
    }).toThrowErrorMatchingSnapshot();

    expect(() => {
      expect(database.as({uid: '1234'}).write('/user/1234', {
        name: 'Anna'
      })).toBeAllowed();
    }).not.toThrow();

    expect(() => {
      expect(database.as({uid: '1234'}).write('/user/1234', {
        name: 'Anna'
      })).not.toBeAllowed();
    }).toThrowErrorMatchingSnapshot();
  });
});

