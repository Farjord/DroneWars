// Transport — Abstract interface for client-server communication.
// Implementations: LocalTransport (in-process), P2PTransport (peer-to-peer).

class Transport {
  /**
   * Send a game action to the server.
   * @param {string} type - Action type
   * @param {Object} payload - Action payload
   * @returns {Promise<Object|undefined>} Action result (LocalTransport) or pending marker (P2PTransport)
   */
  async sendAction(_type, _payload) { throw new Error('Not implemented'); }

  /**
   * Register callback for server responses.
   * @param {function({state, animations}): void} callback
   */
  onResponse(_callback) { throw new Error('Not implemented'); }

  /**
   * Register callback for action acknowledgements (P2P only).
   * @param {function({actionType, success, error, authoritativeState}): void} callback
   */
  onActionAck(_callback) { throw new Error('Not implemented'); }

  /**
   * Register callback for when the message queue has drained (P2P only).
   * Optional — only relevant for transports with message queuing.
   * @param {function(): void} callback
   */
  onQueueDrained(_callback) {}

  dispose() {}
}

export default Transport;
