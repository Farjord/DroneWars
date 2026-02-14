// ========================================
// DECK EXPORT UTILITIES
// ========================================
// Functions for generating and parsing deck export codes
// Key behavior: Entries with quantity 0 are filtered out (defensive)
// Format: JS object literal with { shipId, decklist, dronePool, shipComponents }

// ========================================
// COMPONENT TYPE MAPPINGS
// ========================================
// Maps between placement names (aiData format) and component IDs

const PLACEMENT_TO_COMPONENT_TYPE = {
  'bridge': 'Bridge',
  'powerCell': 'PowerCell',
  'droneControlHub': 'DroneControl'
};

const COMPONENT_TYPE_TO_PLACEMENT = {
  'Bridge': 'bridge',
  'PowerCell': 'powerCell',
  'DroneControl': 'droneControlHub'
};

// Default component IDs for each type (used when importing)
const DEFAULT_COMPONENT_IDS = {
  'bridge': 'BRIDGE_001',
  'powerCell': 'POWERCELL_001',
  'droneControlHub': 'DRONECONTROL_001'
};

// Lane mapping
const LANE_INDEX_TO_LANE = ['l', 'm', 'r'];
const LANE_TO_LANE_INDEX = { 'l': 0, 'm': 1, 'r': 2 };

// ========================================
// JS OBJECT LITERAL PARSER
// ========================================

/**
 * Parse a JavaScript object literal string without using eval
 * Supports: single quotes, trailing commas, line/block comments, unquoted keys
 *
 * @param {string} jsText - JS object literal as string
 * @returns {{ success: boolean, data?: object, error?: string }}
 */
export const parseJSObjectLiteral = (jsText) => {
  try {
    if (!jsText || typeof jsText !== 'string') {
      return { success: false, error: 'Input must be a non-empty string' };
    }

    let text = jsText.trim();

    // Step 1: Remove block comments /* ... */
    text = text.replace(/\/\*[\s\S]*?\*\//g, '');

    // Step 2: Remove line comments // ... (but not inside strings)
    // This is tricky - we need to avoid removing // inside strings
    // Simple approach: remove // to end of line, being careful about strings
    text = removeLineComments(text);

    // Step 3: Convert single quotes to double quotes (outside of double-quoted strings)
    text = convertSingleToDoubleQuotes(text);

    // Step 4: Remove trailing commas before ] or }
    text = text.replace(/,(\s*[}\]])/g, '$1');

    // Step 5: Quote unquoted property names
    // Match property names that aren't already quoted
    text = text.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)(\s*:)/g, '$1"$2"$3');

    // Step 6: Parse with JSON.parse
    const data = JSON.parse(text);

    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: `Parse error: ${e.message}. Check for syntax errors in your deck code.`
    };
  }
};

/**
 * Remove line comments while preserving strings
 */
function removeLineComments(text) {
  const result = [];
  let i = 0;
  let inString = false;
  let stringChar = null;

  while (i < text.length) {
    // Check for string start/end
    if (!inString && (text[i] === '"' || text[i] === "'")) {
      inString = true;
      stringChar = text[i];
      result.push(text[i]);
      i++;
      continue;
    }

    if (inString) {
      // Check for escape
      if (text[i] === '\\' && i + 1 < text.length) {
        result.push(text[i], text[i + 1]);
        i += 2;
        continue;
      }
      // Check for string end
      if (text[i] === stringChar) {
        inString = false;
        stringChar = null;
      }
      result.push(text[i]);
      i++;
      continue;
    }

    // Check for line comment
    if (text[i] === '/' && i + 1 < text.length && text[i + 1] === '/') {
      // Skip until end of line
      while (i < text.length && text[i] !== '\n') {
        i++;
      }
      continue;
    }

    result.push(text[i]);
    i++;
  }

  return result.join('');
}

/**
 * Convert single quotes to double quotes while preserving double-quoted strings
 */
