import React from 'react';
import DroneCard from './DroneCard.jsx';

const DroneDetailPopup = ({ drone, onClose }) => {
  if (!drone) return null;
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}>
        <DroneCard
          drone={drone}
          onClick={() => {}}
          isSelectable={false}
          isSelected={false}
          deployedCount={0}
          ignoreDeployLimit={true}
          appliedUpgrades={[]}
          scale={1.5}
          isViewOnly={true}
        />
      </div>
    </div>
  );
};

export default DroneDetailPopup;
