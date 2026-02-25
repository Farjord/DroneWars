/**
 * glossaryAnalyzer.js
 *
 * Dynamic analysis utility for extracting game mechanics documentation
 * from card and drone data files. Provides structured information about
 * effect types, targeting patterns, and their parameters.
 */

import fullCardCollection from '../../data/cardData.js';
import fullDroneCollection from '../../data/droneData.js';
import {
  effectDescriptions,
  targetingDescriptions,
  conditionDescriptions,
  keywordDescriptions,
  scopeDescriptions,
  comparisonDescriptions,
  affinityDescriptions,
  locationDescriptions
} from '../../data/descriptions/glossaryDescriptions.js';
import {
  effectPatterns,
  targetingPatterns,
  filterPatterns,
  conditionPatterns,
  keywordPatterns,
  scopePatterns,
  specialProperties
} from '../../data/descriptions/codePatternDescriptions.js';

/**
 * Analyzes all effects from cards and drone abilities
 * @returns {Object} Structured effect type documentation
 */
export const analyzeEffectTypes = () => {
  const effectMap = new Map();

  // Helper to process an effect object
  const processEffect = (effect, source) => {
    if (!effect || !effect.type) return;

    const effectType = effect.type;

    if (!effectMap.has(effectType)) {
      effectMap.set(effectType, {
        type: effectType,
        parameters: new Set(),
        examples: [],
        usedIn: new Set(),
        targetingTypes: new Set()
      });
    }

    const effectData = effectMap.get(effectType);

    // Track parameters
    Object.keys(effect).forEach(key => {
      if (key !== 'type') {
        effectData.parameters.add(key);
      }
    });

    // Track where it's used
    effectData.usedIn.add(source.type);

    // Store example
    if (effectData.examples.length < 3) {
      effectData.examples.push({
        name: source.name,
        effect: JSON.parse(JSON.stringify(effect)),
        description: source.description
      });
    }
  };

  // Analyze cards
  fullCardCollection.forEach(card => {
    if (card.effects && card.effects.length > 0) {
      card.effects.forEach(effect => {
        processEffect(effect, { type: 'Card', name: card.name, description: card.description });

        // Track targeting relationship from each effect's targeting
        if (effect.targeting) {
          const effectData = effectMap.get(effect.type);
          if (effectData) {
            effectData.targetingTypes.add(effect.targeting.type);
          }
        }

        // Handle repeating effects
        if (effect.type === 'REPEATING_EFFECT' && effect.effects) {
          effect.effects.forEach(subEffect => {
            processEffect(subEffect, { type: 'Card (Repeating)', name: card.name, description: card.description });
          });
        }
      });
    }
  });

  // Analyze drone abilities
  fullDroneCollection.forEach(drone => {
    if (drone.abilities && Array.isArray(drone.abilities)) {
      drone.abilities.forEach(ability => {
        if (ability.effect) {
          processEffect(ability.effect, {
            type: 'Drone Ability',
            name: `${drone.name} - ${ability.name}`,
            description: ability.description
          });

          // Handle sub-effects
          if (ability.effect.subEffect) {
            processEffect(ability.effect.subEffect, {
              type: 'Drone Ability (Sub-effect)',
              name: `${drone.name} - ${ability.name}`,
              description: ability.description
            });
          }
        }

        // Handle multiple effects in triggered abilities
        if (ability.effects && Array.isArray(ability.effects)) {
          ability.effects.forEach(eff => {
            processEffect(eff, {
              type: 'Drone Ability (Triggered)',
              name: `${drone.name} - ${ability.name}`,
              description: ability.description
            });
          });
        }
      });
    }
  });

  // Convert Sets to Arrays for JSON serialization
  const result = {};
  effectMap.forEach((data, key) => {
    result[key] = {
      type: data.type,
      parameters: Array.from(data.parameters),
      examples: data.examples,
      usedIn: Array.from(data.usedIn),
      targetingTypes: Array.from(data.targetingTypes)
    };
  });

  return result;
};

