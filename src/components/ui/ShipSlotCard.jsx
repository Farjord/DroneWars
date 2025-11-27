import React from 'react';

/**
 * ShipSlotCard Component
 * Displays a ship slot with component health visualization
 *
 * Visual states:
 * - active: Slot has a configured deck ready for deployment
 * - empty: Slot is not configured (no deck)
 * - MIA: Slot's ship was lost during a run
 */
const ShipSlotCard = ({
  shipSlot,
  shipComponentInstances = [],
  onClick
}) => {
  /**
   * Get component instance for a specific component ID
   */
  const getComponentInstance = (componentId) => {
    return shipComponentInstances.find(inst =>
      inst.componentId === componentId && inst.shipSlotId === shipSlot.id
    );
  };

  /**
   * Calculate overall hull percentage for the slot
   * - Slot 0: always 100% (immutable)
   * - Empty slots: 0%
   * - Active slots: average hull % of all components
   */
  const calculateOverallHullPercentage = () => {
    if (shipSlot.id === 0) return 100; // Starter deck never damaged
    if (shipSlot.status === 'empty') return 0;
    if (shipSlot.status === 'mia') return 0;

    const components = shipSlot.shipComponents;
    if (!components) return 100;

    const componentIds = [
      components.left,
      components.middle,
      components.right
    ].filter(id => id); // Filter out undefined/null

    if (componentIds.length === 0) return 100;

    let totalHullPercentage = 0;
    for (const componentId of componentIds) {
      const instance = getComponentInstance(componentId);
      if (instance) {
        const percentage = (instance.currentHull / instance.maxHull) * 100;
        totalHullPercentage += percentage;
      } else {
        // No instance = full hull
        totalHullPercentage += 100;
      }
    }

    return Math.round(totalHullPercentage / componentIds.length);
  };

  /**
   * Get status badge color based on hull percentage
   */
  const getStatusColor = () => {
    if (shipSlot.status === 'mia') return 'bg-red-500';
    if (shipSlot.status === 'empty') return 'bg-gray-500';

    const hullPercentage = calculateOverallHullPercentage();
    if (hullPercentage > 75) return 'bg-green-500';
    if (hullPercentage > 40) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  /**
   * Get status text
   */
  const getStatusText = () => {
    if (shipSlot.status === 'mia') return 'MIA';
    if (shipSlot.status === 'empty') return 'EMPTY';
    if (shipSlot.status === 'active') {
      const hullPercentage = calculateOverallHullPercentage();
      return `${hullPercentage}% HULL`;
    }
    return 'UNKNOWN';
  };

  /**
   * Get drone count for the slot
   */
  const getDroneCount = () => {
    if (!shipSlot.drones) return 0;
    return shipSlot.drones.length;
  };

  /**
   * Render mini component preview (3 components)
   */
  const renderComponentPreview = () => {
    if (shipSlot.status === 'empty' || shipSlot.status === 'mia') {
      return null;
    }

    const components = shipSlot.shipComponents;
    if (!components) return null;

    const lanes = ['left', 'middle', 'right'];

    return (
      <div className="flex gap-1 mt-2">
        {lanes.map(lane => {
          const componentId = components[lane];
          if (!componentId) {
            return <div key={lane} className="w-8 h-8 bg-gray-700 rounded opacity-30" />;
          }

          const instance = getComponentInstance(componentId);
          const hullPercentage = instance
            ? (instance.currentHull / instance.maxHull) * 100
            : 100;

          const hullColor = hullPercentage > 75
            ? 'bg-green-500'
            : hullPercentage > 40
            ? 'bg-yellow-500'
            : 'bg-red-500';

          return (
            <div key={lane} className="relative w-8 h-8 bg-gray-700 rounded overflow-hidden">
              <div
                className={`absolute bottom-0 left-0 right-0 ${hullColor} transition-all duration-300`}
                style={{ height: `${hullPercentage}%` }}
              />
            </div>
          );
        })}
      </div>
    );
  };

  const hullPercentage = calculateOverallHullPercentage();
  const statusColor = getStatusColor();
  const statusText = getStatusText();
  const droneCount = getDroneCount();
  const isDisabled = shipSlot.status === 'mia';
  const isClickable = !isDisabled && onClick;

  return (
    <div
      className={`
        relative p-4 bg-gray-800 border-2 rounded-lg transition-all
        ${isDisabled ? 'border-gray-600 opacity-50 cursor-not-allowed' : 'border-gray-600'}
        ${isClickable ? 'hover:border-blue-400 hover:shadow-lg cursor-pointer' : ''}
      `}
      onClick={isClickable ? onClick : undefined}
    >
      {/* Slot ID Badge */}
      <div className="absolute top-2 left-2 px-2 py-1 bg-gray-900 rounded text-xs font-bold text-white">
        SLOT {shipSlot.id}
      </div>

      {/* Status Badge */}
      <div className={`absolute top-2 right-2 px-2 py-1 ${statusColor} rounded text-xs font-bold text-white`}>
        {statusText}
      </div>

      {/* Slot Name */}
      <div className="mt-8 text-lg font-bold text-white">
        {shipSlot.name}
      </div>

      {/* Component Preview */}
      {renderComponentPreview()}

      {/* Stats Row */}
      <div className="mt-3 flex justify-between items-center text-sm">
        {/* Drone Count */}
        <div className="text-gray-400">
          <span className="font-bold text-white">{droneCount}</span> Drones
        </div>

        {/* Hull Percentage (only for active slots) */}
        {shipSlot.status === 'active' && (
          <div className="text-gray-400">
            Hull: <span className={`font-bold ${
              hullPercentage > 75 ? 'text-green-400' :
              hullPercentage > 40 ? 'text-yellow-400' :
              'text-red-400'
            }`}>{hullPercentage}%</span>
          </div>
        )}

        {/* Empty/MIA State Messages */}
        {shipSlot.status === 'empty' && (
          <div className="text-gray-500 italic">Click to configure</div>
        )}
        {shipSlot.status === 'mia' && (
          <div className="text-red-400 italic">Lost in action</div>
        )}
      </div>

      {/* Immutable Badge (Slot 0) */}
      {shipSlot.isImmutable && (
        <div className="absolute bottom-2 left-2 px-2 py-1 bg-blue-900 rounded text-xs text-blue-200">
          STARTER DECK
        </div>
      )}
    </div>
  );
};

export default ShipSlotCard;
