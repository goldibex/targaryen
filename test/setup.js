/**
 * Register chai plugins and augment mocha global.
 *
 * Should be used with mocha's "require" flag to be imported before any mocha
 * test are loaded or run.
 *
 */
'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');

chai.use(sinonChai);

global.expect = chai.expect;
global.sinon = sinon;
