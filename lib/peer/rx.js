'use strict';

var Ose = require('ose');
var M = Ose.module(module);

var WsMaster = M.class('../ws/master');
var WsRelay = M.class('../ws/relay');
var WsSlave = M.class('../ws/slave');

/** Doc {{{1
 * @module ose
 * @submodule ose.peer
 */

/**
 * @caption Peer RX handlers
 *
 * @readme
 * This module contains handlers for incomming communication of
 * standard peer to peer traffic.
 *
 * @class ose.lib.peer.rx
 * @type module
 */

// Public {{{1
exports.ping = function(ws, req) {  // {{{2
/**
 * Ping handler.
 * TODO: respond pong
 *
 * @param ws {Object} [WebSocket wrapper]
 * @param req {Object} Request data
 *
 * @method ping
 */

  ws.lastRx = new Date().getTime();

//  M.log.missing();
};

exports.pong = function(ws, req) {  // {{{2
/**
 * Pong handler.
 * TODO: Calculate timeshift
 *
 * @param ws {Object} [WebSocket wrapper]
 * @param req {Object} Request data
 *
 * @method pong
 */

  M.log.missing();
};

exports.shard = function(ws, req) {  // {{{2
/**
 * Establishes a link to the master shard
 *
 * @param ws {Object} [WebSocket wrapper]
 * @param req {Object} Request data
 *
 * @method shard
 */

  Ose.spaces.getShard(req.shard, function(err, shard) {
    if (err) {
      ws.txError(req.newLid, err);
    } else {
      shard.linkSlave(new WsMaster(ws, req.newLid, req.handlers));
    }
  });
};

exports.open = function(ws, req) {  // {{{2
/**
 * Open link response handler
 *
 * @param ws {Object} [WebSocket wrapper]
 * @param req {Object} Request data
 *
 * @method open
 */

  var socket = getLink(ws, req);
  if (! socket) return;

  if (socket.link === 'relay') {
    new WsRelay(ws, req, socket);
    return;
  }

  if (typeof socket.open !== 'function') {
    error(socket, 'MISSING_HANDLER', 'open');
    return;
  }

  new WsSlave(ws, socket, req.handlers, req.data);

  return;
};

exports.close = function(ws, req) {  // {{{2
/**
 * Close link handler
 *
 * @param ws {Object} [WebSocket wrapper]
 * @param req {Object} Request data
 *
 * @method close
 */

  var socket = getLink(ws, req);
  if (! socket) return;

  // TODO: socket timeout must be cleared (both links)
  ws.delLid(req.lid);

  if (socket.link === 'relay') {
    Logger.todo('Relay close request', this, req);
    return;
  }

  switch (typeof socket) {
  case 'function':
    socket(undefined, req.data);
    return;
  case 'object':
    if (socket.link) {
      delete socket.link.link;
      delete socket.link.ws;
      delete socket.link;
    }
    Ose.link.close(socket, req.data);
    return;
  }

  throw Ose.error(this, 'invalidSocket', socket);
};

exports.error = function(ws, req) {  // {{{2
/**
 * Error handler
 *
 * @param ws {Object} [WebSocket wrapper]
 * @param req {Object} Request data
 *
 * @method error
 */

  var socket = getLink(ws, req);
  if (! socket) return;

  ws.delLid(req.lid);

  /*
  if (socket.forward) {
    socket.forward.delLid(req.lid);
    socket.forward.tx(req);
    return;
  }
  */

  if (socket.link) {
    delete socket.link.link;
    delete socket.link.ws;
    delete socket.link;
  }

  Ose.link.error(socket, Ose.error(ws.peer, req.code || 'RX_ERROR', req.message, req.data));
};

exports.command = function(ws, req) {  // {{{2
/**
 * Command handler
 *
 * @param ws {Object} [WebSocket wrapper]
 * @param req {Object} Request data
 *
 * @method command
 */

  var socket = getLink(ws, req);
  if (! socket) return;

  if (socket.ws) {
    socket.ws.tx(req);
    return;
  }

  if (Ose.link.forbiddenNames.indexOf(req.name) >= 0) {
    Ose.link.error(socket, Ose.error(ws, 'FORBIDDEN_HANDLER', req.name));
    return;
  };

  if (typeof socket[req.name] !== 'function') {
    Ose.link.error(socket, Ose.error(socket, 'MISSING_HANDLER', req.name));
    return;
  }

  var master;
  if (req.newLid) {
    var master = new WsMaster(ws, req.newLid, req.handlers);
  }

//  console.log('CALLING COMMAND', req.name, req.data, typeof master);

  socket[req.name](req.data, master);
  return;
};

// }}}1
// Private {{{1
function getLink(ws, req) {  // {{{2
  if (! req.lid) {
    M.log.error(Ose.error(ws, 'MISSING_LINK', req));
    return;
  }

  var result = ws.links[req.lid.toString(16)];
  if (result) {
    return result;
  }

  if (req.type === 'error') {
    M.log.error(Ose.error(ws, 'MISSING_LINK', req));
  } else {
    ws.txError(req.lid, Ose.error(ws, 'MISSING_LINK', req));
  }
  return;
};

function error(ws, err, data) {  // {{{2
  err = Ose.error(ws, err, data);

  if (data.lid) {
    ws.txError(data.lid, err);
  }

  M.log.error(err);
};

// }}}1
