

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
npm install --save-dev targaryen
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
        'simplelogin:1': {
          name: {
            '.value': 'Rickard Stark',
            '.priority': 2
          }
        },
        'simplelogin:2': {
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
          '.write': 'root.child('users').child(auth.uid).child('king').val() === true'
        }
      }
    });

  });

  it('can be tested', function() {

    expect(targaryen.users.unauthenticated)
    .cannot.read.path('users/simplelogin:1');

    expect(targaryen.users.simplelogin)
    .can.read.path('users/simplelogin:1');

    expect(targaryen.users.simplelogin)
    .cannot.write(true).to.path('users/simplelogin:1/innocent');

    expect({ uid: 'simplelogin:2' })
    .can.write(true).to.path('users/simplelogin:2/on-fire');

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
    .cannotRead('users/simplelogin:1');

    expect(targaryen.users.simplelogin)
    .canRead('users/simplelogin:1');

    expect(targaryen.users.simplelogin)
    .cannotWrite('users/simplelogin:1/innocent', true);

    expect({ uid: 'simplelogin:2'})
    .canWrite('users/simplelogin:1/onFire', true);

  });

});

```