/**
 * Analyzes all targeting patterns from cards and drone abilities
 * @returns {Object} Structured targeting documentation
 */
export const analyzeTargetingTypes = () => {
  const targetingMap = new Map();

  // Helper to process targeting object
  const processTargeting = (targeting, source) => {
    if (!targeting || !targeting.type) return;

    const targetType = targeting.type;

    if (!targetingMap.has(targetType)) {
      targetingMap.set(targetType, {
        type: targetType,
        affinityOptions: new Set(),
        locationOptions: new Set(),
        customFilters: new Set(),
        examples: [],
        usedByEffects: new Set()
      });
    }

    const targetData = targetingMap.get(targetType);

    // Track affinity options
    if (targeting.affinity) {
      targetData.affinityOptions.add(targeting.affinity);
    }

    // Track location options
    if (targeting.location) {
      targetData.locationOptions.add(targeting.location);
    }

    // Track restriction filters
    const restrictions = targeting.restrictions;
    if (restrictions && Array.isArray(restrictions)) {
      restrictions.forEach(filter => targetData.customFilters.add(filter));
    }

    // Store example
    if (targetData.examples.length < 3) {
      targetData.examples.push({
        name: source.name,
        targeting: JSON.parse(JSON.stringify(targeting)),
        description: source.description
      });
    }

    // Track which effect types use this targeting
    if (source.effectType) {
      targetData.usedByEffects.add(source.effectType);
    }
  };

  // Analyze cards
  fullCardCollection.forEach(card => {
    if (card.effects && card.effects.length > 0) {
      card.effects.forEach(effect => {
        if (effect.targeting) {
          processTargeting(effect.targeting, {
            name: card.name,
            description: card.description,
            effectType: effect.type
          });
        }
      });
    }
  });

  // Analyze drone abilities
  fullDroneCollection.forEach(drone => {
    if (drone.abilities && Array.isArray(drone.abilities)) {
      drone.abilities.forEach(ability => {
        if (ability.targeting) {
          processTargeting(ability.targeting, {
            name: `${drone.name} - ${ability.name}`,
            description: ability.description,
            effectType: ability.effect?.type
          });
        }
      });
    }
  });

  // Convert Sets to Arrays
  const result = {};
  targetingMap.forEach((data, key) => {
    result[key] = {
      type: data.type,
      affinityOptions: Array.from(data.affinityOptions),
      locationOptions: Array.from(data.locationOptions),
      customFilters: Array.from(data.customFilters),
      examples: data.examples,
      usedByEffects: Array.from(data.usedByEffects)
    };
  });

  return result;
};

/**
 * Analyzes stat modification patterns
 * @returns {Object} Documentation of modifiable stats
 */
export const analyzeModifiableStats = () => {
  const stats = {
    droneStats: new Set(),
    shipStats: new Set(),
    modificationTypes: new Set(),
    valueRanges: {}
  };

  // Analyze MODIFY_STAT and MODIFY_DRONE_BASE effects
  fullCardCollection.forEach(card => {
    if (!card.effects) return;
    card.effects.forEach(effect => {
      if (effect.type === 'MODIFY_STAT' || effect.type === 'MODIFY_DRONE_BASE') {
        if (effect.mod?.stat) {
          const stat = effect.mod.stat;
          stats.droneStats.add(stat);

          if (effect.mod.type) {
            stats.modificationTypes.add(effect.mod.type);
          }

          // Track value ranges
          if (effect.mod.value !== undefined) {
            if (!stats.valueRanges[stat]) {
              stats.valueRanges[stat] = { min: effect.mod.value, max: effect.mod.value, values: [] };
            }
            stats.valueRanges[stat].min = Math.min(stats.valueRanges[stat].min, effect.mod.value);
            stats.valueRanges[stat].max = Math.max(stats.valueRanges[stat].max, effect.mod.value);
            stats.valueRanges[stat].values.push(effect.mod.value);
          }
        }
      }
    });
  });

  // Analyze drone abilities
  fullDroneCollection.forEach(drone => {
    if (drone.abilities && Array.isArray(drone.abilities)) {
      drone.abilities.forEach(ability => {
        if (ability.effect?.mod?.stat) {
          stats.droneStats.add(ability.effect.mod.stat);
        }
        if (ability.effect?.type === 'CONDITIONAL_MODIFY_STAT' && ability.effect.mod?.stat) {
          stats.droneStats.add(ability.effect.mod.stat);
        }
        if (ability.effect?.type === 'CONDITIONAL_MODIFY_STAT_SCALING' && ability.effect.mod?.stat) {
          stats.droneStats.add(ability.effect.mod.stat);
        }
        if (ability.effect?.type === 'FLANKING_BONUS' && ability.effect.mods) {
          ability.effect.mods.forEach(mod => {
            if (mod.stat) {
              stats.droneStats.add(mod.stat);
            }
          });
        }
      });
    }
  });

  return {
    droneStats: Array.from(stats.droneStats).sort(),
    shipStats: Array.from(stats.shipStats).sort(),
    modificationTypes: Array.from(stats.modificationTypes).sort(),
    valueRanges: stats.valueRanges
  };
};

