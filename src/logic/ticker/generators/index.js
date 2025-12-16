/**
 * Generator Index
 * Exports all message generators for the ticker system
 *
 * To add a new generator:
 * 1. Create a new file (e.g., myGenerator.js) with a generate(maps) function
 * 2. Import and add it to the generators array below
 */

import * as threatGenerator from './threatGenerator';
import * as resourceGenerator from './resourceGenerator';
import * as priorityGenerator from './priorityGenerator';
import * as rumorGenerator from './rumorGenerator';
import * as comparativeGenerator from './comparativeGenerator';
import * as bossGenerator from './bossGenerator';

// All registered generators
const generators = [
  threatGenerator,
  resourceGenerator,
  priorityGenerator,
  rumorGenerator,
  comparativeGenerator,
  bossGenerator
];

/**
 * Get all registered generators
 * @returns {Array} Array of generator objects with generate() methods
 */
export function getAllGenerators() {
  return generators;
}

/**
 * Register a new generator at runtime
 * @param {Object} generator - Generator object with generate(maps) method
 */
export function registerGenerator(generator) {
  if (generator && typeof generator.generate === 'function') {
    generators.push(generator);
  }
}

export {
  threatGenerator,
  resourceGenerator,
  priorityGenerator,
  rumorGenerator,
  comparativeGenerator,
  bossGenerator
};
