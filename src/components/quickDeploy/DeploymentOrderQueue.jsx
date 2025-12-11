/**
 * DeploymentOrderQueue Component
 * Displays the order in which drones will be deployed during quick deploy
 * Allows drag-drop reordering of deployment order
 */

import React, { useState, useCallback } from 'react';
import { GripVertical } from 'lucide-react';
import fullDroneCollection from '../../data/droneData';

/**
 * Convert lane index to display name
 * @param {number} lane - Lane index (0, 1, 2)
 * @returns {string} Lane name (Left, Middle, Right)
 */
const getLaneName = (lane) => {
  const names = { 0: 'Left', 1: 'Middle', 2: 'Right' };
  return names[lane] || 'Unknown';
};

/**
 * DeploymentOrderQueue Component
 * @param {Object} props
 * @param {Array} props.placements - Array of { droneName, lane } placement objects
 * @param {Array} props.deploymentOrder - Array of indices into placements defining deploy order
 * @param {Function} props.onReorder - Callback when order changes, receives new order array
 */
const DeploymentOrderQueue = ({ placements, deploymentOrder, onReorder }) => {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Handle drag start
  const handleDragStart = useCallback((e, orderIndex) => {
    setDraggedIndex(orderIndex);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', orderIndex.toString());
    }
  }, []);

  // Handle drag over
  const handleDragOver = useCallback((e, orderIndex) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    setDragOverIndex(orderIndex);
  }, []);

  // Handle drag leave
  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  // Handle drop
  const handleDrop = useCallback((e, targetOrderIndex) => {
    e.preventDefault();
    setDragOverIndex(null);

    if (draggedIndex === null || draggedIndex === targetOrderIndex) {
      setDraggedIndex(null);
      return;
    }

    // Create new order by moving dragged item to target position
    const newOrder = [...deploymentOrder];
    const [removed] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetOrderIndex, 0, removed);

    onReorder(newOrder);
    setDraggedIndex(null);
  }, [draggedIndex, deploymentOrder, onReorder]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  // Empty state
  if (!placements || placements.length === 0) {
    return (
      <div className="deployment-order-queue empty">
        <p className="text-gray-400 text-sm italic text-center py-4">
          No drones placed yet
        </p>
      </div>
    );
  }

  const isSingleItem = deploymentOrder.length === 1;

  return (
    <div className="deployment-order-queue">
      <h4 className="text-sm font-medium text-gray-300 mb-2">Deploy Order</h4>
      <ul className="space-y-1" role="list">
        {deploymentOrder.map((placementIndex, orderIndex) => {
          const placement = placements[placementIndex];
          if (!placement) return null;

          const isDragging = draggedIndex === orderIndex;
          const isDragOver = dragOverIndex === orderIndex;

          // Get drone image
          const droneData = fullDroneCollection.find(d => d.name === placement.droneName);
          const droneImage = droneData?.image || '/images/drones/default.png';

          return (
            <li
              key={`order-${orderIndex}-placement-${placementIndex}`}
              role="listitem"
              draggable={!isSingleItem}
              onDragStart={(e) => handleDragStart(e, orderIndex)}
              onDragOver={(e) => handleDragOver(e, orderIndex)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, orderIndex)}
              onDragEnd={handleDragEnd}
              className={`
                flex items-center gap-2 px-2 py-1.5 rounded
                ${isDragging ? 'opacity-50 bg-cyan-900/30' : 'bg-gray-800/50'}
                ${isDragOver ? 'border-2 border-cyan-400' : 'border-2 border-transparent'}
                ${!isSingleItem ? 'cursor-grab active:cursor-grabbing' : ''}
                transition-all duration-150
              `}
            >
              {/* Drag handle */}
              {!isSingleItem && (
                <span
                  className="text-gray-500 hover:text-gray-300 flex-shrink-0"
                  data-testid="drag-handle"
                >
                  <GripVertical size={14} />
                </span>
              )}

              {/* Drone token with order number underneath */}
              <div className="flex flex-col items-center flex-shrink-0" style={{ width: '32px' }}>
                <img
                  src={droneImage}
                  alt={placement.droneName}
                  style={{
                    width: '28px',
                    height: '28px',
                    objectFit: 'contain'
                  }}
                />
                <span className="text-cyan-400 font-mono text-xs" style={{ marginTop: '2px' }}>
                  {orderIndex + 1}
                </span>
              </div>

              {/* Drone name and lane */}
              <div className="flex-1 min-w-0">
                <div className="text-gray-200 text-sm truncate">
                  {placement.droneName}
                </div>
                <div className="text-gray-400 text-xs">
                  → {getLaneName(placement.lane)}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default DeploymentOrderQueue;
