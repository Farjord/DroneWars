/**
 * Ship Configuration Tab
 * Displays slot-based damage status and repair controls for extraction deck builder
 * Shows section slots with HP bars and drone slots with damage indicators
 */

import React from 'react';
import { AlertTriangle, Wrench, Heart, ShieldAlert } from 'lucide-react';
import { ECONOMY } from '../../data/economyData.js';
import { shipComponentCollection } from '../../data/shipSectionData.js';
import fullDroneCollection from '../../data/droneData.js';
import {
  calculateSectionHull,
  getDroneEffectiveLimit,
  calculateDroneSlotRepairCost,
  calculateSectionRepairCost,
  validateShipSlot
} from '../../logic/combat/slotDamageUtils.js';

/**
 * Hull bar component for displaying section health
 */
const HullBar = ({ current, max }) => {
  const percentage = max > 0 ? (current / max) * 100 : 0;
  const isDestroyed = current <= 0;
  const isDamaged = current < max;

  return (
    <div className="w-full h-3 bg-gray-800 rounded overflow-hidden">
      <div
        className={`h-full transition-all duration-300 ${
          isDestroyed ? 'bg-red-600' :
          isDamaged ? 'bg-yellow-500' :
          'bg-green-500'
        }`}
        style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }}
      />
    </div>
  );
};

/**
 * Section slot display with repair controls
 */
