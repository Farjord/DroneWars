import { ECONOMY } from '../../data/economyData.js';
import { starterDeck } from '../../data/playerDeckData.js';

/**
 * Build state updates for copying the starter deck into a new slot.
 * Returns null if insufficient credits.
 * Caller is responsible for applying state via gameStateManager.
 */
export const createCopyStarterDeckSlot = (slotId, singlePlayerProfile) => {
  const cost = ECONOMY.STARTER_DECK_COPY_COST ?? 0;
  const credits = singlePlayerProfile?.credits || 0;

  if (credits < cost) return null;

  const newProfile = {
    ...singlePlayerProfile,
    credits: singlePlayerProfile.credits - cost
  };

  const deckData = {
    name: `Ship ${slotId}`,
    decklist: starterDeck.decklist.map(card => ({ id: card.id, quantity: card.quantity })),
    droneSlots: JSON.parse(JSON.stringify(starterDeck.droneSlots)),
    shipComponents: { ...starterDeck.shipComponents },
  };

  return {
    profileUpdate: newProfile,
    deckData
  };
};

/**
 * Build state updates for creating an empty deck slot.
 * Returns null if insufficient credits.
 * Caller is responsible for applying state via gameStateManager.
 */
export const createEmptyDeckSlot = (slotId, singlePlayerProfile) => {
  const cost = ECONOMY.STARTER_DECK_COPY_COST ?? 0;
  const credits = singlePlayerProfile?.credits || 0;

  if (credits < cost) return null;

  const newProfile = {
    ...singlePlayerProfile,
    credits: singlePlayerProfile.credits - cost
  };

  const deckData = {
    name: `Ship ${slotId}`,
    decklist: [],
    shipComponents: {},
  };

  return { profileUpdate: newProfile, deckData };
};
