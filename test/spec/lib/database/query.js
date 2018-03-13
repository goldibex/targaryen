/**
 * Test firebase query validation.
 */

"use strict";

const query = require("../../../../lib/database/query");

describe("Query", function() {
  it("should order by key by default", function() {
    expect(query.create()).to.include({
      orderByKey: true,
      orderByPriority: false,
      orderByValue: false,
      orderByChild: null
    });
  });

  ["orderByKey", "orderByPriority", "orderByValue"].forEach(function(order) {
    it(`should throw when setting ${order} to false`, function() {
      expect(() => query.create({ [order]: false })).to.throw();
    });
  });

  it("should throw when setting orderByChild to null", function() {
    expect(() => query.create({ orderByChild: null })).to.throw();
  });

  it("should set orderBy to orderByKey", function() {
    expect(query.create({ orderByKey: true })).to.include({
      orderByKey: true,
      orderByValue: false,
      orderByPriority: false,
      orderByChild: null
    });
  });

  it("should set orderBy to orderByValue", function() {
    expect(query.create({ orderByValue: true })).to.include({
      orderByKey: false,
      orderByValue: true,
      orderByPriority: false,
      orderByChild: null
    });
  });

  it("should set orderBy to orderByPriority", function() {
    expect(query.create({ orderByPriority: true })).to.include({
      orderByKey: false,
      orderByValue: false,
      orderByPriority: true,
      orderByChild: null
    });
  });

  it("should set orderBy to a child name", function() {
    expect(query.create({ orderByChild: "foo" })).to.include({
      orderByKey: false,
      orderByValue: false,
      orderByPriority: false,
      orderByChild: "foo"
    });
  });

  it("should throw if the child name is not a string", function() {
    expect(() => query.create({ orderByChild: 1 })).to.throw();
  });

  ["startAt", "endAt", "equalTo"].forEach(function(key) {
    [null, "foo", 2, true].forEach(function(value) {
      it(`should allow to set ${key} to ${value === null ? "null" : typeof value}`, function() {
        expect(() => query.create({ [key]: value })).not.to.throws();
      });
    });

    it(`should throw if setting ${key} to an object`, function() {
      expect(() => query.create({ [key]: { foo: 1 } })).to.throws();
    });
  });

  ["limitToFirst", "limitToLast"].forEach(function(key) {
    [null, 2].forEach(function(value) {
      it(`should allow to set ${key} to ${value === null ? "null" : typeof value}`, function() {
        expect(() => query.create({ [key]: value })).not.to.throws();
      });
    });

    ["foo", true, { foo: 1 }].forEach(function(value) {
      it(`should throw if setting ${key} to ${Object.isExtensible(value) ? "object" : typeof value}`, function() {
        expect(() => query.create({ [key]: value })).to.throws();
      });
    });
  });

  it("should throw when setting an unknown property", function() {
    expect(() => query.create({ foo: 1 })).to.throws();
  });

  describe("#toParams", function() {
    [
      {
        msg: "should return an empty object by default"
      },
      {
        msg: "should return order by child params",
        q: { orderByChild: "foo" },
        params: { orderBy: '"foo"' }
      },
      {
        msg: "should return order by value params",
        q: { orderByValue: true },
        params: { orderBy: '"$value"' }
      },
      {
        msg: "should return order by priority params",
        q: { orderByPriority: true },
        params: { orderBy: '"$priority"' }
      },
      {
        msg: "should return endAt param",
        q: { endAt: "foo" },
        params: { endAt: '"foo"' }
      },
      {
        msg: "should return startAt param",
        q: { startAt: "foo" },
        params: { startAt: '"foo"' }
      },
      {
        msg: "should return equalTo param",
        q: { equalTo: "foo" },
        params: { equalTo: '"foo"' }
      },
      {
        msg: "should return limitToFirst param",
        q: { limitToFirst: 10 },
        params: { limitToFirst: "10" }
      },
      {
        msg: "should return limitToLast param",
        q: { limitToLast: 10 },
        params: { limitToLast: "10" }
      },
      {
        msg: "should return all param",
        q: {
          orderByValue: true,
          startAt: "foo",
          endAt: "bar",
          limitToLast: 10
        },
        params: {
          orderBy: '"$value"',
          startAt: '"foo"',
          endAt: '"bar"',
          limitToLast: "10"
        }
      }
    ].forEach(t => {
      it(t.msg, function() {
        expect(query.create(t.q).toParams()).to.eql(t.params || {});
      });
    });
  });
});
