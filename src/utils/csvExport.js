// ========================================
// CSV EXPORT UTILITY
// ========================================
// Utilities for exporting AI decision data to CSV format for analysis

import { debugLog } from './debugLogger.js';

/**
 * Escape CSV special characters (quotes, commas, newlines)
 * @param {string} value - Value to escape
 * @returns {string} - Escaped value
 */
const escapeCSVValue = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // If contains quotes, commas, or newlines, wrap in quotes and escape internal quotes
  if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
};

/**
 * Strip emoji characters from text
 * @param {string} text - Text that may contain emojis
 * @returns {string} - Text with emojis removed
 */
const stripEmojis = (text) => {
  if (!text) return text;

  // Remove emojis using regex that matches all Unicode emoji ranges
  // This regex covers:
  // - Emoticons (😀-😿, 😇-🙏, etc.)
  // - Symbols & Pictographs (🌀-🗿, 📀-📿, etc.)
  // - Transport & Map (🚀-🛿)
  // - Supplemental Symbols (🤀-🧿)
  // - Variation Selectors (used for emoji presentation)
  return text
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F1E0}-\u{1F1FF}]/gu, '')
    .replace(/\s+/g, ' ') // Collapse multiple spaces into one
    .trim();
};

/**
 * Format logic array to single text field for CSV
 * @param {Array<string>} logicArray - Array of logic strings
 * @returns {string} - Formatted logic string (semicolon-separated)
 */
export const formatLogicForCsv = (logicArray) => {
  if (!Array.isArray(logicArray) || logicArray.length === 0) {
    return '';
  }

  // Strip emojis from each entry and join with semicolons for readability
  const cleanedLogic = logicArray.map(entry => stripEmojis(entry));
  return cleanedLogic.join('; ');
};

/** CSV column headers for decision exports */
const DECISION_CSV_HEADERS = [
  'GameTimestamp', 'Phase', 'Turn', 'ActionIndex', 'Type',
  'Instigator', 'Target', 'FinalScore', 'Logic', 'IsChosen',
  'AIEnergy', 'AICPU', 'OpponentEnergy', 'OpponentCPU'
];

/**
 * Extract player context metrics from game state
 * @param {Object} gameState - Current game state
 * @returns {Object} - { aiEnergy, aiCPU, opponentEnergy, opponentCPU }
 */
const extractContext = (gameState) => ({
  aiEnergy: gameState?.player2?.energy ?? 'N/A',
  aiCPU: gameState?.player2 ? Object.values(gameState.player2.dronesOnBoard || {}).flat().length : 'N/A',
  opponentEnergy: gameState?.player1?.energy ?? 'N/A',
  opponentCPU: gameState?.player1 ? Object.values(gameState.player1.dronesOnBoard || {}).flat().length : 'N/A'
});

/**
 * Convert a batch of decisions into CSV row strings
 * @param {Array} decisions - Decision array
 * @param {string} timestamp - Game timestamp
 * @param {string} phase - Decision phase
 * @param {number} turn - Turn number
 * @param {Object} ctx - Context from extractContext()
 * @returns {Array<string>} - Array of CSV row strings
 */
const buildDecisionRows = (decisions, timestamp, phase, turn, ctx) => {
  return decisions.map((decision, index) => [
    escapeCSVValue(timestamp || new Date().toISOString()),
    escapeCSVValue(phase || 'unknown'),
    escapeCSVValue(turn ?? 'N/A'),
    escapeCSVValue(index),
    escapeCSVValue(decision.type || 'deploy'),
    escapeCSVValue(decision.instigator || 'N/A'),
    escapeCSVValue(decision.targetName || 'N/A'),
    escapeCSVValue(decision.score ?? 0),
    escapeCSVValue(formatLogicForCsv(decision.logic || [])),
    escapeCSVValue(decision.isChosen ? 'TRUE' : 'FALSE'),
    escapeCSVValue(ctx.aiEnergy),
    escapeCSVValue(ctx.aiCPU),
    escapeCSVValue(ctx.opponentEnergy),
    escapeCSVValue(ctx.opponentCPU)
  ].join(','));
};

/**
 * Convert decision objects to CSV string
 * @param {Object} params - Parameters object
 * @param {Array} params.decisions - Array of decision entries
 * @param {string} params.phase - Decision phase (deployment, action, interception)
 * @param {number} params.turn - Turn number
 * @param {string} params.gameTimestamp - Game start timestamp
 * @param {Object} params.gameState - Current game state (for context)
 * @returns {string} - CSV formatted string
 */
export const convertDecisionsToCsv = ({ decisions, phase, turn, gameTimestamp, gameState }) => {
  if (!decisions || decisions.length === 0) {
    return '';
  }

  const ctx = extractContext(gameState);
  const csvRows = [
    DECISION_CSV_HEADERS.join(','),
    ...buildDecisionRows(decisions, gameTimestamp, phase, turn, ctx)
  ];

  return csvRows.join('\n');
};

/**
 * Convert full game decision history to CSV string
 * @param {Array} decisionHistory - Array of decision history entries
 * @returns {string} - CSV formatted string
 */
export const convertFullHistoryToCsv = (decisionHistory) => {
  if (!decisionHistory || decisionHistory.length === 0) {
    return '';
  }

  const csvRows = [DECISION_CSV_HEADERS.join(',')];

  decisionHistory.forEach((entry) => {
    const { decisions, phase, turn, timestamp, gameState } = entry;
    const ctx = extractContext(gameState);
    csvRows.push(...buildDecisionRows(decisions, timestamp, phase, turn, ctx));
  });

  return csvRows.join('\n');
};

/**
 * Trigger browser download of CSV file
 * @param {string} csvContent - CSV formatted string
 * @param {string} filename - Filename for download (without extension)
 */
export const downloadCsv = (csvContent, filename) => {
  if (!csvContent) {
    debugLog('STATE_SYNC', '⚠️ [CSV Export] No content to download');
    return;
  }

  // Add .csv extension if not present
  const fullFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;

  // Create blob and download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  link.href = URL.createObjectURL(blob);
  link.download = fullFilename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up object URL
  setTimeout(() => URL.revokeObjectURL(link.href), 100);

  debugLog('STATE_SYNC', `[CSV Export] Downloaded: ${fullFilename}`);
};

/**
 * Export single decision to CSV and trigger download
 * @param {Object} params - Parameters object
 * @param {Array} params.decisions - Decision array for single decision
 * @param {string} params.phase - Decision phase
 * @param {number} params.turn - Turn number
 * @param {string} params.gameTimestamp - Game start timestamp
 * @param {Object} params.gameState - Current game state
 */
export const exportSingleDecision = ({ decisions, phase, turn, gameTimestamp, gameState }) => {
  const csvContent = convertDecisionsToCsv({ decisions, phase, turn, gameTimestamp, gameState });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `ai-decision-${phase}-turn${turn}-${timestamp}`;
  downloadCsv(csvContent, filename);
};

/**
 * Export full game decision history to CSV and trigger download
 * @param {Array} decisionHistory - Full decision history array
 */
export const exportFullHistory = (decisionHistory) => {
  const csvContent = convertFullHistoryToCsv(decisionHistory);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `ai-decisions-full-game-${timestamp}`;
  downloadCsv(csvContent, filename);
};
