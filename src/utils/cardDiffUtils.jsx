import React from 'react';

/**
 * Positional word-zip diff for card descriptions.
 * Walks both word arrays in parallel; mismatched or trailing words get orange highlight.
 * NOTE: Assumes words are never reordered — only changed in place or appended.
 * If future cards break this assumption, upgrade to LCS.
 */
export function diffDescriptions(baseText, enhancedText) {
  const base = baseText ?? '';
  const enhanced = enhancedText ?? '';
  if (base === enhanced) return null;

  const baseTokens = base.split(/(\s+)/);
  const enhTokens = enhanced.split(/(\s+)/);

  return enhTokens.map((token, i) => {
    const isWhitespace = /^\s+$/.test(token);
    const isChanged = !isWhitespace && (i >= baseTokens.length || token !== baseTokens[i]);
    return isChanged
      ? <span key={i} className="text-orange-400">{token}</span>
      : <span key={i}>{token}</span>;
  });
}

export function getCardDiffs(baseCard, enhancedCard) {
  return {
    cost: baseCard.cost !== enhancedCard.cost,
    slots: (baseCard.slots ?? null) !== (enhancedCard.slots ?? null),
    descriptionNode: diffDescriptions(baseCard.description, enhancedCard.description),
  };
}
