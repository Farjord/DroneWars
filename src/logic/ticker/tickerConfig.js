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

// Message templates organized by generator type
export const MESSAGE_TEMPLATES = {
  threat: {
    lowActivity: [
      'Hostile activity minimal in Sector {name}',
      'Sector {name} showing reduced patrol presence',
      'Clear skies reported in Sector {name}',
      'Minimal drone activity detected in Sector {name}'
    ],
    mediumActivity: [
      'Moderate threat levels in Sector {name}',
      'Standard patrol activity in Sector {name}',
      'Sector {name} operating at normal threat capacity'
    ],
    highActivity: [
      'Elevated threat detected in Sector {name}',
      'Heavy patrol activity in Sector {name}',
      'Sector {name} showing increased hostile presence',
      'Warning: High encounter probability in Sector {name}'
    ],
    coreZoneDanger: [
      'Core zones in Sector {name} showing heavy patrol activity',
      'Avoid core regions of Sector {name} - high threat',
      'Central Sector {name} under heavy surveillance'
    ],
    perimeterSafe: [
      'Perimeter of Sector {name} appears relatively clear',
      'Outer zones of Sector {name} show reduced activity',
      'Safe approach vectors available in Sector {name}'
    ]
  },

  resource: {
    ordnance: [
      '{count} Ordnance caches located in Sector {name}',
      'Weapons stockpile detected in Sector {name}',
      'Munitions storage confirmed in Sector {name}'
    ],
    support: [
      'Support facilities detected in Sector {name}',
      'Repair stations identified in Sector {name}',
      '{count} support nodes available in Sector {name}'
    ],
    tactic: [
      'Tactical data nodes identified in Sector {name}',
      'Strategic intel cache in Sector {name}',
      '{count} tactical assets marked in Sector {name}'
    ],
    upgrade: [
      'Upgrade components detected in Sector {name}',
      'Tech salvage available in Sector {name}',
      '{count} upgrade facilities in Sector {name}'
    ],
    highValue: [
      'Sector {name} reports high salvage potential',
      'Multiple resource nodes detected in Sector {name}',
      'Rich pickings available in Sector {name}'
    ]
  },

  priority: {
    droneBlueprints: [
      'Drone blueprints confirmed in Sector {name}',
      'Manufacturing schematics located in Sector {name}',
      'Rare drone designs detected in Sector {name}'
    ],
    tokenRequired: [
      'Security clearance required for Sector {name}',
      'Sector {name} access restricted - token needed',
      'Encrypted zone: Sector {name} requires authorization'
    ],
    manufacturing: [
      '{count} manufacturing facilities active in Sector {name}',
      'Production centers operational in Sector {name}',
      'Industrial complex detected in Sector {name}'
    ]
  },

  rumor: {
    generic: [
      'Salvagers report unusual energy signatures near Sector {name}...',
      'Unconfirmed reports of abandoned cargo in the outer zones...',
      'Static interference detected... source unknown...',
      'Long-range sensors picking up anomalous readings...',
      'Whispers of pre-war tech caches circulating among scavengers...',
      'Drone swarm activity detected on long-range scanners...',
      'Encrypted transmissions intercepted from Sector {name}...',
      'Faint distress beacon detected... origin unclear...',
      'Unusual thermal signatures in Sector {name} vicinity...',
      'Old salvage records mention valuable cargo near Sector {name}...',
      'Pirate activity reported in adjacent sectors...',
      'Automated defense systems may be offline in Sector {name}...',
      'Uncharted debris field detected near Sector {name}...',
      'Signal echo analysis suggests hidden caches nearby...'
    ]
  }
};
