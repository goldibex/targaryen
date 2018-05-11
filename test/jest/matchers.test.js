/**
 * Jest test definition to test targaryen Jest integration.
 */

'use strict';

const targaryen = require('../../plugins/jest');

expect.extend({
  toAllowRead: targaryen.toAllowRead,
  toAllowUpdate: targaryen.toAllowUpdate,
  toAllowWrite: targaryen.toAllowWrite
});

describe('matchers', () => {
  const rules = {rules: {
    user: {
      $uid: {
        '.read': 'auth.uid !== null',
        '.write': 'auth.uid === $uid'
      }
    },
    public: {
      '.read': true
    }
  }};
  const initialData = {};
  const database = targaryen.getDatabase(rules, initialData);

  test('toAllowRead', () => {
    expect(() => {
      expect(database).not.toAllowRead('/user');
    }).not.toThrow();

    expect(() => {
      expect(database).toAllowRead('/user');
    }).toThrowErrorMatchingSnapshot();

    expect(() => {
      expect(database).toAllowRead('/public');
    }).not.toThrow();

    expect(() => {
      expect(database).not.toAllowRead('/public');
    }).toThrowErrorMatchingSnapshot();
  });

  test('toAllowWrite', () => {
    expect(() => {
      expect(database.as({uid: '1234'})).toAllowWrite('/user/1234', {
        name: 'Anna'
      });
    }).not.toThrow();

    expect(() => {
      expect(database.as({uid: '1234'})).not.toAllowWrite('/user/1234', {
        name: 'Anna'
      });
    }).toThrowErrorMatchingSnapshot();
  });

  test('toAllowUpdate', () => {
    expect(() => {
      expect(database.as({uid: '1234'})).toAllowUpdate('/user/1234', {
        name: 'Anna'
      });
    }).not.toThrow();

    expect(() => {
      expect(database.as({uid: '1234'})).not.toAllowUpdate('/user/1234', {
        name: 'Anna'
      });
    }).toThrowErrorMatchingSnapshot();
  });
});
