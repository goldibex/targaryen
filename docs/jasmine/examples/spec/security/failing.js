
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
    expect(users.unauthenticated).canRead('users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3');
  });

  it('can have write errors', function() {
    expect(users.password).canWrite('users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3/innocent', true);
  });

  it('can have validation errors', function() {
    expect({ uid: 'password:3403291b-fdc9-4995-9a54-9656241c835d' }).canWrite('users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3/innocent', true);
  });

});

