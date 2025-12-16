// ========================================
// DECK EXPORT UTILITIES
// ========================================
// Functions for generating and parsing deck export codes
// Key behavior: Entries with quantity 0 are filtered out (defensive)
//
// Supports two formats:
// 1. Legacy pipe-delimited format: "cards:CARD001:4|drones:Talon:1|ship:BRIDGE_001:l"
// 2. JS object literal format (matching aiData.js style)

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
 */
function serializeArray(arr, indent) {
  if (arr.length === 0) {
    return '[]';
  }

  const spaces = '  '.repeat(indent + 1);
  const closingSpaces = '  '.repeat(indent);

  const items = arr.map(item => `${spaces}${serializeValue(item, indent + 1)}`);

  return `[\n${items.join(',\n')}\n${closingSpaces}]`;
}

/**
 * Serialize an object to JS literal format
 */
function serializeObject(obj, indent) {
  const keys = Object.keys(obj);
  if (keys.length === 0) {
    return '{}';
  }

  const spaces = '  '.repeat(indent + 1);
  const closingSpaces = '  '.repeat(indent);

  const entries = keys.map(key => {
    const value = serializeValue(obj[key], indent + 1);
    return `${spaces}${key}: ${value}`;
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

  // Build placement array from selectedShipComponents
  const placement = convertComponentsToPlacement(selectedShipComponents);

  // Build the result object, preserving fields from import
  const result = {
    name: preservedFields.name || 'Exported Deck'
  };

  // Add optional preserved fields if they exist
  if (preservedFields.description) {
    result.description = preservedFields.description;
  }
  if (preservedFields.difficulty) {
    result.difficulty = preservedFields.difficulty;
  }
  if (preservedFields.modes) {
    result.modes = preservedFields.modes;
  }
  if (preservedFields.imagePath) {
    result.imagePath = preservedFields.imagePath;
  }

  // Add shipId
  result.shipId = selectedShip?.id || 'SHIP_001';

  // Add dronePool
  result.dronePool = dronePool;

  // Add shipDeployment
  result.shipDeployment = {
    strategy: preservedFields.shipDeployment?.strategy || 'balanced',
    placement: placement,
    reasoning: preservedFields.shipDeployment?.reasoning || 'User-configured layout'
  };

  // Add decklist
  result.decklist = decklist;

  return result;
};

/**
 * Convert selectedShipComponents to placement array
 * { 'BRIDGE_001': 'l', 'POWERCELL_001': 'm' } -> ['bridge', 'powerCell', 'droneControlHub']
 */
function convertComponentsToPlacement(components) {
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

  // Convert placement array to selectedShipComponents
  const selectedShipComponents = convertPlacementToComponents(aiData.shipDeployment?.placement || []);

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

  // Preserve shipDeployment strategy and reasoning
  if (aiData.shipDeployment) {
    preservedFields.shipDeployment = {
      strategy: aiData.shipDeployment.strategy,
      reasoning: aiData.shipDeployment.reasoning
    };
  }

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

// ========================================
// LEGACY DECK CODE FORMAT
// ========================================

/**
 * Generate a deck export code string
 * Filters out any entries with quantity 0 as a defensive measure
 *
 * @param {Object} deck - Deck state { cardId: quantity }
 * @param {Object} selectedDrones - Drone state { droneName: quantity }
 * @param {Object} selectedShipComponents - Components { componentId: lane }
 * @returns {string} Export code in format "cards:...|drones:...|ship:..."
 */
export const generateDeckCode = (deck, selectedDrones, selectedShipComponents) => {
  // Filter out any cards with quantity 0 (defensive - should not exist if state is correct)
  const cardsStr = Object.entries(deck || {})
    .filter(([id, q]) => q > 0)
    .map(([id, q]) => `${id}:${q}`)
    .join(',');

  // Filter out any drones with quantity 0
  const dronesStr = Object.entries(selectedDrones || {})
    .filter(([name, q]) => q > 0)
    .map(([name, q]) => `${name}:${q}`)
    .join(',');

  // Filter out components with null/undefined lane (already done, but defensive)
  const shipStr = Object.entries(selectedShipComponents || {})
    .filter(([id, lane]) => lane)
    .map(([id, lane]) => `${id}:${lane}`)
    .join(',');

  return `cards:${cardsStr}|drones:${dronesStr}|ship:${shipStr}`;
};
