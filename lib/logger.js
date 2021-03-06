'use strict';

var Ose = require('ose');
var M = Ose.class(module, C);

/** Doc {{{1
 * @caption Logging and error handling
 *
 * @readme
 *
 * To log errors and messages, each module should at first create `M.log` instance by calling
 * `Ose.logger(context)`. The context is an identifier of the logging
 * namespace. `Ose.logger()` either returns an existing `M.log`
 * instance for the namespace or creates a new one. Once created, the logger can be used to log messages.
 *
 * Error handling tries to adhere to the production practices outlined
 * by Joyent ([Error Handling in
 * Node.js](http://www.joyent.com/developers/node/design/errors)).
 *
 * @description
 *
 * ## Usage
 *
 * Example module :
 *
 *     'use strict';
 *
 *     var Ose = require('ose');
 *     var M = Ose.module(module);
 *     ...
 *     M.log.info('Processing');
 *
 * To create an error, it is possible to use `Ose.error()`, which
 * appends an optional `subject` and `data` to the error object. the
 * `subject` and `data` make it easier to analyse problems. If an
 * error is logged, `subject.identify()`, if it is defined, is used
 * to display subject identification.
 *
 * Example:
 *
 *     var err = Ose.error(subject, 'Something has gone terribly wrong.', arguments);
 *     ...
 *
 *     // To log an error:
 *     M.log.error(err);
 *
 *     // or to use an error in callback:
 *     cb(err);
 *
 *     // or to throw an error:
 *     throw err;
 *
 *     // or send an error to a link:
 *     Ose.link.error(socket, err);
 *
 * When calling any callback with an error response, sending an error to a link, or throwing an exception, `Error` instance created by `Ose.error()` should be used.
 *
 * @aliases error logging
 * @module ose
 * @submodule ose.logger
 */

/**
 * @caption Logger
 *
 * @class ose.lib.logger
 */

/**
 * Logging namespace
 *
 * @property context
 * @type String
 */

// Public {{{1
exports.dontLogThis = {};

function C(context) {  // {{{2
/** 
 * Class constructor
 *
 * @param context {String} Context of logger instance
 *
 * @method init
 */

  this.context = context;
};

exports.interval = function(message, data) {  // {{{2
/**
 * @param message {String} Message to log
 * @param [data] {*} Optional data to be logged
 *
 * @method interval
 */

  var now = new Date().getTime();

  this.log('debug', message, {
    interval: now - (this.lastInterval || now),
    data: data
  });

  this.lastInterval = now;
};

exports.obsolete = function(message, data) {  // {{{2
/**
 * Use when obsolete code is executed.
 * Displays message with data and stack trace.
 *
 * @param message {String} Message to log
 * @param [data] {*} Optional data to be logged
 *
 * @method obsolete
 */

  this.log('unhandled', 'Obsolete: ' + message, data);
  console.trace();
};

exports.todo = function(message, subject, data) {  // {{{2
  var result = new Error(message);

  result.code = 'TODO';
  if (subject) {
    result.subject = subject;
  }
  if (data) {
    result.data = data;
  }

  this.error(result);

  return result;
};

exports.missing = function(message, data) {  // {{{2
/** TODO: Rename to "todo".
 * Use when something is missing.
 * Displays message with data and stack trace.
 *
 * @param message {String} Message to log
 * @param [data] {*} Optional data to be logged
 *
 * @method missing
 */

  this.log('unhandled', 'Not implemented yet: ' + message, data);
  console.trace();
};

exports.caught = function(err, message, data) {  // {{{2
/**
 * Use when an error object is caught
 *
 * @param err {Object} Error object
 * @param message {String} Message to log
 * @param [data] {*} Optional data to be logged

 * @method caught
 */

  this.log('error', message, data);
  this.error(err);
//  console.trace();

//  this.log(err);
};

exports.bind = function(severity, message, data) {  // {{{2
/**
 * Creates logging function
 *
 * @param severity {String} Text indicating everity
 * @param message {String} Message to log
 * @param [data] {*} Optional data to be logged
 *
 * @returns {Function} Logging function
 * @method bind
 */

  var that = this;

  return function(data) {
    that.log(severity, message, data);
  };
};

exports.debug = function(message, data) {  // {{{2
/**
 * Logs message with 'debug' severity.
 *
 * @param message {String} Message to log
 * @param [data] {*} Optional data to be logged
 *
 * @method debug
 */

  this.log('debug', message, data);
};

exports.info = function(message, data) {  // {{{2
/**
 * Logs message with 'info' severity.
 *
 * @param message {String} Message to log
 * @param [data] {*} Optional data to be logged
 *
 * @method info
 */

  this.log('info', message, data);
};

exports.notice = function(message, data) {  // {{{2
/**
 * Logs message with 'notice' severity.
 *
 * @param message {String} Message to log
 * @param [data] {*} Optional data to be logged
 *
 * @method notice
 */

  this.log('notice', message, data);
};

exports.warning = exports.warn = function(message, data) {  // {{{2
/**
 * Logs message with 'warning' severity.
 *
 * @param message {String} Message to log
 * @param [data] {*} Optional data to be logged
 *
 * @method warning 
 */

  this.log('warning', message, data);
};

exports.error = exports.err = function(err, data) {  // {{{2
/**
 * Logs error object with optional data
 *
 * @param err {Object} Error object
 * @param [data] {*} Optional data to be logged
 *
 * @method error
 */

  if (! (err instanceof Error)) {
    err = new Error(err);
  }

  if (data) {
    if (err.data) {
      err.data.data = data;
    } else {
      err.data = data;
    }
  }

  console.log('========================================================');

  this.log('error', err.code, err.message);

  if ('data' in err) {
    console.log('Data:', err.data);
  }

  if (err.subject) {
    if (err.subject.M) {
      console.log('Class Name:', err.subject.M.module.id);
    }
    console.log('Identity:', Ose.identify(err.subject));
  }

  console.log('Stack Trace:');
  console.log(err.stack);
  console.log('--------------------------------------------------------');

  console.log('Logged at:');
  console.trace();
  console.log('========================================================');

  return err;
};

exports.unhandled = function(message, data) {  // {{{2
/** TODO: Throw exceptions intead.
 * Logs unhandled error object  with optional data
 *
 * @param message {String} Message to be logged
 * @param [data] {*} Optional data to be logged
 *
 * @method unhandled
 * @deprecated
 */

  this.log('unhandled', message, data);
  console.trace();
};

exports.log = function(severity, message, data) {  // {{{2
/**
 * Displays log message to stdout
 *
 * @param severity {String} Text indicating everity
 * @param message {String} Message to log
 * @param [data] {*} Optional data to be logged
 *
 * @method log
 */

  if (severity in Inverted) {
    severity = Inverted[severity];
  }

  if (severity in Severities) {
    console.log(
      Math.round(new Date().getTime() / 1000),
      severity.toUpperCase(),
      this.context,
      '|',
      message,
      data !== undefined ? '|' : '',
      data !== undefined ? data : ''
    );
  } else {
    this.error('Invalid severity', severity, message);
  }
};

// }}}1
// Private  {{{1
var Severities = {  // {{{2
  none: 0, //dark grey
  debug: 1, //light grey
  info: 2, //light grey
  notice: 3, //brown
  warning: 4, //yellow 
  warn: 4, //yellow
  error: 5, //light red
  critical: 6, //ligh tred
  crit: 6, //light red
  alert: 7, //red
  fatal: 8, //red
  emergency: 9, //red
  emerg: 9, //red
  unhandled: 10, //red
  catch: 11 //red
};

var Inverted = Ose._.invert(Severities);

// }}}1

