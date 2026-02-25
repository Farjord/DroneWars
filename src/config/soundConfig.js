// ========================================
// SOUND CONFIGURATION
// ========================================
// Data-driven sound manifest and event-to-sound mapping
// All sound files live in public/audio/sfx/ and are served via Vite's base path

const BASE_PATH = '/DroneWars/audio/sfx/';
const MUSIC_BASE_PATH = '/DroneWars/audio/music/';

/**
 * Sound manifest - all sound files with paths, channel, and default volume
 * Keys are sound IDs used throughout the system
 */
export const SOUND_MANIFEST = {
  // Phase announcements
  phase_deployment: {
    path: `${BASE_PATH}phase-deployment.mp3`,
    channel: 'sfx',
    volume: 0.7
  },
  phase_action: {
    path: `${BASE_PATH}phase-action.mp3`,
    channel: 'sfx',
    volume: 0.7
  },
  round_start: {
    path: `${BASE_PATH}round-start.wav`,
    channel: 'sfx',
    volume: 0.8
  },

  // Player actions
  your_turn: {
    path: `${BASE_PATH}your-turn.wav`,
    channel: 'sfx',
    volume: 0.6
  },
  card_play: {
    path: `${BASE_PATH}card-play.mp3`,
    channel: 'sfx',
    volume: 0.6
  },
  card_draw: {
    path: `${BASE_PATH}card-draw.mp3`,
    channel: 'sfx',
    volume: 0.5
  },
  card_hover_over: {
    path: `${BASE_PATH}card-hover-over.mp3`,
    channel: 'sfx',
    volume: 0.1
  },

  // UI interactions
  ui_click: {
    path: `${BASE_PATH}ui-click.wav`,
    channel: 'sfx',
    volume: 0.3
  },
  hex_click:        { path: `${BASE_PATH}hex-click.wav`,        channel: 'sfx', volume: 0.3 },
  hover_over:       { path: `${BASE_PATH}hover-over.wav`,       channel: 'sfx', volume: 0.2 },
  card_flip:        { path: `${BASE_PATH}card-flip.mp3`,        channel: 'sfx', volume: 0.2 },
  card_selected:    { path: `${BASE_PATH}card-selected.wav`,    channel: 'sfx', volume: 0.4 },
  card_deselected:  { path: `${BASE_PATH}card-deselected.wav`,  channel: 'sfx', volume: 0.4 },
  salvage_scan:     { path: `${BASE_PATH}salvage.wav`,          channel: 'sfx', volume: 0.5 },
  ship_move:        { path: `${BASE_PATH}ship-move.mp3`,        channel: 'sfx', volume: 0.5 },

  // Deployment
  deploy_teleport: {
    path: `${BASE_PATH}deploy-teleport.wav`,
    channel: 'sfx',
    volume: 0.3
  },

  // Turn actions
  player_pass: {
    path: `${BASE_PATH}pass.wav`,
    channel: 'sfx',
    volume: 0.5
  },

  // Combat lifecycle
  combat_start: {
    path: `${BASE_PATH}combat-start.mp3`,
    channel: 'sfx',
    volume: 0.8
  },
  combat_end: {
    path: `${BASE_PATH}combat-end.mp3`,
    channel: 'sfx',
    volume: 0.8
  },

  // Combat sounds
  laser_fire:      { path: `${BASE_PATH}laser-fire.mp3`,      channel: 'sfx', volume: 0.4 },
  shield_hit:      { path: `${BASE_PATH}shield-hit.wav`,      channel: 'sfx', volume: 0.4 },
  explosion_small: { path: `${BASE_PATH}explosion-small.wav`, channel: 'sfx', volume: 0.4 },
  explosion_large: { path: `${BASE_PATH}explosion-large.wav`, channel: 'sfx', volume: 0.4 },
  // Music tracks (looping, managed by MusicManager)
  music_menu:      { path: `${MUSIC_BASE_PATH}menu.ogg`,      channel: 'music', volume: 0.4 },
  music_hangar:    { path: `${MUSIC_BASE_PATH}hangar.ogg`,    channel: 'music', volume: 0.35 },
  music_tactical:  { path: `${MUSIC_BASE_PATH}tactical.ogg`,  channel: 'music', volume: 0.35 },
  music_combat:    { path: `${MUSIC_BASE_PATH}combat.ogg`,    channel: 'music', volume: 0.3 },
  music_deploying: { path: `${MUSIC_BASE_PATH}deploying.ogg`, channel: 'music', volume: 0.35 },
  music_victory:   { path: `${MUSIC_BASE_PATH}victory.ogg`,   channel: 'music', volume: 0.35 },
  music_defeat:    { path: `${MUSIC_BASE_PATH}defeat.ogg`,    channel: 'music', volume: 0.35 },

  // Tactical map threat music variants
  music_tactical_medium: { path: `${MUSIC_BASE_PATH}tactical-medium-threat.ogg`, channel: 'music', volume: 0.35 },
  music_tactical_high:   { path: `${MUSIC_BASE_PATH}tactical-high-threat.ogg`,   channel: 'music', volume: 0.35 },
};

