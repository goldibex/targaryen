
## Using Targaryen with Chai and Mocha

1. Run `npm install -g mocha` and `npm install --save-dev mocha chai targaryen`.

2. Create a new directory for your security tests, like, say, `test/security`.

3. Add a new *fixture JSON* for the state of your Firebase. Call this, say, `test/security/<firebase path>.json`. This file will describe the state of the Firebase data store for your tests, that is, what you can get via the `root` and `data` variables in the security rules.

4. Create a new file for your first set of tests, like `test/security/<firebase path>.js`.

5. Add the following content to the top of the new file:

```js
const chai = require('chai');
const targaryen = require('targaryen/plugins/chai');

chai.use(targaryen);

describe('my security rules', function() {

  before(function() {
    targaryen.setFirebaseData(require(DATA_PATH)));
    targaryen.setFirebaseRules(require(RULES_PATH));
  });

});
```

where `RULES_PATH` is the path to your security rules JSON file. If your security rules are broken, Targaryen will throw an exception at this point with detailed information about what specifically is broken.

6. Write your security tests.

The subject of every assertion will be the authentication state (i.e., `auth`) of the user trying the operation, so for instance, `null` would be an unauthenticated user, or a Firebase Password Login user would look like `{ uid: 'password:500f6e96-92c6-4f60-ad5d-207253aee4d3', id: 1, provider: 'password' }`. There are symbolic versions of these in `targaryen.users`.

See the API section below for details, or take a look at the example files here.

7. Run the tests using `mocha test/security/**/*.js`.

## Examples

To run the examples:
```
npm install -g mocha
npm install
cd docs/chai
mocha examples/<name of example>.js
```

## API

- import with `require('targaryen/plugins/chai')`.
- `chaiTargaryen.chai`: The plugin object. Load this using `chai.use(chaiTargaryen.chai)` before running any tests.
- `chaiTargaryen.setFirebaseData(data)`: Set the mock data to be used as the existing Firebase data, i.e., `root` and `data`.
- `chaiTargaryen.setFirebaseRules(rules)`: Set the security rules to be tested against. Throws if there's a syntax error in your rules.
- `chaiTargaryen.setDebug(flag)`: Failed expectations will show the result of each rule when debug is set to `true` (`true` by default).
- `chaiTargaryen.setVerbose(flag)`: Failed expectations will show the detailed evaluation of each rule when verbose is set to `true`(`true` by default).
- `chaiTargaryen.users`: A set of authentication objects you can use as the subject of the assertions. Has the following keys:
  - `unauthenticated`: an unauthenticated user, i.e., `auth === null`.
  - `anonymous`: a user authenticated using Firebase anonymous sessions.
  - `password`: a user authenticated using Firebase Password Login.
  - `facebook`: a user authenticated by their Facebook account.
  - `twitter`: a user authenticated by their Twitter account.
  - `google`: a user authenticated by their Google account.
  - `github`: a user authenticated by their Github account.
- `chai.Assertion.can`: asserts that this is an affirmative test, i.e., the specified operation ought to succeed.
- `chai.Assertion.cannot`: asserts that this is a negative test, i.e., the specified operation ought to fail.
- `chai.Assertion.read`: asserts that this test is for a read operation.
- `chai.Assertion.write(data)`: asserts that this test is for a write operation. Optionally takes a Javascript object or primitive with the new data to be written (which will be in the `newData` snapshot in the rules). Otherwise it just tries with `null`.
- `chai.Assertion.patch(data)`: asserts that this test is for a patch (or multi-location update) operation. Optionally takes a Javascript object or primitive with the new data to be written (which will be in the `newData` snapshot in the rules). Otherwise it just tries with `null`.
- `chai.Assertion.path(firebasePath)`: asserts the path against which the operation should be conducted. This method actually tries the damn operation.

