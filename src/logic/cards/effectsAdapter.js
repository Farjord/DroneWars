// --- Effects Adapter ---
// Phase 1 compatibility layer: builds effects[] from legacy card schema fields.
// Consumed by cardData.js to enrich every card with a normalized effects[] array.
// Nothing reads effects[] yet — that begins in Phase 2.

// --- Reference Conversion Maps ---

const LOCATION_REF_MAP = {
  PRIMARY_SOURCE_LANE: { ref: 0, field: 'sourceLane' },
  COST_SOURCE_LANE: { ref: 0, field: 'sourceLane' },
};

const TARGET_REF_MAP = {
  PRIMARY_TARGET: { ref: 0, field: 'target' },
  COST_TARGET: { ref: 0, field: 'target' },
};

const VALUE_REF_MAP = {
  COST_CARD_VALUE: { ref: 0, field: 'cardCost' },
};

// --- Targeting Helpers ---

function convertRestrictions(restrictions) {
  if (!restrictions) return undefined;
  return restrictions.map(r => {
    if (typeof r === 'string') return r;
    if (r.reference && TARGET_REF_MAP[r.reference]) {
      return { ...r, reference: TARGET_REF_MAP[r.reference] };
    }
    return r;
  });
}

function convertLocation(location) {
  if (typeof location === 'string' && LOCATION_REF_MAP[location]) {
    return LOCATION_REF_MAP[location];
  }
  return location;
}

function convertTargeting(targeting) {
  if (!targeting) return { type: 'NONE' };
  const converted = { ...targeting };
  if (converted.location) converted.location = convertLocation(converted.location);
  if (converted.restrictions) converted.restrictions = convertRestrictions(converted.restrictions);
  return converted;
}

// --- Effect Building Helpers ---

function extractEffectFields(effect) {
  const { type, ...fields } = effect;
  return fields;
}

function convertValue(value) {
  if (typeof value === 'string' && VALUE_REF_MAP[value]) {
    return VALUE_REF_MAP[value];
  }
  return value;
}

function convertModValue(mod) {
  if (!mod) return mod;
  if (mod.value !== undefined) {
    const converted = convertValue(mod.value);
    if (converted !== mod.value) return { ...mod, value: converted };
  }
  return mod;
}

function convertConditionals(conditionalEffects) {
  if (!conditionalEffects || conditionalEffects.length === 0) return undefined;
  return conditionalEffects;
}

// --- Chain Builders ---

function buildSimpleEffect(card) {
  const { effect, targeting, conditionalEffects } = card;
  const targeting_ = convertTargeting(targeting);
  const fields = extractEffectFields(effect);

  if (fields.mod) fields.mod = convertModValue(fields.mod);

  const entry = { type: effect.type, ...fields, targeting: targeting_ };
  const conditionals = convertConditionals(conditionalEffects);
  if (conditionals) entry.conditionals = conditionals;
  return [entry];
}

function buildMovementEffect(card) {
  const { effect, targeting, secondaryTargeting, conditionalEffects } = card;
  const targeting_ = convertTargeting(targeting);
  const destination = { type: secondaryTargeting.type, location: secondaryTargeting.location };
  const fields = extractEffectFields(effect);

  const entry = { type: 'SINGLE_MOVE', targeting: targeting_, destination, ...fields };
  const conditionals = convertConditionals(conditionalEffects);
  if (conditionals) entry.conditionals = conditionals;
  return [entry];
}

function buildSecondaryEffectChain(card) {
  const { effect, targeting, secondaryTargeting, secondaryEffect, conditionalEffects } = card;

  const primaryTargeting = convertTargeting(targeting);
  const primaryFields = extractEffectFields(effect);
  const primaryEntry = { type: effect.type, ...primaryFields, targeting: primaryTargeting };
  const conditionals = convertConditionals(conditionalEffects);
  if (conditionals) primaryEntry.conditionals = conditionals;

  const secondaryTargeting_ = convertTargeting(secondaryTargeting);
  const secondaryFields = extractEffectFields(secondaryEffect);
  const secondaryEntry = { type: secondaryEffect.type, ...secondaryFields, targeting: secondaryTargeting_ };

  return [primaryEntry, secondaryEntry];
}