/**
 * Analyzes keyword abilities
 * @returns {Object} Documentation of keywords and their sources
 */
export const analyzeKeywords = () => {
  const keywords = new Map();

  // Helper to process keyword grants
  const processKeyword = (keyword, source) => {
    if (!keywords.has(keyword)) {
      keywords.set(keyword, {
        keyword: keyword,
        grantedBy: [],
        description: null
      });
    }

    const keywordData = keywords.get(keyword);
    keywordData.grantedBy.push(source);
  };

  // Analyze drone abilities for GRANT_KEYWORD effects
  fullDroneCollection.forEach(drone => {
    if (drone.abilities && Array.isArray(drone.abilities)) {
      drone.abilities.forEach(ability => {
        if (ability.effect?.type === 'GRANT_KEYWORD' && ability.effect.keyword) {
          processKeyword(ability.effect.keyword, {
            type: 'Drone Ability',
            name: `${drone.name} - ${ability.name}`,
            description: ability.description
          });
        }
      });
    }
  });

  // Analyze cards for GRANT_KEYWORD effects
  fullCardCollection.forEach(card => {
    if (!card.effects) return;
    card.effects.forEach(effect => {
      if (effect.type === 'MODIFY_DRONE_BASE' && effect.mod?.abilityToAdd) {
        const ability = effect.mod.abilityToAdd;
        if (ability.effect?.type === 'GRANT_KEYWORD' && ability.effect.keyword) {
          processKeyword(ability.effect.keyword, {
            type: 'Card (Upgrade)',
            name: card.name,
            description: card.description
          });
        }
      }
    });
  });

  // Convert to object
  const result = {};
  keywords.forEach((data, key) => {
    result[key] = data;
  });

  return result;
};

/**
 * Analyzes condition types used in conditional effects
 * @returns {Object} Documentation of condition patterns
 */
export const analyzeConditions = () => {
  const conditions = new Map();

  // Analyze drone abilities
  fullDroneCollection.forEach(drone => {
    if (drone.abilities && Array.isArray(drone.abilities)) {
      drone.abilities.forEach(ability => {
        // Check for conditional modify stat
        if (ability.effect?.condition) {
          const condType = ability.effect.condition.type;

          if (!conditions.has(condType)) {
            conditions.set(condType, {
              type: condType,
              parameters: new Set(),
              examples: []
            });
          }

          const condData = conditions.get(condType);

          // Track parameters
          Object.keys(ability.effect.condition).forEach(key => {
            if (key !== 'type') {
              condData.parameters.add(key);
            }
          });

          // Store example
          if (condData.examples.length < 2) {
            condData.examples.push({
              name: `${drone.name} - ${ability.name}`,
              condition: JSON.parse(JSON.stringify(ability.effect.condition)),
              description: ability.description
            });
          }
        }
      });
    }
  });

  // Analyze cards
  fullCardCollection.forEach(card => {
    if (!card.effects) return;
    card.effects.forEach(effect => {
      if (effect.condition) {
        const condType = effect.condition;

        if (!conditions.has(condType)) {
          conditions.set(condType, {
            type: condType,
            parameters: new Set(),
            examples: []
          });
        }

        const condData = conditions.get(condType);

        if (condData.examples.length < 2) {
          condData.examples.push({
            name: card.name,
            condition: condType,
            description: card.description
          });
        }
      }
    });
  });

  // Convert Sets to Arrays
  const result = {};
  conditions.forEach((data, key) => {
    result[key] = {
      type: data.type,
      parameters: Array.from(data.parameters),
      examples: data.examples
    };
  });

  return result;
};

