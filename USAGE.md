

## Standalone

Install Targaryen locally and run it like so:

```bash
$ npm install -g targaryen
...
$ targaryen path/to/rules.json path/to/tests.json

0 failures in 20 tests
```

[See the docs](https://github.com/goldibex/targaryen/blob/master/docs/targaryen) or [take a look at Targaryen's own integration tests](https://github.com/goldibex/targaryen/blob/master/test/integration/tests.json) to learn more.

targaryen exits with a non-zero error code if the tests failed, or zero if they passed.

## With a test framework

To use either Jasmine or Chai, you'll need to get the Targaryen API. This is as
simple as

```bash
npm install --save-dev targaryen@3
```

followed by

```js
var targaryen = require('targaryen');
```

Before your tests start, you need to call two different methods:

`targaryen.setFirebaseData(data)`: set the database state for the test. `data` is a plain old Javascript object containing whatever data you want to be accessible via the `root` and `data` objects in the security rules. You can either use the data format of Firebase's `exportVal` (i.e., with ".value" and ".priority" keys) or just a plain Javascript object. The plain object will be converted to the Firebase format. 

`targaryen.setFirebaseRules(rules)`: set the database rules for the test. `rules` is a plain old Javascript object with the contents `rules.json`, so you can just say `targaryen.setFirebaseRules(require('./rules.json'))` and be on your way.

### Chai

Docs are at [docs/chai](https://github.com/goldibex/targaryen/blob/master/docs/chai). A quick example:

```js

var chai = require('chai'),
  expect = chai.expect,
  targaryen = require('targaryen');

chai.use(targaryen.chai);

describe('A set of rules and data', function() {

  before(function() {
    
    // when you call setFirebaseData, you can either use the data format
    // of `exportVal` (i.e., with ".value" and ".priority" keys) or just a plain
    // Javascript object. The plain object will be converted to the Firebase format.

    targaryen.setFirebaseData({
      users: {
        'password:500f6e96-92c6-4f60-ad5d-207253aee4d3': {
          name: {
            '.value': 'Rickard Stark',
            '.priority': 2
          }
        },
        'password:3403291b-fdc9-4995-9a54-9656241c835d': {
          name: 'Mad Aerys',
          king: true
        }
      }
    });

    // any logged-in user can read a user object, but only the king can write them!
    targaryen.setFirebaseRules({
      rules: {
        users: {
          '.read': 'auth !== null',
          '.write': "root.child('users').child(auth.uid).child('king').val() === true"
        }
      }
    });

  });

  it('can be tested', function() {

    expect(targaryen.users.unauthenticated)
    .cannot.read.path('users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3');

    expect(targaryen.users.password)
    .can.read.path('users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3');

    expect(targaryen.users.password)
    .cannot.write(true).to.path('users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3/innocent');

    expect({ uid: 'password:3403291b-fdc9-4995-9a54-9656241c835d' })
    .can.write(true).to.path('users/password:3403291b-fdc9-4995-9a54-9656241c835d/on-fire');

    expect(targaryen.users.password)
    .cannot.patch({
      'users/password:3403291b-fdc9-4995-9a54-9656241c835d/on-fire': null,
      'users/password:3403291b-fdc9-4995-9a54-9656241c835d/innocent': true
    });

    expect({ uid: 'password:3403291b-fdc9-4995-9a54-9656241c835d' })
    .can.patch({
      'users/password:3403291b-fdc9-4995-9a54-9656241c835d/on-fire': true,
      'users/password:3403291b-fdc9-4995-9a54-9656241c835d/innocent': null
    });

  });

});

```

### Jasmine

Docs are at [docs/jasmine](https://github.com/goldibex/targaryen/blob/master/docs/jasmine). A quick example:

```js
  
var targaryen = require('targaryen');

// see Chai example above for format
targaryen.setFirebaseData(...);
targaryen.setFirebaseRules(...);


describe('A set of rules and data', function() {

  beforeEach(function() {
    jasmine.addMatchers(targaryen.jasmine.matchers);    
  });

  it('can be tested', function() {

    expect(targaryen.users.unauthenticated)
    .cannotRead('users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3');

    expect(targaryen.users.password)
    .canRead('users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3');

    expect(targaryen.users.password)
    .cannotWrite('users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3/innocent', true);

    expect({ uid: 'password:3403291b-fdc9-4995-9a54-9656241c835d'})
    .canWrite('users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3/onFire', true);

    expect({ uid: 'password:3403291b-fdc9-4995-9a54-9656241c835d'})
    .canPatch({
      'users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3/onFire': true,
      'users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3/innocent': null
    });

    expect({ uid: 'password:3403291b-fdc9-4995-9a54-9656241c835d'})
    .cannotPatch({
      'users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3/onFire': null,
      'users/password:500f6e96-92c6-4f60-ad5d-207253aee4d3/innocent': true
    });

  });

});

```
