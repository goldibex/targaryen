'use strict';

// in your app this would be require('targaryen/plugins/chai')
const targaryen = require('../../../plugins/chai');
const chai = require('chai');
const expect = chai.expect;
const users = targaryen.users;
const path = require('path');
const rules = targaryen.json.loadSync(path.join(__dirname, 'rules.json'));

chai.use(targaryen);

describe('A valid set of security rules and data', function() {

  before(function() {
    targaryen.setFirebaseData(require('./data.json'));
    targaryen.setFirebaseRules(rules);
  });

  it('can be tested against', function() {

    expect(users.unauthenticated).cannot.read.path('users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3');
    expect(users.password).can.read.path('users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3');

    expect(users.password).cannot.write(true)
    .to.path('users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3/innocent');

    expect({ uid: 'password:3403291b-fdc9-4995-9a54-9656241c835d' }).can.write(true)
    .to.path('users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3/on-fire');

  });

});

