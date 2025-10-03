// ========================================
// DEPLOYMENT CONFIRMATION MODAL COMPONENT
// ========================================
// Modal that confirms deployment actions with energy and budget costs

import React from 'react';

/**
 * DEPLOYMENT CONFIRMATION MODAL COMPONENT
 * Shows confirmation dialog for drone deployment with cost breakdown.
 * @param {Object} deploymentConfirmation - Deployment data with costs and lane info
 * @param {boolean} show - Whether to show the modal
 * @param {Function} onCancel - Callback when deployment is cancelled
 * @param {Function} onConfirm - Callback when deployment is confirmed
 */
const DeploymentConfirmationModal = ({ deploymentConfirmation, show, onCancel, onConfirm }) => {
  if (!show || !deploymentConfirmation) return null;

  const { budgetCost, energyCost } = deploymentConfirmation;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-md" />
      
      <div className="relative p-[2px] bg-gradient-to-br from-cyan-400 to-blue-500" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 24px), calc(100% - 24px) 100%, 0 100%)' }}>
        <div className="bg-gray-900/95 p-8 text-center" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 24px), calc(100% - 24px) 100%, 0 100%)' }}>
          <div className="space-y-8">
          <h1
            className="text-4xl font-bold uppercase tracking-[0.3em] text-center"
            style={{
              background: 'linear-gradient(45deg, #00ff88, #0088ff, #00ff88)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 0 30px rgba(0, 255, 136, 0.5)'
            }}
          >
            Deploy Drone?
          </h1>

          <div className="flex items-center justify-center gap-8">
            <div>
              <div className="text-5xl font-bold text-cyan-400 mb-2">{budgetCost}</div>
              <div className="text-cyan-300/50 uppercase text-xs tracking-widest">Deployment</div>
            </div>
            <div className="text-4xl text-cyan-500/30 font-light">|</div>
            <div>
              <div className="text-5xl font-bold text-blue-400 mb-2">{energyCost}</div>
              <div className="text-blue-300/50 uppercase text-xs tracking-widest">Energy</div>
            </div>
          </div>

          <div className="flex justify-center gap-6 pt-4">
            <button 
              onClick={onCancel}
              className="w-32 py-3 border-2 border-gray-600 text-gray-400 hover:border-gray-400 hover:text-gray-200 rounded uppercase text-sm tracking-wider font-semibold transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={onConfirm}
              className="w-32 py-3 border-2 rounded uppercase text-sm tracking-wider font-semibold transition-all hover:scale-110 hover:shadow-[0_0_30px_rgba(0,255,136,0.6)]"
              style={{
                borderColor: '#00ff88',
                background: 'linear-gradient(45deg, rgba(0, 255, 136, 0.2), rgba(0, 136, 255, 0.2))',
                color: '#00ff88',
                boxShadow: '0 0 20px rgba(0, 255, 136, 0.3)'
              }}
            >
              Confirm
            </button>
          </div>

          <div className="h-px w-80 mx-auto bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        </div>
      </div>
    </div>
    </div>
  );
};

export default DeploymentConfirmationModal;