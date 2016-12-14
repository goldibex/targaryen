'use strict';

const os = require('os');

/**
 * Pad start of each lines.
 *
 *  Options:
 *
 * - length: length of the padding (2 by default);
 * - seq: sequence to pad with (' ' by default);
 * - eol: platform specific.
 *
 * @param  {string}                                     str     String to pad
 * @param  {{length: number, seq: string, eol: string}} options Padding options
 * @return {string}
 */
exports.lines = function(str, options) {
  const opts = Object.assign({
    length: 2,
    seq: ' ',
    eol: os.EOL
  }, options);
  const padding = opts.seq.repeat(opts.length);

  return str.split(opts.eol)
    .map(line => `${padding}${line}`)
    .join(opts.eol);
};
