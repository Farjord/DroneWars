// ========================================
// ANIMATION STATE REDUCER
// ========================================
// Manages all animation channel state via a single useReducer.
// Replaces 20 individual useState calls in App.jsx.
//
// State shape: { flyingDrones: [], flashEffects: [], ... }
// Actions: ADD, ADD_BATCH, REMOVE, SET, CLEAR

import { debugLog } from '../utils/debugLogger.js';

export const INITIAL_ANIMATION_STATE = {
  flyingDrones: [],
  flashEffects: [],
  healEffects: [],
  statChangeEffects: [],
  cardVisuals: [],
  cardReveals: [],
  shipAbilityReveals: [],
  phaseAnnouncements: [],
  laserEffects: [],
  teleportEffects: [],
  overflowProjectiles: [],
  splashEffects: [],
  barrageImpacts: [],
  railgunTurrets: [],
  railgunBeams: [],
  passNotifications: [],
  goAgainNotifications: [],
  triggerFiredNotifications: [],
  movementBlockedNotifications: [],
  statusConsumptions: [],
};

function validateChannel(state, channel, actionType) {
  if (!(channel in state)) {
    debugLog('ANIMATIONS', `⚠️ [animationReducer] Unknown channel '${channel}' in ${actionType} action`);
    return false;
  }
  return true;
}

export function animationReducer(state, action) {
  switch (action.type) {
    case 'ADD':
      if (!validateChannel(state, action.channel, 'ADD')) return state;
      return { ...state, [action.channel]: [...state[action.channel], action.item] };
    case 'ADD_BATCH':
      if (!validateChannel(state, action.channel, 'ADD_BATCH')) return state;
      return { ...state, [action.channel]: [...state[action.channel], ...action.items] };
    case 'REMOVE': {
      if (!validateChannel(state, action.channel, 'REMOVE')) return state;
      const ids = Array.isArray(action.id) ? action.id : [action.id];
      const idSet = new Set(ids);
      return { ...state, [action.channel]: state[action.channel].filter(item => !idSet.has(item.id)) };
    }
    case 'SET':
      if (!validateChannel(state, action.channel, 'SET')) return state;
      return { ...state, [action.channel]: action.value };
    case 'CLEAR':
      if (!validateChannel(state, action.channel, 'CLEAR')) return state;
      return { ...state, [action.channel]: [] };
    default:
      return state;
  }
}

/**
 * Creates a convenience wrapper around dispatch for readable handler code.
 * Prevents typos in action type strings across 20+ handler call sites.
 */
export function createAnimationDispatch(dispatch) {
  return {
    add: (channel, item) => dispatch({ type: 'ADD', channel, item }),
    addBatch: (channel, items) => dispatch({ type: 'ADD_BATCH', channel, items }),
    remove: (channel, id) => dispatch({ type: 'REMOVE', channel, id }),
    set: (channel, value) => dispatch({ type: 'SET', channel, value }),
    clear: (channel) => dispatch({ type: 'CLEAR', channel }),
  };
}
