/**
 * QuickDeployService
 * CRUD operations for quick deployment templates
 */

const MAX_QUICK_DEPLOYMENTS = 5;

/**
 * Generate a unique ID for a quick deployment
 * @returns {string} Unique ID
 */
const generateId = () => {
  return `qd_${crypto.randomUUID()}`;
};

/**
 * QuickDeployService class
 * Manages quick deployment CRUD operations through GameStateManager
 */
class QuickDeployService {
  constructor(gameStateManager) {
    this.gameStateManager = gameStateManager;
  }

  /**
   * Get all saved quick deployments
   * @returns {Array} Array of quick deployment objects
   */
  getAll() {
    const state = this.gameStateManager.getState();
    return state.quickDeployments || [];
  }

  /**
   * Get a specific quick deployment by ID
   * @param {string} id - Quick deployment ID
   * @returns {Object|null} Quick deployment or null
   */
  getById(id) {
    const deployments = this.getAll();
    return deployments.find(qd => qd.id === id) || null;
  }

  /**
   * Create a new quick deployment
   * @param {string} name - Display name
   * @param {Array} droneRoster - Array of 5 drone names
   * @param {Array} placements - Array of { droneName, lane }
   * @returns {Object} Created quick deployment
   * @throws {Error} If max deployments reached or invalid data
   */
  create(name, droneRoster, placements) {
    const existing = this.getAll();

    if (existing.length >= MAX_QUICK_DEPLOYMENTS) {
      throw new Error(`Maximum ${MAX_QUICK_DEPLOYMENTS} quick deployments allowed`);
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('Quick deployment name is required');
    }

    if (!Array.isArray(droneRoster) || droneRoster.length !== 5) {
      throw new Error('Drone roster must contain exactly 5 drones');
    }

    // Check for duplicate drone types in roster
    const uniqueDrones = new Set(droneRoster);
    if (uniqueDrones.size !== 5) {
      throw new Error('Drone roster must contain 5 unique drone types');
    }

    if (!Array.isArray(placements)) {
      throw new Error('Placements must be an array');
    }

    // Validate placements reference roster drones
    for (const placement of placements) {
      if (!droneRoster.includes(placement.droneName)) {
        throw new Error(`Placement references drone not in roster: ${placement.droneName}`);
      }
      if (typeof placement.lane !== 'number' || placement.lane < 0 || placement.lane > 2) {
        throw new Error('Placement lane must be 0, 1, or 2');
      }
    }

    const newDeployment = {
      id: generateId(),
      name: name.trim(),
      createdAt: Date.now(),
      version: 2,
      droneRoster: [...droneRoster],
      placements: placements.map(p => ({ ...p })),
      deploymentOrder: placements.map((_, i) => i)
    };

    this.gameStateManager.setState({
      quickDeployments: [...existing, newDeployment]
    });

    return newDeployment;
  }

  /**
   * Update an existing quick deployment
   * @param {string} id - Quick deployment ID
   * @param {Object} changes - Fields to update { name?, droneRoster?, placements? }
   * @returns {Object} Updated quick deployment
   * @throws {Error} If not found or invalid data
   */
  update(id, changes) {
    const existing = this.getAll();
    const index = existing.findIndex(qd => qd.id === id);

    if (index === -1) {
      throw new Error('Quick deployment not found');
    }

    const current = existing[index];
    const updated = { ...current };

    // Update name if provided
    if (changes.name !== undefined) {
      if (typeof changes.name !== 'string' || changes.name.trim().length === 0) {
        throw new Error('Quick deployment name is required');
      }
      updated.name = changes.name.trim();
    }

    // Update drone roster if provided
    if (changes.droneRoster !== undefined) {
      if (!Array.isArray(changes.droneRoster) || changes.droneRoster.length !== 5) {
        throw new Error('Drone roster must contain exactly 5 drones');
      }
      const uniqueDrones = new Set(changes.droneRoster);
      if (uniqueDrones.size !== 5) {
        throw new Error('Drone roster must contain 5 unique drone types');
      }
      updated.droneRoster = [...changes.droneRoster];

      // If roster changes, filter out placements that reference removed drones
      if (changes.placements === undefined) {
        updated.placements = current.placements.filter(
          p => updated.droneRoster.includes(p.droneName)
        );
      }
    }

    // Update placements if provided
    if (changes.placements !== undefined) {
      if (!Array.isArray(changes.placements)) {
        throw new Error('Placements must be an array');
      }

      const roster = updated.droneRoster;
      for (const placement of changes.placements) {
        if (!roster.includes(placement.droneName)) {
          throw new Error(`Placement references drone not in roster: ${placement.droneName}`);
        }
        if (typeof placement.lane !== 'number' || placement.lane < 0 || placement.lane > 2) {
          throw new Error('Placement lane must be 0, 1, or 2');
        }
      }

      updated.placements = changes.placements.map(p => ({ ...p }));

      // Rebuild deploymentOrder for new placements if not explicitly provided
      if (changes.deploymentOrder === undefined) {
        updated.deploymentOrder = changes.placements.map((_, i) => i);
      }
    }

    // Update deploymentOrder if explicitly provided
    if (changes.deploymentOrder !== undefined) {
      updated.deploymentOrder = [...changes.deploymentOrder];
    }

    const newList = [...existing];
    newList[index] = updated;

    this.gameStateManager.setState({ quickDeployments: newList });

    return updated;
  }

  /**
   * Delete a quick deployment
   * @param {string} id - Quick deployment ID
   * @throws {Error} If not found
   */
  delete(id) {
    const existing = this.getAll();
    const index = existing.findIndex(qd => qd.id === id);

    if (index === -1) {
      throw new Error('Quick deployment not found');
    }

    this.gameStateManager.setState({
      quickDeployments: existing.filter(qd => qd.id !== id)
    });
  }

  /**
   * Check if maximum deployments have been reached
   * @returns {boolean} True if at max capacity
   */
  isAtMaxCapacity() {
    return this.getAll().length >= MAX_QUICK_DEPLOYMENTS;
  }

  /**
   * Get remaining capacity
   * @returns {number} Number of deployments that can still be created
   */
  getRemainingCapacity() {
    return Math.max(0, MAX_QUICK_DEPLOYMENTS - this.getAll().length);
  }

  /**
   * Reorder the deployment order for a quick deployment
   * @param {string} id - Quick deployment ID
   * @param {Array<number>} newOrder - Array of placement indices in desired order
   * @returns {Object} Updated quick deployment
   * @throws {Error} If not found, invalid indices, or wrong length
   */
  reorderDeployments(id, newOrder) {
    const existing = this.getAll();
    const index = existing.findIndex(qd => qd.id === id);

    if (index === -1) {
      throw new Error('Quick deployment not found');
    }

    const current = existing[index];
    const placementsLength = current.placements.length;

    // Validate newOrder length matches placements
    if (newOrder.length !== placementsLength) {
      throw new Error('Deployment order must have same length as placements');
    }

    // Check for duplicates
    const uniqueIndices = new Set(newOrder);
    if (uniqueIndices.size !== newOrder.length) {
      throw new Error('Duplicate placement index');
    }

    // Validate all indices are valid
    for (const idx of newOrder) {
      if (idx < 0 || idx >= placementsLength) {
        throw new Error('Invalid placement index');
      }
    }

    const updated = {
      ...current,
      deploymentOrder: [...newOrder]
    };

    const newList = [...existing];
    newList[index] = updated;

    this.gameStateManager.setState({ quickDeployments: newList });

    return updated;
  }
}

export default QuickDeployService;
export { MAX_QUICK_DEPLOYMENTS };
