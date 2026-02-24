/**
 * News Ticker Configuration
 * Contains message templates and settings for the ticker system
 */

export const TICKER_CONFIG = {
  // Animation timing
  scrollDuration: 10, // seconds for full scroll cycle
  messageGap: '4rem', // gap between messages

  // Message type styling
  messageTypes: {
    info: {
      color: '#06b6d4', // cyan
      prefix: ''
    },
    warning: {
      color: '#eab308', // yellow
      prefix: ''
    },
    danger: {
      color: '#ef4444', // red
      prefix: 'ALERT: '
    },
    rumor: {
      color: '#a855f7', // purple
      prefix: ''
    },
    priority: {
      color: '#f97316', // orange
      prefix: 'HIGH PRIORITY: '
    }
  },

  // Divider between messages
  divider: '////'
};

// Threat level thresholds
export const THREAT_THRESHOLDS = {
  low: 5,      // encounter chance below this = low threat
  medium: 10,  // encounter chance below this = medium threat
  high: 15     // encounter chance at or above = high threat
};

// Detection level thresholds
export const DETECTION_THRESHOLDS = {
  low: 15,     // base detection below this = low
  medium: 30,  // base detection below this = medium
  high: 50     // base detection at or above = high
};

