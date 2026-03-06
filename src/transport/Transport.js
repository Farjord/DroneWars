// Transport — Abstract interface for client-server communication.
// Implementations: LocalTransport (in-process), P2PTransport (peer-to-peer).

class Transport {
  /**
   * Send a game action to the server.
   * @param {string} type - Action type
   * @param {Object} payload - Action payload
   * @returns {Promise<void>}
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
  onActionAck(_callback) { /* Optional — not all transports support acks */ }

  dispose() {}
}

export default Transport;
