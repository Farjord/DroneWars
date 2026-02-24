/**
 * ShipAbilityIcon - Lightning bolt button for ship abilities
 *
 * @param {Function} onClick - Click handler
 * @param {Object} ability - Ability data with name and cost.energy
 * @param {boolean} isUsable - Whether the ability can be used
 * @param {boolean} isSelected - Whether the ability is currently selected
 */
const ShipAbilityIcon = ({ onClick, ability, isUsable, isSelected }) => (
  <button
    onClick={onClick}
    disabled={!isUsable}
    className={`w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center border-2 z-20 transition-all duration-200 flex-shrink-0 ${isUsable ? 'border-cyan-400 hover:border-cyan-300 hover:shadow-lg hover:shadow-cyan-400/50' : 'bg-slate-900 border-gray-600 opacity-60 cursor-not-allowed'} ${isSelected ? 'ring-2 ring-cyan-300 scale-110' : ''}`}
    title={`${ability.name} - Cost: ${ability.cost.energy} Energy`}
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={isUsable ? 'text-cyan-400' : 'text-gray-500'}>
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  </button>
);

export default ShipAbilityIcon;
