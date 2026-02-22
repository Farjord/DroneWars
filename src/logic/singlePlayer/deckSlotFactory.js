import { ECONOMY } from '../../data/economyData.js';
import { starterDeck } from '../../data/playerDeckData.js';

/**
 * Build state updates for copying the starter deck into a new slot.
 * Returns null if insufficient credits.
 * Caller is responsible for applying state via gameStateManager.
 */
export const createCopyStarterDeckSlot = (
  slotId, singlePlayerProfile, singlePlayerInventory,
  singlePlayerDroneInstances, singlePlayerShipComponentInstances
) => {
  const cost = ECONOMY.STARTER_DECK_COPY_COST ?? 0;
  const credits = singlePlayerProfile?.credits || 0;

  if (credits < cost) return null;

  const newProfile = {
    ...singlePlayerProfile,
    credits: singlePlayerProfile.credits - cost
  };

  const newInventory = { ...singlePlayerInventory };
  (starterDeck.decklist || []).forEach(card => {
    newInventory[card.id] = (newInventory[card.id] || 0) + card.quantity;
  });

  if (starterDeck.shipId) {
    newInventory[starterDeck.shipId] = (newInventory[starterDeck.shipId] || 0) + 1;
  }

  const newDroneInstances = [...(singlePlayerDroneInstances || [])];
  (starterDeck.droneSlots || []).forEach(slot => {
    if (slot.assignedDrone) {
      newDroneInstances.push({
        id: `DRONE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        droneName: slot.assignedDrone,
        shipSlotId: slotId,
        isDamaged: false,
        isMIA: false
      });
    }
  });

  const newComponentInstances = [...(singlePlayerShipComponentInstances || [])];
  Object.keys(starterDeck.shipComponents || {}).forEach(compId => {
    newComponentInstances.push({
      id: `COMP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      componentId: compId,
      shipSlotId: slotId,
      currentHull: 10,
      maxHull: 10
    });
  });

  const deckData = {
    name: `Ship ${slotId}`,
    decklist: starterDeck.decklist.map(card => ({ id: card.id, quantity: card.quantity })),
    droneSlots: JSON.parse(JSON.stringify(starterDeck.droneSlots)),
    shipComponents: { ...starterDeck.shipComponents },
    shipId: starterDeck.shipId
  };

  return {
    profileUpdate: newProfile,
    inventoryUpdate: newInventory,
    droneInstances: newDroneInstances,
    componentInstances: newComponentInstances,
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
    drones: [],
    shipComponents: {},
    shipId: null
  };

  return { profileUpdate: newProfile, deckData };
};
