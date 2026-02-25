// --- Effects Adapter ---
// All cards now define native effects[]; consumers read effects[] directly.
// The backward-compat layer (card.effect, card.targeting, card.conditionalEffects)
// has been removed — all consumers migrated to card.effects[0].

function enrichCardsWithEffects(cards) {
  return cards;
}

export { enrichCardsWithEffects };