function convertSingleToDoubleQuotes(text) {
  const result = [];
  let i = 0;

  while (i < text.length) {
    // Check for double-quoted string (leave as is)
    if (text[i] === '"') {
      result.push(text[i]);
      i++;
      // Copy until closing quote
      while (i < text.length) {
        if (text[i] === '\\' && i + 1 < text.length) {
          result.push(text[i], text[i + 1]);
          i += 2;
          continue;
        }
        if (text[i] === '"') {
          result.push(text[i]);
          i++;
          break;
        }
        result.push(text[i]);
        i++;
      }
      continue;
    }

    // Check for single-quoted string (convert to double quotes)
    if (text[i] === "'") {
      result.push('"'); // Replace opening single quote with double quote
      i++;
      // Copy until closing quote, escaping internal double quotes
      while (i < text.length) {
        if (text[i] === '\\' && i + 1 < text.length) {
          // Handle escape sequences
          if (text[i + 1] === "'") {
            // Escaped single quote becomes regular character
            result.push("'");
          } else {
            result.push(text[i], text[i + 1]);
          }
          i += 2;
          continue;
        }
        if (text[i] === "'") {
          result.push('"'); // Replace closing single quote with double quote
          i++;
          break;
        }
        if (text[i] === '"') {
          // Escape internal double quotes
          result.push('\\"');
          i++;
          continue;
        }
        result.push(text[i]);
        i++;
      }
      continue;
    }

    result.push(text[i]);
    i++;
  }

  return result.join('');
}

// ========================================
// JS OBJECT LITERAL GENERATOR
// ========================================

/**
 * Generate a JS object literal string with proper formatting
 * Uses single quotes for strings and proper indentation
 *
 * @param {object} data - The data object to serialize
 * @returns {string} Formatted JS object literal
 */
export const generateJSObjectLiteral = (data) => {
  return serializeValue(data, 0);
};

/**
 * Format an object key: quote ALL_CAPS_STYLE keys (data IDs), leave camelCase unquoted
 */