/**
 * Analyzes filter patterns used in scoped effects
 * @returns {Object} Documentation of filter capabilities
 */
export const analyzeFilters = () => {
  const filters = {
    stats: new Set(),
    comparisons: new Set(),
    values: [],
    examples: []
  };

  // Analyze cards with affectedFilter targeting
  fullCardCollection.forEach(card => {
    const targeting = card.effects?.[0]?.targeting;
    const affectedFilter = targeting?.affectedFilter;
    if (affectedFilter && affectedFilter.length > 0) {
      const filter = affectedFilter[0];

      if (filter.stat) {
        filters.stats.add(filter.stat);
      }

      if (filter.comparison) {
        filters.comparisons.add(filter.comparison);
      }

      if (filter.value !== undefined) {
        filters.values.push(filter.value);
      }

      if (filters.examples.length < 5) {
        filters.examples.push({
          name: card.name,
          filter: JSON.parse(JSON.stringify(filter)),
          description: card.description
        });
      }
    }
  });

  return {
    stats: Array.from(filters.stats).sort(),
    comparisons: Array.from(filters.comparisons).sort(),
    valueRange: filters.values.length > 0 ? {
      min: Math.min(...filters.values),
      max: Math.max(...filters.values)
    } : null,
    examples: filters.examples
  };
};

/**
 * Analyzes scope patterns for area effects
 * @returns {Object} Documentation of effect scopes
 */
export const analyzeScopes = () => {
  const scopes = new Map();

  fullCardCollection.forEach(card => {
    if (!card.effects) return;
    card.effects.forEach(effect => {
      if (effect.scope) {
        const scope = effect.scope;

        if (!scopes.has(scope)) {
          scopes.set(scope, {
            scope: scope,
            effectTypes: new Set(),
            examples: []
          });
        }

        const scopeData = scopes.get(scope);
        scopeData.effectTypes.add(effect.type);

        if (scopeData.examples.length < 3) {
          scopeData.examples.push({
            name: card.name,
            effect: effect.type,
            description: card.description
          });
        }
      }
    });
  });

  // Convert to object
  const result = {};
  scopes.forEach((data, key) => {
    result[key] = {
      scope: data.scope,
      effectTypes: Array.from(data.effectTypes),
      examples: data.examples
    };
  });

  return result;
};

/**
 * Enriches effect type data with descriptions and technical patterns
 * @param {Object} analyzedEffects - Effect types from analyzeEffectTypes()
 * @returns {Object} Enriched effect type data
 */
const enrichEffectTypes = (analyzedEffects) => {
  const enriched = {};
  Object.entries(analyzedEffects).forEach(([type, data]) => {
    enriched[type] = {
      ...data,
      description: effectDescriptions[type] || null,
      hasDescription: !!effectDescriptions[type],
      technicalDetails: effectPatterns[type] || null,
      hasTechnicalDetails: !!effectPatterns[type]
    };
  });
  return enriched;
};

/**
 * Enriches targeting type data with descriptions and technical patterns
 * @param {Object} analyzedTargeting - Targeting types from analyzeTargetingTypes()
 * @returns {Object} Enriched targeting type data
 */
