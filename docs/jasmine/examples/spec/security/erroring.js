
'use strict';

var targaryen = require('../../../../../index'), // in your app this would be require('targaryen')
  users = targaryen.users;

describe('An invalid set of security rules and data', function() {

  it('causes Targaryen to throw', function() {

    targaryen.setFirebaseData(require('./data.json'));
    targaryen.setFirebaseRules(require('./bad-rules.json'));

  });

});