function formatKey(key) {
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) && !/^[A-Z][A-Z0-9_]*$/.test(key)) {
    return key; // valid identifier + not ALL_CAPS → unquoted
  }
  return `'${key.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

/**
 * Check if an object contains only scalar values (string, number, boolean, null)
 */
function isSimpleObject(obj) {
  return Object.values(obj).every(v =>
    typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v === null
  );
}

/**
 * Serialize a value to JS literal format
 */
function serializeValue(value, indent) {
  if (value === null) {
    return 'null';
  }

  if (value === undefined) {
    return 'undefined';
  }

  if (typeof value === 'string') {
    // Escape single quotes and use single quotes
    const escaped = value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    return `'${escaped}'`;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return serializeArray(value, indent);
  }

  if (typeof value === 'object') {
    return serializeObject(value, indent);
  }

  return String(value);
}

/**
 * Serialize an array to JS literal format
 * Groups string arrays ~5 per line for compact output
 */
function serializeArray(arr, indent) {
  if (arr.length === 0) {
    return '[]';
  }

  const spaces = '  '.repeat(indent + 1);
  const closingSpaces = '  '.repeat(indent);

  // Group string arrays ~5 per line
  if (arr.every(item => typeof item === 'string')) {
    const serialized = arr.map(s => serializeValue(s, 0));
    const lines = [];
    for (let i = 0; i < serialized.length; i += 5) {
      lines.push(spaces + serialized.slice(i, i + 5).join(', '));
    }
    return `[\n${lines.join(',\n')}\n${closingSpaces}]`;
  }

  const items = arr.map(item => `${spaces}${serializeValue(item, indent + 1)}`);

  return `[\n${items.join(',\n')}\n${closingSpaces}]`;
}

/**
 * Serialize an object to JS literal format
 * Inlines simple nested objects (only scalar values) on a single line
 */
function serializeObject(obj, indent) {
  const keys = Object.keys(obj);
  if (keys.length === 0) {
    return '{}';
  }

  // Inline simple objects when nested (indent > 0)
  if (indent > 0 && isSimpleObject(obj)) {
    const entries = keys.map(key => `${formatKey(key)}: ${serializeValue(obj[key], 0)}`);
    return `{ ${entries.join(', ')} }`;
  }

  const spaces = '  '.repeat(indent + 1);
  const closingSpaces = '  '.repeat(indent);

  const entries = keys.map(key => {
    return `${spaces}${formatKey(key)}: ${serializeValue(obj[key], indent + 1)}`;
  });

  return `{\n${entries.join(',\n')}\n${closingSpaces}}`;
}

// ========================================
// FORMAT CONVERTERS
// ========================================

/**
 * Convert internal deck state to aiData format
 *
 * @param {Object} deck - { cardId: quantity }
 * @param {Object} selectedDrones - { droneName: quantity }
 * @param {Object} selectedShipComponents - { componentId: lane }
 * @param {Object} selectedShip - Ship object with id field
 * @param {Object} preservedFields - Extra fields from import to preserve
 * @returns {Object} Complete deck object in aiData format
 */
export const convertToAIFormat = (deck, selectedDrones, selectedShipComponents, selectedShip, preservedFields = {}) => {
  // Build decklist array from deck object
  const decklist = Object.entries(deck || {})
    .filter(([_, qty]) => qty > 0)
    .map(([id, quantity]) => ({ id, quantity }));

  // Build dronePool array from selectedDrones (expand quantities)
  const dronePool = [];
  Object.entries(selectedDrones || {})
    .filter(([_, qty]) => qty > 0)
    .forEach(([name, qty]) => {
      for (let i = 0; i < qty; i++) {
        dronePool.push(name);
      }
    });

  return {
    shipId: selectedShip?.id || 'SHIP_001',
    decklist,
    dronePool,
    shipComponents: selectedShipComponents || {}
  };
};

/**
 * Convert selectedShipComponents to placement array (legacy keys)
 * { 'BRIDGE_001': 'l', 'POWERCELL_001': 'm' } -> ['bridge', 'powerCell', 'droneControlHub']
 * Exported as shipComponentsToPlacement for consumers that need legacy key arrays.
 */
export function shipComponentsToPlacement(components) {
  if (!components || Object.keys(components).length === 0) {
    return [];
  }

  // Create array with 3 slots for lanes [l, m, r]
  const placement = [null, null, null];

  Object.entries(components).forEach(([componentId, lane]) => {
    // Determine component type from ID
    let componentType = null;
    if (componentId.includes('BRIDGE')) {
      componentType = 'Bridge';
    } else if (componentId.includes('POWERCELL')) {
      componentType = 'PowerCell';
    } else if (componentId.includes('DRONECONTROL')) {
      componentType = 'DroneControl';
    }

    if (componentType && lane) {
      const laneIndex = LANE_TO_LANE_INDEX[lane];
      if (laneIndex !== undefined) {
        placement[laneIndex] = COMPONENT_TYPE_TO_PLACEMENT[componentType];
      }
    }
  });

  // Filter out nulls and return
  return placement.filter(p => p !== null);
}

/**
 * Convert aiData format to internal deck state
 *
 * @param {Object} aiData - Deck object in aiData format
 * @returns {{ deck, selectedDrones, selectedShipComponents, shipId, preservedFields }}
 */
export const convertFromAIFormat = (aiData) => {
  // Convert decklist array to deck object
  const deck = {};
  (aiData.decklist || []).forEach(card => {
    if (card.quantity > 0) {
      deck[card.id] = card.quantity;
    }
  });

  // Convert dronePool array to selectedDrones object (aggregate quantities)
  const selectedDrones = {};
  (aiData.dronePool || []).forEach(name => {
    selectedDrones[name] = (selectedDrones[name] || 0) + 1;
  });

  // Read shipComponents directly; backward compat: convert from shipDeployment if needed
  let selectedShipComponents;
  if (aiData.shipComponents) {
    selectedShipComponents = { ...aiData.shipComponents };
  } else if (aiData.shipDeployment?.placement) {
    selectedShipComponents = convertPlacementToComponents(aiData.shipDeployment.placement);
  } else {
    selectedShipComponents = {};
  }

  // Extract shipId
  const shipId = aiData.shipId;

  // Capture preserved fields
  const preservedFields = {
    name: aiData.name,
    description: aiData.description,
    difficulty: aiData.difficulty,
    modes: aiData.modes,
    imagePath: aiData.imagePath
  };

  return {
    deck,
    selectedDrones,
    selectedShipComponents,
    shipId,
    preservedFields
  };
};

/**
 * Convert placement array to selectedShipComponents
 * ['bridge', 'powerCell', 'droneControlHub'] -> { 'BRIDGE_001': 'l', ... }
 */
function convertPlacementToComponents(placement) {
  const components = {};

  placement.forEach((placementName, index) => {
    if (placementName && index < 3) {
      const lane = LANE_INDEX_TO_LANE[index];
      const componentId = DEFAULT_COMPONENT_IDS[placementName];
      if (componentId) {
        components[componentId] = lane;
      }
    }
  });

  return components;
}

// ========================================
// FILE DOWNLOAD HELPER
// ========================================

/**
 * Trigger file download of deck export
 *
 * @param {string} content - File content
 * @param {string} filename - Download filename
 */
export const downloadDeckFile = (content, filename = 'deck-export.js') => {
  const blob = new Blob([content], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

