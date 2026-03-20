import { enrichCardsWithEffects } from '../logic/cards/effectsAdapter';
import { ordnanceCards } from './cards/ordnanceCards';
import { supportCards } from './cards/supportCards';
import { tacticCards } from './cards/tacticCards';
import { upgradeCards } from './cards/upgradeCards';

export const RARITY_DECK_LIMITS = {
  Common: 3,
  Uncommon: 2,
  Rare: 1,
  Mythic: 1,
};

const fullCardCollection = [
  ...ordnanceCards,
  ...supportCards,
  ...tacticCards,
  ...upgradeCards,
];

const baseCardMap = new Map(
  fullCardCollection
    .filter((c) => !c.id.endsWith('_ENHANCED'))
    .map((c) => [c.id, c])
);

// Enhanced cards inherit rarity from their base card (not authored in source data)
const processedCards = fullCardCollection.map((card) => {
  const rarity = card.id.endsWith('_ENHANCED')
    ? baseCardMap.get(card.baseCardId).rarity
    : card.rarity;
  return {
    ...card,
    rarity,
    maxInDeck: RARITY_DECK_LIMITS[rarity],
  };
});

export default enrichCardsWithEffects(processedCards);
