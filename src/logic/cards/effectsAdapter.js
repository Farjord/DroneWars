// --- Effects Adapter ---
// Enriches cards with backward-compat fields derived from native effects[].
// All cards now define native effects[]; the legacy build functions have been removed.

// --- Backward-Compat Derivation ---
// For cards with native effects[], derive legacy fields (effect, targeting, conditionalEffects)
// from effects[0] so existing code (CardPlayManager.resolveCardPlay, AI evaluators) continues to work.

const CHAIN_ONLY_FIELDS = new Set(['targeting', 'conditionals', 'prompt', 'destination']);

function deriveBackwardCompat(enriched, effects) {
  const primary = effects[0];
  if (!primary) return;

  // Derive card.effect from effects[0] (strip chain-only fields)
  const effectFields = {};
  for (const key of Object.keys(primary)) {
    if (!CHAIN_ONLY_FIELDS.has(key)) effectFields[key] = primary[key];
  }
  enriched.effect = effectFields;

  // Derive card.targeting from effects[0].targeting
  if (primary.targeting) enriched.targeting = primary.targeting;

  // Derive card.conditionalEffects from effects[0].conditionals
  if (primary.conditionals) enriched.conditionalEffects = primary.conditionals;

}

function enrichCardsWithEffects(cards) {
  return cards.map(card => {
    const enriched = { ...card };

    if (card.effects && card.effects.length > 0 && !card.effect) {
      deriveBackwardCompat(enriched, card.effects);
    }

    return enriched;
  });
}

export { enrichCardsWithEffects };
