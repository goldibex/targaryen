
## Using Targaryen with Jasmine

1. Run `npm install -g jasmine && npm install --save-dev targaryen`.

2. Create a new directory for your security tests. Jasmine likes your tests to live in the directory `spec`, so a good choice might be `spec/security`. Add this directory to `spec/support/jasmine.json`.

3. Add a new *fixture JSON* for the state of your Firebase. Call this `spec/security/<firebase path>.json`. This file will describe the state of the Firebase data store for your tests, that is, what you can get via the `root` and `data` variables in the security rules.
 
4. Create a new file for your first set of tests, like `spec/security/<firebase path>.js`.

5. Add the following content to the top of the new file:

```js
var path = require('path'),
  targaryen = require('targaryen');

describe('my security rules', function() {

  beforeEach(function() {
    jasmine.addMatchers(targaryen.jasmine.matchers);
    targaryen.setFirebaseData(require(__dirname + path.basename(__filename) + '.json'));
    targaryen.setFirebaseRules(require(RULES_PATH));
  });

});
```

where `RULES_PATH` is the path to your security rules JSON file. If your security rules are broken, Targaryen will throw an exception at this point with detailed information about what specifically is broken.

6. Write your security tests.

The subject of every assertion will be the authentication state (i.e., `auth`) of the user trying the operation, so for instance, `null` would be an unauthenticated user, or a Firebase Simple Login user would look like `{ uid: 'simplelogin:1', id: 1, provider: 'simplelogin' }`. There are symbolic versions of these in `targaryen.users`. 

See the API section below for details, or take a look at the example files here.

7. Run the tests with `jasmine`.

## Examples

To run the examples:
```
npm install -g jasmine
cd targaryen/docs/jasmine/examples
jasmine spec/security/<name of example>.js
```

## API

- `targaryen.jasmine`: The plugin object. Load this using `jasmine.addMatchers(targaryen.jasmine.matchers)` before running any tests.
- `targaryen.setFirebaseData(data)`: Set the mock data to be used as the existing Firebase data, i.e., `root` and `data`.
- `targaryen.setFirebaseRules(rules)`: Set the security rules to be tested against. Throws if there's a syntax error in your rules. 
- `targaryen.users`: A set of authentication objects you can use as the subject of the assertions. Has the following keys:
  - `unauthenticated`: an unauthenticated user, i.e., `auth === null`.
  - `anonymous`: a user authenticated using Firebase anonymous sessions.
  - `simplelogin`: a user authenticated using Firebase Simple Login.
  - `facebook`: a user authenticated by their Facebook account. 
  - `twitter`: a user authenticated by their Twitter account.
  - `google`: a user authenticated by their Google account.
  - `github`: a user authenticated by their Github account.
- `expect(auth).canRead(path)`: asserts that the given path is readable by a user with the given authentication data.
- `expect(auth).cannotRead(path)`: asserts that the given path is not readable by a user with the given authentication data.
 - `expect(auth).canWrite(path, data)`: asserts that the given path is writable by a user with the given authentication data. Optionally takes a Javascript object containing `newData`, otherwise this will be set to `null`.
- `expect(auth).cannotWrite(path, data)`: asserts that the given path is not writable by a user with the given authentication data. Optionally takes a Javascript object containing `newData`, otherwise this will be set to `null`.

