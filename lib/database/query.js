/**
 * Create a query object with its default values.
 */

"use strict";

const orderedBy = Symbol("orderBy");
const orderByKey = Symbol("orderByKey");
const orderByValue = Symbol("orderByValue");
const orderByPriority = Symbol("orderByPriority");

/**
 * Holds read query parameters.
 */
class Query {
  get orderByKey() {
    return this[orderedBy] === orderByKey;
  }

  get orderByValue() {
    return this[orderedBy] === orderByValue;
  }

  get orderByPriority() {
    return this[orderedBy] === orderByPriority;
  }

  get orderByChild() {
    const value = this[orderedBy];

    return typeof value === "string" ? value : null;
  }

  /**
   * Creates an instance of Query.
   *
   * @param {Partial<Query>} query Query parameters.
   */
  constructor(query) {
    this[orderedBy] = orderByKey;
    this.startAt = null;
    this.endAt = null;
    this.equalTo = null;
    this.limitToFirst = null;
    this.limitToLast = null;

    mergeQueries(this, query);
    Object.freeze(this);
  }

  /**
   * Convert Query to Firebase REST parameters.
   *
   * @returns {object}
   */
  toParams() {
    const orderBy = orderByParam(this);
    const seed = orderBy == null ? {} : { orderBy: JSON.stringify(orderBy) };

    return [
      "startAt",
      "endAt",
      "equalTo",
      "limitToFirst",
      "limitToLast"
    ].reduce((q, key) => {
      const value = this[key];

      if (value != null) {
        q[key] = JSON.stringify(value);
      }

      return q;
    }, seed);
  }
}

/**
 * Return a Query object.
 *
 * @param {Partial<Query>} query Partial query parameters
 * @returns {Query}
 */
exports.create = function(query) {
  return new Query(query);
};

/**
 * Validate and merge partial query parameters to a query object.
 *
 * @param {Query} query Query to merges properties to
 * @param {Partial<Query>} options Partial query parameters
 * @returns {Query}
 */
function mergeQueries(query, options) {
  if (options == null) {
    return query;
  }

  Object.keys(options).forEach(key => {
    let label = key;
    let value = options[key];

    validateProp(key, value);

    switch (key) {
      case "orderByKey":
        label = orderedBy;
        value = orderByKey;
        break;

      case "orderByPriority":
        label = orderedBy;
        value = orderByPriority;
        break;

      case "orderByValue":
        label = orderedBy;
        value = orderByValue;
        break;

      case "orderByChild":
        label = orderedBy;
        break;

      default:
        break;
    }

    query[label] = value;
  });

  return query;
}

/**
 * Validate a query property
 *
 * @param {string} key Property name
 * @param {any} value Property value
 */
function validateProp(key, value) {
  const type = typeof value;

  switch (key) {
    case "orderByKey":
    case "orderByPriority":
    case "orderByValue":
      if (!value) {
        throw new Error(
          `"query.${key}" should not be set to false. Set it off by setting an other order.`
        );
      }
      break;

    case "orderByChild":
      if (value == null) {
        throw new Error(
          '"query.orderByChild" should not be set to null. Set it off by setting an other order.'
        );
      }
      if (type !== "string") {
        throw new Error('"query.orderByChild" should be a string or null.');
      }
      break;

    case "startAt":
    case "endAt":
    case "equalTo":
      if (
        value !== null &&
        type !== "string" &&
        type !== "number" &&
        type !== "boolean"
      ) {
        throw new Error(
          `query.${key} should be a string, a number, a boolean or null.`
        );
      }
      break;

    case "limitToFirst":
    case "limitToLast":
      if (value != null && type !== "number") {
        throw new Error(`query.${key} should be a number or null.`);
      }
      break;

    default:
      throw new Error(`"${key}" is not a query parameter.`);
  }
}

/**
 * Returns the property to order by or the ordering keyword ("$value" or
 * "$priority").
 *
 * Never return "$key" since it's the default ordering.
 *
 * @param {Query} query Query to find ordering for.
 * @returns {string|void}
 */
function orderByParam(query) {
  const value = query[orderedBy];

  switch (value) {
    case orderByKey:
      return;

    case orderByValue:
      return "$value";

    case orderByPriority:
      return "$priority";

    default:
      return value;
  }
}
