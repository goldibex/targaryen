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


[Targaryen]: https://github.com/goldibex/targaryen
[eslint]: http://eslint.org/
