// --- Chain Constants ---
// Shared constants and utilities for the effect chain model.

// Fields present in effects[] entries but NOT part of the EffectRouter interface.
const CHAIN_ONLY_FIELDS = new Set(['targeting', 'conditionals', 'prompt', 'destination']);

// Strip chain-only fields from an effects[] entry, returning a plain effect object.
function stripChainFields(chainEffect) {
  const result = {};
  for (const key of Object.keys(chainEffect)) {
    if (!CHAIN_ONLY_FIELDS.has(key)) result[key] = chainEffect[key];
  }
  return result;
}

export { CHAIN_ONLY_FIELDS, stripChainFields };