/**
 * Event-to-sound mapping
 * Maps event sources and keys to sound IDs from the manifest
 *
 * Structure: { [source]: { [eventKey]: soundId } }
 *
 * Sources:
 *   - phaseAnimation: PhaseAnimationQueue 'animationStarted' events
 *   - actionCompleted: ActionProcessor 'action_completed' events
 *   - stateChange: GameStateManager/CombatStateManager state change events
 */
export const SOUND_EVENT_MAP = {
  // PhaseAnimationQueue events (keyed by animation.phaseName)
  phaseAnimation: {
    deployment: 'phase_deployment',
    action: 'phase_action',
    roundAnnouncement: 'round_start',
    playerPass: 'player_pass',
    opponentPass: 'player_pass',
    // determineFirstPlayer - no sound (visual only)
  },

  // ActionProcessor 'action_completed' events (keyed by actionType)
  actionCompleted: {
    cardPlay: 'card_play',
  },

  // AnimationManager animation-start events (keyed by animationType)
  animationStarted: {
    TELEPORT_IN: 'deploy_teleport',
    DRONE_ATTACK_START: 'laser_fire',
    SHIELD_DAMAGE: 'shield_hit',
    HULL_DAMAGE: 'explosion_small',
    DRONE_DESTROYED: 'explosion_large',
    SECTION_DESTROYED: 'explosion_large',
    SECTION_DAMAGED: 'explosion_small',
  },

  // Turn change events (keyed by turn ownership)
  turnChange: {
    myTurn: 'your_turn',
  },

  // CombatStateManager state change events (keyed by event.type)
  stateChange: {
    COMBAT_STARTED: 'combat_start',
    COMBAT_ENDED: 'combat_end',
  },
};

/**
 * Look up which sound to play for a given event
 * @param {string} source - Event source ('phaseAnimation', 'actionCompleted', 'stateChange')
 * @param {string} key - Event key (e.g., 'deployment', 'cardPlay', 'COMBAT_STARTED')
 * @returns {string|null} Sound ID or null if no mapping exists
 */
export function getSoundForEvent(source, key) {
  return SOUND_EVENT_MAP[source]?.[key] || null;
}

// ========================================
// MUSIC ZONE CONFIGURATION
// ========================================

/** Maps appState values to music zones */
export const SCREEN_TO_ZONE = {
  menu: 'menu', lobby: 'menu', eremosEntry: 'menu',
  deckBuilder: 'menu', testingSetup: 'menu', modalShowcase: 'menu',
  hangar: 'hangar', extractionDeckBuilder: 'hangar',
  repairBay: 'hangar', quickDeployEditor: 'hangar',
  tacticalMap: 'tactical',
  inGame: 'combat',
};

/** Maps music zones to sound IDs from the manifest */
export const ZONE_TO_TRACK = {
  menu: 'music_menu', hangar: 'music_hangar', tactical: 'music_tactical',
  combat: 'music_combat', deploying: 'music_deploying',
  victory: 'music_victory', defeat: 'music_defeat',
  tactical_medium: 'music_tactical_medium',
  tactical_high: 'music_tactical_high',
};

/** Crossfade duration in milliseconds */
export const MUSIC_CROSSFADE_MS = 1500;
