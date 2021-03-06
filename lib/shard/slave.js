'use strict';

var Ose = require('ose');
var M = Ose.class(module, C, 'EventEmitter');

/** Doc {{{1
 * @module ose
 * @submodule ose.data
 */

/**
 * @caption Slave shard client socket
 *
 * @readme
 * Socket for communicating from a shard to a master in another OSE
 * instance.
 *
 * @class ose.lib.shard.slave
 * @type class
 */

// Public {{{1
function C(shard, peer, cb) {  // {{{2
/**
 * Class constructor called from `space.sync()`. Sends request to the master
 * shard to establish a link.
 *
 * @param shard {Object} Slave shard
 * @param peer {Object} Shard's home peer
 * @param cb {Function} Callback to be called after the link is established
 *
 * @method init
 * @async
 */

  M.super.call(this);

  if (shard.master) {
    throw Ose.error(shard, 'duplicitMaster');
  }

  shard.master = this;

  this.shard = shard;
  if (cb) {
    this.once('done', cb);
  }

  this.peer = peer;

  connect(this);
};

exports.open = function(data) {  // {{{2
/**
 * Open handler
 *
 * @param data {Object} Response object
 * @param data.synced {Boolean} Whether it is possible to communicate with the `home`
 *
 * @method open
 */

//  console.log('SHARD SLAVE OPEN', this.lid);

  for (var key in this.shard.cache) {
    var entry = this.shard.cache[key];
    if (! entry.slaves) continue;
    entry.linkMaster();
  }

  this.synced(data.synced);

  this.emit('done', null, this);
};

exports.close = function() {  // {{{2
/**
 * Close handler
 *
 * @method close
 */

//  console.log('SHARD SLAVE CLOSE', this.lid);

  close(this);

  this.emit('done', Ose.error(this, 'CLOSED'));
};

exports.error = function(err) {  // {{{2
/**
 * Error handler
 *
 * @param err {Object} Error object
 *
 * @method error
 */

//  console.log('SHARD SLAVE ERROR', this.lid);

  close(this, err);

  this.emit('done', err);
};

exports.synced = function(data) {  // {{{2
/**
 * Synced handler
 *
 * @param data {Boolean} Whether it is possible to communicate with the `home`.
 *
 * @method synced
 */
  if (typeof data === 'boolean') {
    this.shard.setSynced(data);
  } else {
    Ose.link.error(this, Ose.error(this, 'invalidSynced', data));
  }
};

// }}}1
// Private {{{1
function close(that, err) {  // {{{2
//  console.log('SHARD SLAVE CLOSE');

  var s = that.shard;

  if (! s) {
    throw Ose.error(this, 'UNEXPECTED', '"Shard to master" client socket was already closed!');
  }

  s.setSynced(false);
  if (s.check2Link()) {
    switch (err.code) {
    case 'DISCONNECTED':
      setTimeout(function() {
        connect(that);
      }, 1000);
      return;
    }

//    console.log('SHARD SLAVE CLOSE');

    return;
  }

//  console.log('SHARD SLAVE REMOVE');

  delete s.master;
  delete that.shard;

  return;
};

function connect(that) {  // {{{2
  if (that.peer.isConnected()) {

//    console.log('SHARD SLAVE CONNECT to connected peer', that.peer.name);

    Ose.link.prepare(that);

    that.peer.ws.addLink(that);

    that.peer.ws.tx({
      type: 'shard',
      newLid: that.lid,
      handlers: that.handlers,
      shard: that.shard.identify(),
    });
  } else {

//    console.log('SHARD SLAVE CONNECT disconnected peer', that.peer.name);

    that.emit('done', Ose.error(that, 'DISCONNECTED'));
    that.peer.once('connected', connect.bind(null, that));
  }
};

// }}}1
