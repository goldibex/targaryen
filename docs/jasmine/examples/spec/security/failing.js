
'use strict';

var targaryen = require('../../../../../index'), // in your app this would be require('targaryen')
  users = targaryen.users;

targaryen.setFirebaseData(require('./data.json'));
targaryen.setFirebaseRules(require('./rules.json'));

describe('A valid set of security rules and data', function() {

  beforeEach(function() {
    jasmine.addMatchers(targaryen.jasmine.matchers);
  });

  it('can have read errors', function() {
    expect(users.unauthenticated).canRead('users/simplelogin:1');
  });

  it('can have write errors', function() {
    expect(users.simplelogin).canWrite('users/simplelogin:1/innocent', true);
  });

  it('can have validation errors', function() {
    expect({ uid: 'simplelogin:2' }).canWrite('users/simplelogin:1/innocent', true);
  });

});