const enrichTargetingTypes = (analyzedTargeting) => {
  const enriched = {};
  Object.entries(analyzedTargeting).forEach(([type, data]) => {
    enriched[type] = {
      ...data,
      description: targetingDescriptions[type] || null,
      hasDescription: !!targetingDescriptions[type],
      technicalDetails: targetingPatterns[type] || null,
      hasTechnicalDetails: !!targetingPatterns[type]
    };
  });
  return enriched;
};

/**
 * Enriches condition data with descriptions and technical patterns
 * @param {Object} analyzedConditions - Conditions from analyzeConditions()
 * @returns {Object} Enriched condition data
 */
const enrichConditions = (analyzedConditions) => {
  const enriched = {};
  Object.entries(analyzedConditions).forEach(([type, data]) => {
    enriched[type] = {
      ...data,
      description: conditionDescriptions[type] || null,
      hasDescription: !!conditionDescriptions[type],
      technicalDetails: conditionPatterns[type] || null,
      hasTechnicalDetails: !!conditionPatterns[type]
    };
  });
  return enriched;
};

/**
 * Enriches keyword data with descriptions and technical patterns
 * @param {Object} analyzedKeywords - Keywords from analyzeKeywords()
 * @returns {Object} Enriched keyword data
 */
const enrichKeywords = (analyzedKeywords) => {
  const enriched = {};
  Object.entries(analyzedKeywords).forEach(([keyword, data]) => {
    enriched[keyword] = {
      ...data,
      description: keywordDescriptions[keyword] || null,
      hasDescription: !!keywordDescriptions[keyword],
      technicalDetails: keywordPatterns.notes?.[keyword] || null
    };
  });
  return enriched;
};

/**
 * Enriches scope data with descriptions
 * @param {Object} analyzedScopes - Scopes from analyzeScopes()
 * @returns {Object} Enriched scope data
 */
const enrichScopes = (analyzedScopes) => {
  const enriched = {};
  Object.entries(analyzedScopes).forEach(([scope, data]) => {
    enriched[scope] = {
      ...data,
      description: scopeDescriptions[scope] || null,
      hasDescription: !!scopeDescriptions[scope],
      technicalDetails: scopePatterns.notes?.[scope] || null
    };
  });
  return enriched;
};

/**
 * Tracks items missing descriptions across all categories
 * @param {Object} glossary - Complete glossary data
 * @returns {Object} Missing descriptions by category
 */
const trackMissingDescriptions = (glossary) => {
  const missing = {
    effectTypes: [],
    targetingTypes: [],
    conditions: [],
    keywords: [],
    scopes: []
  };

  // Check effect types
  Object.entries(glossary.effectTypes).forEach(([type, data]) => {
    if (!data.hasDescription) {
      missing.effectTypes.push({
        type: type,
        usedIn: data.usedIn,
        exampleCount: data.examples.length
      });
    }
  });

  // Check targeting types
  Object.entries(glossary.targetingTypes).forEach(([type, data]) => {
    if (!data.hasDescription) {
      missing.targetingTypes.push({
        type: type,
        usedByEffects: data.usedByEffects,
        exampleCount: data.examples.length
      });
    }
  });

  // Check conditions
  Object.entries(glossary.conditions).forEach(([type, data]) => {
    if (!data.hasDescription) {
      missing.conditions.push({
        type: type,
        exampleCount: data.examples.length
      });
    }
  });

  // Check keywords
  Object.entries(glossary.keywords).forEach(([keyword, data]) => {
    if (!data.hasDescription) {
      missing.keywords.push({
        keyword: keyword,
        grantedByCount: data.grantedBy.length
      });
    }
  });

  // Check scopes
  Object.entries(glossary.scopes).forEach(([scope, data]) => {
    if (!data.hasDescription) {
      missing.scopes.push({
        scope: scope,
        effectTypeCount: data.effectTypes.length
      });
    }
  });

  return missing;
};

/**
 * Adds cross-references between related glossary sections
 * @param {Object} glossary - Complete glossary data
 * @returns {Object} Glossary with cross-references added
 */