const SectionSlotDisplay = ({ lane, sectionSlot, shipSlot, onRepair, credits, readOnly }) => {
  if (!sectionSlot?.componentId) {
    return (
      <div className="dw-config-slot dw-config-slot--empty">
        <div className="text-center text-gray-500 py-4">
          <span className="uppercase text-xs">Lane {lane.toUpperCase()}</span>
          <div className="text-sm mt-1">Empty</div>
        </div>
      </div>
    );
  }

  const component = shipComponentCollection.find(c => c.id === sectionSlot.componentId);
  const hull = calculateSectionHull(shipSlot, lane);
  const damageDealt = sectionSlot.damageDealt || 0;
  const repairCost = calculateSectionRepairCost(damageDealt);
  const canAffordRepair = credits >= repairCost;
  const isDestroyed = hull.current <= 0;

  return (
    <div className={`dw-config-slot ${isDestroyed ? 'dw-config-slot--destroyed' : damageDealt > 0 ? 'dw-config-slot--damaged' : ''}`}>
      {/* Lane Header */}
      <div className="flex justify-between items-center mb-2">
        <span className="uppercase text-xs text-gray-400">Lane {lane.toUpperCase()}</span>
        {isDestroyed && (
          <span className="text-xs text-red-400 flex items-center gap-1">
            <ShieldAlert size={12} />
            Destroyed
          </span>
        )}
      </div>

      {/* Component Name */}
      <div className="font-medium text-sm mb-2 truncate" title={component?.name}>
        {component?.name || 'Unknown'}
      </div>

      {/* Hull Bar */}
      <div className="mb-2">
        <HullBar current={hull.current} max={hull.max} />
        <div className="flex justify-between text-xs mt-1">
          <span className={hull.current <= 0 ? 'text-red-400' : 'text-gray-400'}>
            {hull.current}/{hull.max} HP
          </span>
          {damageDealt > 0 && (
            <span className="text-yellow-400">-{damageDealt} dmg</span>
          )}
        </div>
      </div>

      {/* Repair Button */}
      {damageDealt > 0 && !readOnly && (
        <button
          onClick={() => onRepair(lane)}
          disabled={!canAffordRepair}
          className={`w-full mt-2 py-1.5 px-3 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
            canAffordRepair
              ? 'bg-emerald-700 hover:bg-emerald-600 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          <Wrench size={12} />
          Repair ({repairCost} cr)
        </button>
      )}
    </div>
  );
};

/**
 * Drone slot display with damage indicator
 * Supports both new format (assignedDrone, slotDamaged) and legacy format (droneName, isDamaged)
 */
const DroneSlotDisplay = ({ slotIndex, droneSlot, shipSlot, onRepair, credits, readOnly }) => {
  // Support both new and legacy field names
  const droneName = droneSlot?.assignedDrone ?? droneSlot?.droneName ?? null;
  const isDamaged = droneSlot?.slotDamaged ?? droneSlot?.isDamaged ?? false;

  if (!droneName) {
    return (
      <div className="dw-config-drone-slot dw-config-drone-slot--empty">
        <div className="text-center text-gray-500 py-2">
          <span className="text-xs">Slot {slotIndex + 1}</span>
          <div className="text-xs mt-0.5">Empty</div>
        </div>
      </div>
    );
  }

  const drone = fullDroneCollection.find(d => d.name === droneName);
  const effectiveLimit = getDroneEffectiveLimit(shipSlot, slotIndex);
  const baseLimit = drone?.limit || 1;
  const repairCost = calculateDroneSlotRepairCost();
  const canAffordRepair = credits >= repairCost;

  return (
    <div className={`dw-config-drone-slot ${isDamaged ? 'dw-config-drone-slot--damaged' : ''}`}>
      {/* Slot Number */}
      <div className="text-xs text-gray-500 mb-1">Slot {slotIndex + 1}</div>

      {/* Drone Name */}
      <div className="font-medium text-xs truncate" title={droneName}>
        {droneName}
      </div>

      {/* Limit Display */}
      <div className={`text-xs mt-1 ${isDamaged ? 'text-yellow-400' : 'text-gray-400'}`}>
        Limit: {effectiveLimit}
        {isDamaged && baseLimit > 1 && (
          <span className="text-red-400 ml-1">(-1)</span>
        )}
      </div>

      {/* Damage Indicator */}
      {isDamaged && (
        <div className="flex items-center gap-1 mt-1">
          <AlertTriangle size={10} className="text-yellow-400" />
          <span className="text-xs text-yellow-400">Damaged</span>
        </div>
      )}

      {/* Repair Button */}
      {isDamaged && !readOnly && (
        <button
          onClick={() => onRepair(slotIndex)}
          disabled={!canAffordRepair}
          className={`w-full mt-2 py-1 px-2 rounded text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
            canAffordRepair
              ? 'bg-emerald-700 hover:bg-emerald-600 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          <Wrench size={10} />
          {repairCost} cr
        </button>
      )}
    </div>
  );
};

/**
 * Main Ship Configuration Tab component
 */
const ShipConfigurationTab = ({
  shipSlot,
  droneSlots = null,  // Current editing state (preferred) or falls back to shipSlot.droneSlots
  credits = 0,
  onRepairDroneSlot,
  onRepairSectionSlot,
  readOnly = false
}) => {
  if (!shipSlot) {
    return (
      <div className="dw-empty-state">
        No ship slot selected.
      </div>
    );
  }

  // Use passed droneSlots (current editing state) if available, otherwise fall back to saved state
  const activeDroneSlots = droneSlots || shipSlot.droneSlots || [];

  // Create a modified shipSlot for validation that uses the current droneSlots
  const shipSlotForValidation = {
    ...shipSlot,
    droneSlots: activeDroneSlots
  };

  const validation = validateShipSlot(shipSlotForValidation);
  const { isValid, isIncomplete, isUndeployable, issues } = validation;

  return (
    <div className="flex flex-col h-full overflow-y-auto dw-modal-scroll pr-2">
      {/* Validation Status Banner */}
      {(isUndeployable || isIncomplete) && (
        <div className={`mb-4 p-3 rounded-lg ${
          isUndeployable ? 'bg-red-900/30 border border-red-700' : 'bg-yellow-900/30 border border-yellow-700'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} className={isUndeployable ? 'text-red-400' : 'text-yellow-400'} />
            <span className={`font-medium ${isUndeployable ? 'text-red-300' : 'text-yellow-300'}`}>
              {isUndeployable ? 'Ship Undeployable' : 'Configuration Incomplete'}
            </span>
          </div>
          <ul className="text-xs text-gray-400 ml-6 list-disc">
            {issues.map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Credits Display */}
      <div className="mb-4 flex items-center justify-between text-sm">
        <span className="text-gray-400">Available Credits:</span>
        <span className="font-medium text-yellow-400">{credits} cr</span>
      </div>

      {/* Ship Sections */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
          <Heart size={14} />
          Ship Sections
        </h4>
        <div className="grid grid-cols-3 gap-2">
          {['l', 'm', 'r'].map(lane => (
            <SectionSlotDisplay
              key={lane}
              lane={lane}
              sectionSlot={shipSlot.sectionSlots?.[lane]}
              shipSlot={shipSlot}
              onRepair={onRepairSectionSlot}
              credits={credits}
              readOnly={readOnly}
            />
          ))}
        </div>
      </div>

      {/* Drone Slots */}
      <div>
        <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
          <AlertTriangle size={14} />
          Drone Slots
        </h4>
        <div className="grid grid-cols-5 gap-1">
          {activeDroneSlots.map((droneSlot, index) => (
            <DroneSlotDisplay
              key={index}
              slotIndex={index}
              droneSlot={droneSlot}
              shipSlot={shipSlotForValidation}
              onRepair={onRepairDroneSlot}
              credits={credits}
              readOnly={readOnly}
            />
          ))}
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 p-3 bg-gray-800/50 rounded-lg text-xs text-gray-400">
        <p className="mb-2">
          <strong className="text-gray-300">Slot-Based Damage:</strong> Damage is tied to slot positions, not items.
          Swapping drones or components doesn't affect damage state.
        </p>
        <p>
          <strong className="text-gray-300">Damaged Drone Slots:</strong> Reduce the drone's deployment limit by 1.
        </p>
      </div>
    </div>
  );
};

export default ShipConfigurationTab;