function buildAdditionalCostChain(card) {
  const { effect, targeting, additionalCost, conditionalEffects } = card;

  // Effect 0: the cost step (move friendly drone / discard card)
  let costEntry;
  if (additionalCost.type === 'SINGLE_MOVE') {
    const costTargeting = convertTargeting(additionalCost.targeting);
    costEntry = {
      type: 'SINGLE_MOVE',
      targeting: costTargeting,
      destination: { type: 'LANE', location: 'ADJACENT_TO_PRIMARY' },
    };
    if (additionalCost.properties) costEntry.properties = additionalCost.properties;
    if (additionalCost.description) costEntry.prompt = additionalCost.description;
  } else if (additionalCost.type === 'DISCARD_CARD') {
    const costTargeting = convertTargeting(additionalCost.targeting);
    costEntry = { type: 'DISCARD_CARD', targeting: costTargeting };
    if (additionalCost.description) costEntry.prompt = additionalCost.description;
  }

  // Effect 1: the main effect
  const mainTargeting = convertTargeting(targeting);
  const mainFields = extractEffectFields(effect);
  if (mainFields.mod) mainFields.mod = convertModValue(mainFields.mod);

  const mainEntry = { type: effect.type, ...mainFields, targeting: mainTargeting };
  if (effect.type === 'SINGLE_MOVE') {
    mainEntry.destination = { type: 'LANE', location: 'ADJACENT_TO_PRIMARY' };
  }
  const conditionals = convertConditionals(conditionalEffects);
  if (conditionals) mainEntry.conditionals = conditionals;

  return [costEntry, mainEntry];
}

function buildCompositeEffects(card) {
  const { effect, targeting, conditionalEffects } = card;
  const baseTargeting = convertTargeting(targeting);

  const entries = effect.effects.map(subEffect => {
    const fields = extractEffectFields(subEffect);
    return { type: subEffect.type, ...fields, targeting: baseTargeting };
  });

  const conditionals = convertConditionals(conditionalEffects);
  if (conditionals && entries.length > 0) {
    entries[entries.length - 1].conditionals = conditionals;
  }
  return entries;
}

function buildMultiMoveEffect(card) {
  const { effect, conditionalEffects } = card;
  const targeting = {
    type: 'DRONE',
    affinity: effect.source?.affinity || 'FRIENDLY',
    location: effect.source?.location || 'SAME_LANE',
    maxTargets: effect.count,
  };
  const destination = { type: 'LANE', affinity: effect.destination?.affinity };
  const entry = { type: 'MULTI_MOVE', targeting, destination };
  if (effect.properties) entry.properties = effect.properties;
  const conditionals = convertConditionals(conditionalEffects);
  if (conditionals) entry.conditionals = conditionals;
  return [entry];
}

// --- Main Entry Points ---

function buildEffectsFromLegacy(card) {
  if (card.effects) return card.effects;

  const { effect, secondaryEffect, additionalCost, secondaryTargeting } = card;

  if (!effect) return [];

  if (additionalCost) return buildAdditionalCostChain(card);
  if (secondaryEffect) return buildSecondaryEffectChain(card);
  if (secondaryTargeting && effect.type === 'SINGLE_MOVE') return buildMovementEffect(card);
  if (effect.type === 'COMPOSITE_EFFECT') return buildCompositeEffects(card);
  if (effect.type === 'MULTI_MOVE') return buildMultiMoveEffect(card);

  return buildSimpleEffect(card);
}

function enrichCardsWithEffects(cards) {
  return cards.map(card => {
    const effects = buildEffectsFromLegacy(card);
    return { ...card, effects };
  });
}

export { buildEffectsFromLegacy, enrichCardsWithEffects };