const addCrossReferences = (glossary) => {
  // Add targeting -> effect cross-references
  Object.values(glossary.targetingTypes).forEach(targeting => {
    targeting.relatedEffects = targeting.usedByEffects.map(effectType => ({
      type: effectType,
      description: glossary.effectTypes[effectType]?.description || null
    }));
  });

  // Add effect -> targeting cross-references
  Object.values(glossary.effectTypes).forEach(effect => {
    effect.relatedTargeting = effect.targetingTypes.map(targetType => ({
      type: targetType,
      description: glossary.targetingTypes[targetType]?.description || null
    }));
  });

  // Add condition cross-references to effects that use them
  Object.entries(glossary.effectTypes).forEach(([effectType, effectData]) => {
    if (effectData.technicalDetails?.validParameters?.condition) {
      const conditionTypes = effectData.technicalDetails.validParameters.condition.type;
      if (conditionTypes) {
        effectData.relatedConditions = (Array.isArray(conditionTypes) ? conditionTypes : [conditionTypes]).map(condType => ({
          type: condType,
          description: glossary.conditions[condType]?.description || null
        }));
      }
    }
  });

  // Add keyword cross-references
  Object.entries(glossary.keywords).forEach(([keyword, keywordData]) => {
    keywordData.relatedEffects = keywordData.grantedBy.map(source => ({
      sourceType: source.type,
      sourceName: source.name
    }));
  });

  return glossary;
};

/**
 * Generates a complete glossary by combining all analyses
 * @returns {Object} Complete game mechanics glossary
 */
export const generateCompleteGlossary = () => {
  // Analyze raw data
  const rawEffectTypes = analyzeEffectTypes();
  const rawTargetingTypes = analyzeTargetingTypes();
  const rawConditions = analyzeConditions();
  const rawKeywords = analyzeKeywords();
  const rawScopes = analyzeScopes();

  // Enrich with descriptions and technical details
  const enrichedEffects = enrichEffectTypes(rawEffectTypes);
  const enrichedTargeting = enrichTargetingTypes(rawTargetingTypes);
  const enrichedConditions = enrichConditions(rawConditions);
  const enrichedKeywords = enrichKeywords(rawKeywords);
  const enrichedScopes = enrichScopes(rawScopes);

  // Build initial glossary
  let glossary = {
    effectTypes: enrichedEffects,
    targetingTypes: enrichedTargeting,
    modifiableStats: analyzeModifiableStats(),
    keywords: enrichedKeywords,
    conditions: enrichedConditions,
    filters: analyzeFilters(),
    scopes: enrichedScopes,
    metadata: {
      totalCards: fullCardCollection.length,
      totalDrones: fullDroneCollection.length,
      generatedAt: new Date().toISOString()
    }
  };

  // Add cross-references
  glossary = addCrossReferences(glossary);

  // Track missing descriptions
  glossary.missingDescriptions = trackMissingDescriptions(glossary);

  // Add technical pattern references
  glossary.technicalPatterns = {
    filterPatterns,
    scopePatterns,
    specialProperties,
    comparisonOperators: comparisonDescriptions,
    affinityOptions: affinityDescriptions,
    locationOptions: locationDescriptions
  };

  return glossary;
};

/**
 * Generates a summary of available game mechanics
 * @returns {Object} High-level summary
 */
export const generateMechanicsSummary = () => {
  const glossary = generateCompleteGlossary();

  return {
    totalEffectTypes: Object.keys(glossary.effectTypes).length,
    totalTargetingTypes: Object.keys(glossary.targetingTypes).length,
    totalKeywords: Object.keys(glossary.keywords).length,
    totalConditions: Object.keys(glossary.conditions).length,
    modifiableStats: glossary.modifiableStats.droneStats.length,
    effectTypesList: Object.keys(glossary.effectTypes).sort(),
    targetingTypesList: Object.keys(glossary.targetingTypes).sort(),
    keywordsList: Object.keys(glossary.keywords).sort()
  };
};
