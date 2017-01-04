
'use strict';

// in your app this would be require('targaryen/plugins/jasmine')
const targaryen = require('../../../../../plugins/jasmine');
const path = require('path');

const rules = targaryen.json.loadSync(path.join(__dirname, 'rules.json'));
const users = targaryen.users;

targaryen.setFirebaseData(require('./data.json'));
targaryen.setFirebaseRules(rules);

describe('A valid set of security rules and data', function() {

  beforeEach(function() {
    jasmine.addMatchers(targaryen.matchers);
  });

  it('can be tested against', function() {

    expect(users.unauthenticated).cannotRead('users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3');
    expect(users.password).canRead('users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3');

    expect(users.password).cannotWrite('users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3/innocent', true);
    expect({ uid: 'password:3403291b-fdc9-4995-9a54-9656241c835d' }).canWrite('users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3/on-fire', true);

  });

});

