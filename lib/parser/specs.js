/**
 * Update rule evaluation fixture by trying to upload a rule (as a ".read" rule)
 * and recording the result.
 */

'use strict';

const log = require('debug')('targaryen:parser');
const error = require('debug')('targaryen:parser:error');
const firebase = require('../firebase');
const set = require('lodash.set');
const parser = require('./index');
const database = require('../database');

class MatchError extends Error {

  constructor(spec, result) {
    let msg = `Targaryen and Firebase evaluation of "${spec.rule}" diverges.\n`;

    if (result.isValid !== spec.isValid) {
      msg += `The rule should be ${spec.isValid ? 'valid' : 'invalid'}`;
    } else if (result.failAtRuntime !== spec.failAtRuntime) {
      msg += `The rule ${spec.failAtRuntime ? 'have' : 'have no'} runtime error.`;
    } else if (result.evaluateTo !== spec.evaluateTo) {
      msg += `The rule should evaluate to ${spec.evaluateTo}.`;
    }

    super(msg);

    this.spec = spec;
    this.targaryen = result;
  }

}

/**
 * Hold the rule live evaluation result.
 */
class RuleSpec {

  /**
   * Evaluate a list of rules.
   *
   * @param  {Array<{rule: string, user: string}>} rules List of rules
   * @param  {object}                              users Map of user name and their data.
   * @return {Promise<Array<RuleSpec>,Error>}
   */
  static evaluateRules(rules, users) {
    return firebase.tokens(users).then(
      tokens => rules.reduce((p, spec) => p.then(results => {
        const rule = new RuleSpec(spec);

        log(`Testing "${spec.rule}" with user "${spec.user}"...`);

        results.push(rule);

        return rule.deploy().then(
          () => rule.evaluate(tokens)
        ).then(
          () => rule.hasRuntimeError(tokens)
        ).then(
          () => results
        );
      }), Promise.resolve([]))
    );
  }

  constructor(details) {

    if (!details.user) {
      throw new Error('User for authentication is not defined.', details);
    }

    this.rule = details.rule;
    this.user = details.user;
    this.wildchildren = details.wildchildren;
    this.data = details.data;
    this.isValid = undefined;
    this.failAtRuntime = undefined;
    this.evaluateTo = undefined;
  }

  get rules() {
    const path = Object.keys(this.wildchildren || {})
      .sort((a, b) => a.localeCompare(b))
      .join('.');

    return set({}, `${path}[".read"]`, this.rule);
  }

  get path() {
    return Object.keys(this.wildchildren || {})
      .sort((a, b) => a.localeCompare(b))
      .map(k => this.wildchildren[k])
      .join('/');
  }

  /**
   * Deploy rule and data.
   *
   * @return {Promise<void,Error>}
   */
  deploy() {
    return this.deployRules().then(
      () => this.deployData()
    );
  }

  /**
   * Deploy the rule.
   *
   * Ensure the wildchildren are set.
   *
   * @return {Promise<boolean,Error>}
   */
  deployRules() {
    log('  deploying rule...', this.rules);

    return firebase.deployRules(this.rules).then(
      () => true,
      e => {
        if (e.statusCode !== 400 || e.error === 'Could not parse auth token.') {
          return Promise.reject(e);
        }

        let msg;

        try {
          msg = JSON.parse(e.error).error.trim();
        } catch (e) {}

        error(msg || e);

        return false;
      }
    ).then(deployed => {
      this.isValid = deployed;

      log(`    valilidity: ${this.isValid}`);

      return deployed;
    });
  }

  /**
   * Deploy data.
   *
   * @return {Promise<void,Error>}
   */
  deployData() {

    if (this.isValid === false) {
      return Promise.resolve();
    }

    log('  deploying data...');

    return firebase.deployData(this.data || null).then(
      () => log('  data deployed.')
    );
  }

  /**
   * Evaluate rule.
   *
   * Note that it evaluate the rule in read operation context and that the path
   * of the read operation is not stable. It made sure all wildchildren are set,
   * but their order might be random. You not use `data` or `newData` in the
   * rule.
   *
   * To test snapshot methods, use `root`.
   *
   * @param  {Object}  tokens Map of user name to their auth id token.
   * @return {Promise<boolean,Error>}
   */
  evaluate(tokens) {

    if (!this.isValid) {
      return Promise.resolve();
    }

    const token = tokens[this.user];

    if (token === undefined) {
      return Promise.reject(new Error(`no token for ${this.user}`));
    }

    log('  evaluating rule...');

    return firebase.canRead(this.path, token).then(result => {
      this.evaluateTo = result;

      log(`    evaluates to: ${result}`);

      return result;
    });
  }

  /**
   * Check Firebase evaluation of the rule encountered a runtime error.
   *
   * If the rule evaluated to false it might have encountered a type error. We
   * check this by evaluating a superset of the rule that should evaluate to
   * true. If it still evaluate to false, the rule is generating an error.
   *
   * @param  {Object}  tokens Map of user name to their auth id token.
   * @return {Promise<boolean,Error>}
   */
  hasRuntimeError(tokens) {
    if (!this.isValid) {
      return Promise.resolve(false);
    }

    if (this.evaluateTo) {
      this.failAtRuntime = false;

      return Promise.resolve(true);
    }

    const placebo = new RuleSpec(
      Object.assign({}, this, {
        rule: `(${this.rule}) || true`
      })
    );

    log('  checking for runtime error...');

    return placebo.deploy().then(
      () => placebo.evaluate(tokens)
    ).then(() => {
      this.failAtRuntime = !placebo.evaluateTo;

      if (this.failAtRuntime) {
        this.evaluateTo = undefined;
        error('    has runtime error!');
      }

      return this.failAtRuntime;
    });
  }

  /**
   * Test specs against targaryen implementation.
   *
   * Throws if targaryen implementation doesn't match the specs.
   *
   * @param  {object} users Map of the user name to their auth data.
   */
  compare(users) {
    let rule, isValid, failAtRuntime, evaluateTo;

    log(`  testing evaluation of "${this.rule}" with targaryen...`);

    try {
      rule = parser.parse(this.rule, Object.keys(this.wildchildren || {}));
      isValid = true;
    } catch (e) {
      isValid = false;
    }

    if (this.isValid !== isValid) {
      throw new MatchError(this, {isValid});
    }

    if (!isValid) {
      log(`    Matching!`);
      return;
    }

    const state = Object.assign({
      root: database.snapshot('/', this.data || null),
      now: Date.now(),
      auth: users[this.user] || null
    }, this.wildchildren);

    try {
      evaluateTo = rule.evaluate(state);
      failAtRuntime = false;
    } catch (e) {
      failAtRuntime = true;
    }

    if (this.failAtRuntime !== failAtRuntime) {
      throw new MatchError(this, {isValid, failAtRuntime, evaluateTo});
    }

    if (this.evaluateTo !== evaluateTo) {
      throw new MatchError(this, {isValid, failAtRuntime, evaluateTo});
    }

    log(`Matching!`);
  }
}

exports.test = RuleSpec.evaluateRules;
