# Contributing

Pull Requests (PR) are welcomes.

## Installing

Fork [Targaryen], then:

```bash
git clone git@github.com:your-user-id/targaryen.git
cd targaryen
git remote add upstream https://github.com/goldibex/targaryen.git
npm install
```

## Reporting a parsing error

If the error relates to rule parsing and evaluation, you can use
`./bin/targaryen-specs`; e.g.:

```
$ ./bin/targaryen-specs -a '{"tests": [{"rule": "1/0 > 2"}]}'
{
  "users": {
    "unauth": null
  },
  "tests": [
    {
      "rule": "1/0 > 2",
      "user": "unauth",
      "isValid": true,
      "failAtRuntime": false,
      "evaluateTo": false
    }
  ]
}
{ Error: Targaryen and Firebase evaluation of "1/0 > 2" diverges.
The rule should evaluate to false.
    at MatchError (/targaryen/lib/parser/specs.js:28:5)
    at Rule.match (/targaryen/lib/parser/specs.js:235:13)
    at fixtures.tests.filter.forEach.t (/targaryen/bin/targaryen-specs:103:21)
    at Array.forEach (native)
    at test (/targaryen/bin/targaryen-specs:103:6)
    at process._tickCallback (internal/process/next_tick.js:103:7)
  spec:
   Rule {
     rule: '1/0 > 2',
     user: 'unauth',
     wildchildren: undefined,
     data: undefined,
     isValid: true,
     failAtRuntime: false,
     evaluateTo: false },
  targaryen: { isValid: true, failAtRuntime: false, evaluateTo: true } }
```

To add it to the list of test fixture in `test/spec/lib/parser/fixtures.json`:

```
./bin/targaryen-specs -s test/spec/lib/parser/fixtures.json -i -a '{"tests": [{"rule": "1/0 > 2"}]}'

# or
npm run fixtures -- -a '{"tests": [{"rule": "1/0 > 2"}]}'
```

For other type of bug, you should submit regular mocha tests if possible.

## Feature branch

Avoid working fixes and new features in your master branch. It will prevent you
from submitting focused pull request or from working on more than one
fix/feature at a time.

Instead, create a branch for each fix or feature:

```bash
git checkout master
git pull upstream master
git checkout -b <branch-name>
```

Work and commit the fixes/features, and then push your branch:

```bash
git push origin <branch-name>
```

Visit your fork and send a PR from that branch; the PR form URL will have this
form:

    https://github.com/goldibex/targaryen/compare/master...<your-github-username>:<branch-name>

Once your PR is accepted:

```bash
git checkout master
git push origin --delete <branch-name>
git branch -D <branch-name>
git pull upstream master
```

## Running tests

```bash
npm install
npm test
```

Or for coverage info:

```
npm run coverage
```

## Linting and formatting

Try to follow the style of the scripts you are editing.

Before submitting a PR, run [eslint], format styling inconsistencies and fix
insecure idioms:

```bash
npm install

# report errors
npm run lint

# try to fix automatically styling errors
npm run format

# report error in html (in lint.html)
npm run lint:html
```

[targaryen]: https://github.com/goldibex/targaryen
[eslint]: http://eslint.org/
