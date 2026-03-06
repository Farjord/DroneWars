import { debugLog } from '../utils/debugLogger.js';

/**
 * Pure message queue with sequence tracking, out-of-order buffering, and resync support.
 * No game logic — delegates all processing to callbacks.
 */
export default class MessageQueue {
  /**
   * @param {Object} callbacks
   * @param {function(message): Promise<void>} callbacks.processMessage - Async handler for each message
   * @param {function(): void} callbacks.onResyncNeeded - Called when gap exceeds threshold
   * @param {function(fullState): void} callbacks.onResyncResponse - Called on full sync message
   * @param {function(): void} callbacks.onQueueDrained - Called after queue empties
   */
  constructor({ processMessage, onResyncNeeded, onResyncResponse, onQueueDrained }) {
    this.processMessageCallback = processMessage;
    this.onResyncNeeded = onResyncNeeded;
    this.onResyncResponse = onResyncResponse;
    this.onQueueDrained = onQueueDrained;

    this.messageQueue = [];
    this.isProcessing = false;
    this.lastProcessedSequence = 0;
    this.pendingOutOfOrderMessages = new Map();
    this.PENDING_THRESHOLD = 3;
    this.isResyncing = false;
    this.resyncTimeoutId = null;
    this.RESYNC_TIMEOUT_MS = 10000;
  }

  /**
   * Main entry point. Routes messages based on type and sequence.
   * @param {Object} message - Message with { type, data: { sequenceId?, isFullSync?, state? } }
   */
  enqueue(message) {
    const sequenceId = message.data?.sequenceId;
    const isFullSync = message.data?.isFullSync;

    if (isFullSync) {
      this.handleResyncResponse({ state: message.data?.state, sequenceId });
      return;
    }

    if (sequenceId !== undefined && message.type === 'state_update_received') {
      if (sequenceId > this.lastProcessedSequence + 1) {
        debugLog('MESSAGE_QUEUE', `OOO message buffered: seq=${sequenceId}, expected=${this.lastProcessedSequence + 1}`);
        this.pendingOutOfOrderMessages.set(sequenceId, { ...message });

        if (this.pendingOutOfOrderMessages.size > this.PENDING_THRESHOLD) {
          this.triggerResync();
        }
        return;
      }

      this.lastProcessedSequence = sequenceId;
    }

    this.messageQueue.push(message);
    this.processQueue();
    this.processPendingMessages();
  }

  /**
   * Processes queued messages sequentially (one at a time).
   */
  async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      debugLog('MESSAGE_QUEUE', `Processing message: type=${message.type}, seq=${message.data?.sequenceId}`);
      await this.processMessageCallback(message);
    }

    this.isProcessing = false;
    this.onQueueDrained?.();
  }

  /**
   * Drains buffered out-of-order messages that are now in sequence.
   */
  processPendingMessages() {
    let nextSeq = this.lastProcessedSequence + 1;

    while (this.pendingOutOfOrderMessages.has(nextSeq)) {
      const message = this.pendingOutOfOrderMessages.get(nextSeq);
      this.pendingOutOfOrderMessages.delete(nextSeq);
      this.messageQueue.push(message);
      this.lastProcessedSequence = nextSeq;
      nextSeq++;
    }

    if (this.messageQueue.length > 0 && !this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Triggers a resync when too many out-of-order messages accumulate.
   */
  triggerResync() {
    if (this.isResyncing) return;
    this.isResyncing = true;

    debugLog('MESSAGE_QUEUE', `Resync triggered: ${this.pendingOutOfOrderMessages.size} pending messages`);
    this.pendingOutOfOrderMessages.clear();
    this.messageQueue = [];
    this.onResyncNeeded?.();

    // Safety net: clear resync flag after timeout if host never responds
    this.resyncTimeoutId = setTimeout(() => {
      if (this.isResyncing) {
        debugLog('MESSAGE_QUEUE', `⚠️ Resync timeout (${this.RESYNC_TIMEOUT_MS}ms) — clearing resync flag`);
        this.isResyncing = false;
        this.processQueue();
      }
    }, this.RESYNC_TIMEOUT_MS);
  }

  /**
   * Handles a full-sync response: resets sequence tracking and clears buffers.
   * @param {Object} fullState - { state, sequenceId }
   */
  handleResyncResponse(fullState) {
    debugLog('MESSAGE_QUEUE', `Resync response received: seq=${fullState.sequenceId}`);

    // Clear the resync timeout since we got a response
    if (this.resyncTimeoutId) {
      clearTimeout(this.resyncTimeoutId);
      this.resyncTimeoutId = null;
    }

    this.onResyncResponse?.(fullState);

    if (fullState.sequenceId !== undefined) {
      this.lastProcessedSequence = fullState.sequenceId;
    }

    this.isResyncing = false;
  }

  /**
   * Returns current queue status for diagnostics.
   */
  getStatus() {
    return {
      queueLength: this.messageQueue.length,
      isProcessing: this.isProcessing,
      lastProcessedSequence: this.lastProcessedSequence,
    };
  }
}
