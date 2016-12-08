/**
 * Mocha test definition to test targaryen chai integration.
 */

'use strict';

const chai = require('chai');
const targaryen = require('../../../plugins/chai');
const util = require('../../../lib/util');

describe('Chai plugin', function() {

  before(function() {
    chai.use(targaryen);
  });

  beforeEach(function() {
    util.resetFirebase();
    util.setVerbose(true);
  });

  it('should throw if rules are not set', function() {
    targaryen.setFirebaseData(null);

    expect(() => expect(null).can.read.path('foo')).to.throw();
    expect(() => expect(null).cannot.read.path('foo')).to.throw();
    expect(() => expect(null).can.write(7).to.path('foo')).to.throw();
    expect(() => expect(null).cannot.write(7).to.path('foo')).to.throw();
  });

  it('should throw if data is not set', function() {
    targaryen.setFirebaseRules({rules: {'.read': true, '.write': true}});

    expect(() => expect(null).can.read.path('foo')).to.throw();
    expect(() => expect(null).can.write(7).to.path('foo')).to.throw();

    targaryen.setFirebaseRules({rules: {'.read': false, '.write': false}});

    expect(() => expect(null).cannot.read.path('foo')).to.throw();
    expect(() => expect(null).cannot.write(7).to.path('foo')).to.throw();
  });

  it('should test read access', function() {
    targaryen.setFirebaseData(null);
    targaryen.setFirebaseRules({rules: {
      '.read': false,
      foo: {
        bar: {
          '.read': 'auth.uid !== null'
        }
      }
    }});

    expect(targaryen.users.unauthenticated).cannot.read.path('/');
    expect(targaryen.users.unauthenticated).cannot.read.path('/foo');
    expect(targaryen.users.unauthenticated).cannot.read.path('/foo/bar');

    expect(targaryen.users.facebook).cannot.read.path('/');
    expect(targaryen.users.facebook).cannot.read.path('/foo');
    expect(targaryen.users.facebook).can.read.path('/foo/bar');
  });

  it('should test write access', function() {
    targaryen.setFirebaseData(null);
    targaryen.setFirebaseRules({rules: {
      '.write': false,
      foo: {
        bar: {
          '.write': 'auth.uid !== null',
          '.validate': 'newData.val() > 1'
        }
      }
    }});

    expect(targaryen.users.unauthenticated).cannot.write(2).to.path('/');
    expect(targaryen.users.unauthenticated).cannot.write(2).to.path('/foo');
    expect(targaryen.users.unauthenticated).cannot.write(1).to.path('/foo/bar');
    expect(targaryen.users.unauthenticated).cannot.write(2).to.path('/foo/bar');

    expect(targaryen.users.facebook).cannot.write(2).to.path('/');
    expect(targaryen.users.facebook).cannot.write(2).to.path('/foo');
    expect(targaryen.users.facebook).cannot.write(1).to.path('/foo/bar');
    expect(targaryen.users.facebook).can.write(2).to.path('/foo/bar');
  });

  it('should test multi write access', function() {
    targaryen.setFirebaseData(null);
    targaryen.setFirebaseRules({rules: {
      '.write': false,
      foo: {
        $key: {
          '.write': 'auth.uid !== null',
          '.validate': 'newData.val() > 1'
        }
      }
    }});

    expect(targaryen.users.unauthenticated).cannot.patch({foo: {bar: 2, baz: 2}}).path('/');
    expect(targaryen.users.unauthenticated).cannot.patch({'foo/bar': 1, 'foo/baz': 2}).path('/');
    expect(targaryen.users.unauthenticated).cannot.patch({'foo/bar': 2, 'foo/baz': 2}).path('/');
    expect(targaryen.users.unauthenticated).cannot.patch({bar: 1, baz: 2}).path('/foo');
    expect(targaryen.users.unauthenticated).cannot.patch({bar: 2, baz: 2}).path('/foo');

    expect(targaryen.users.facebook).cannot.patch({foo: {bar: 2, baz: 2}}).path('/');
    expect(targaryen.users.facebook).cannot.patch({'foo/bar': 1, 'foo/baz': 2}).path('/');
    expect(targaryen.users.facebook).can.patch({'foo/bar': 2, 'foo/baz': 2}).path('/');
    expect(targaryen.users.facebook).cannot.patch({bar: 1, baz: 2}).path('/foo');
    expect(targaryen.users.facebook).can.patch({bar: 2, baz: 2}).path('/foo');
  });

});
