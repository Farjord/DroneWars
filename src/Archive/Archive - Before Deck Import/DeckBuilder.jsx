import React, { useState, useMemo } from 'react';
import { Eye, Bolt } from 'lucide-react';

// (The CardDetailPopup component remains the same as before)
const CardDetailPopup = ({ card, onClose }) => {
  if (!card) return null;
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onClose}>
      <div className="w-52 h-72 rounded-lg p-1 bg-purple-800/80 transform scale-150" onClick={e => e.stopPropagation()}>
        <div className="w-full h-full bg-slate-900 flex flex-col font-orbitron text-purple-300 overflow-hidden rounded-md">
          <div className="text-center py-1 px-2 bg-purple-900/50 flex justify-between items-center">
            <span className="font-bold text-sm uppercase tracking-wider truncate">{card.name}</span>
            <div className="flex items-center bg-slate-800/70 px-2 py-0.5 rounded-full">
              <Bolt size={12} className="text-yellow-300" />
              <span className="text-white font-bold text-sm ml-1">{card.cost}</span>
            </div>
          </div>
          <div className="p-1">
            <div className="relative h-24">
              <img src={card.image} alt={card.name} className="w-full h-full object-cover rounded" />
              <div className="absolute inset-0 border border-purple-400/50 rounded"></div>
            </div>
          </div>
          <div className="flex-grow mx-2 my-1 bg-black/50 border border-purple-800/70 p-2 flex flex-col min-h-0">
            <div className="flex-grow relative font-exo font-normal text-purple-200">
              <p className="text-sm leading-tight text-center">{card.description}</p>
            </div>
          </div>
          <div className="text-center text-xs py-1 bg-purple-900/50 uppercase font-semibold tracking-widest">
            {card.type} Card
          </div>
        </div>
      </div>
    </div>
  );
};


const DeckBuilder = ({
  selectedDrones,
  fullCardCollection,
  deck,
  onDeckChange,
  onConfirmDeck
}) => {
  const [detailedCard, setDetailedCard] = useState(null);

  // Memoize calculations for performance
  const { cardCount, deckListForDisplay, baseCardCounts } = useMemo(() => {
    const counts = {};
    let total = 0;
    for (const card of fullCardCollection) {
      const quantityInDeck = deck[card.id] || 0;
      if (quantityInDeck > 0) {
        total += quantityInDeck;
        const baseId = card.baseCardId;
        counts[baseId] = (counts[baseId] || 0) + quantityInDeck;
      }
    }

    const displayList = Object.entries(deck)
      .map(([cardId, quantity]) => {
        const card = fullCardCollection.find(c => c.id === cardId);
        return { ...card, quantity };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return { cardCount: total, deckListForDisplay: displayList, baseCardCounts: counts };
  }, [deck, fullCardCollection]);

  const isDeckValid = cardCount >= 40;

  return (
    <div className="w-full h-full flex flex-col text-white font-exo">
      {detailedCard && <CardDetailPopup card={detailedCard} onClose={() => setDetailedCard(null)} />}
      
      <h1 className="text-4xl font-orbitron font-bold text-center mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">Deck Builder</h1>
      
      <div className="flex-grow flex gap-6 min-h-0">

        {/* Left Side: Available Cards Collection */}
        <div className="w-2/3 flex flex-col bg-slate-900/50 rounded-lg p-4 border border-gray-700">
          <h2 className="text-2xl font-orbitron mb-4">Available Cards</h2>
          <div className="flex-grow overflow-y-auto pr-2">
            <table className="w-full text-left deck-builder-table">
              <thead>
                <tr>
                  <th>Info</th>
                  <th>Name</th>
                  <th>Cost</th>
                  <th>Description</th>
                  <th>Abilities</th>
                  <th>Targeting</th> {/* ADDED HEADER */}
                  <th>Quantity</th>
                </tr>
              </thead>
              <tbody>
                {fullCardCollection.map(card => {
                  const currentCountForThisVariant = deck[card.id] || 0;
                  const totalCountForBaseCard = baseCardCounts[card.baseCardId] || 0;
                  const maxInDeck = card.maxInDeck;

                  // --- UPDATED LOGIC TO HANDLE NESTED EFFECTS ---
                  const keywords = [];
                  const effect = card.effect; // Shortcut

                  const formatKeyword = (type) => {
                    const formatted = type.replace(/_/g, ' ').toLowerCase();
                    return formatted.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                  };

                  if (effect.type === 'REPEATING_EFFECT') {
                    // Add the main keyword for the effect itself
                    keywords.push(formatKeyword(effect.type));
                    // Then, loop through the sub-effects and add their keywords
                    if (effect.effects && Array.isArray(effect.effects)) {
                      effect.effects.forEach(subEffect => {
                        if (subEffect.type) {
                          keywords.push(formatKeyword(subEffect.type));
                        }
                      });
                    }
                  } else if (effect.type) {
                    // Handle regular, single-effect cards as before
                    keywords.push(formatKeyword(effect.type));
                  }

                  // Handle other keyword properties as before
                  if (effect.goAgain) {
                    keywords.push('Go Again');
                  }
                  if (effect.damageType === 'PIERCING') {
                    keywords.push('Piercing');
                  }
                  if (effect.mod?.type) {
                    keywords.push(effect.mod.type.charAt(0).toUpperCase() + effect.mod.type.slice(1));
                  }
                  // --- END UPDATED LOGIC ---

                  return (
                    <tr key={card.id}>
                      <td>
                        <button onClick={() => setDetailedCard(card)} className="p-1 text-gray-400 hover:text-white">
                          <Eye size={18} />
                        </button>
                      </td>
                      <td className="font-bold">{card.name}</td>
                      <td>{card.cost}</td>
                      <td className="text-sm text-gray-400">{card.description}</td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          {keywords.map(keyword => (
                            <span key={keyword} className="ability-chip">{keyword}</span>
                          ))}
                        </div>
                      </td>
                      <td className="text-sm">
                        {(() => {
                          if (!card.targeting) return <span className="text-gray-500">N/A</span>;
                          const type = card.targeting.type.charAt(0) + card.targeting.type.slice(1).toLowerCase();
                          const affinity = card.targeting.affinity.charAt(0) + card.targeting.affinity.slice(1).toLowerCase();
                          return `${type} (${affinity})`;
                        })()}
                      </td>
                      <td>
                        <div className="quantity-buttons">
                          {Array.from({ length: maxInDeck + 1 }).map((_, i) => {
                            const isSelected = i === currentCountForThisVariant;
                            const remainingForBase = maxInDeck - (totalCountForBaseCard - currentCountForThisVariant);
                            const isDisabled = i > remainingForBase;
                            
                            return (
                              <button
                                key={i}
                                onClick={() => onDeckChange(card.id, i)}
                                className={`quantity-btn ${isSelected ? 'selected' : ''}`}
                                disabled={isDisabled}
                              >
                                {i}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Your Deck */}
        <div className="w-1/3 flex flex-col bg-slate-900/50 rounded-lg p-4 border border-gray-700">
          <h2 className={`text-2xl font-orbitron mb-4 transition-colors ${isDeckValid ? 'text-green-400' : 'text-white'}`}>
            Your Deck ({cardCount}/40)
          </h2>
          <div className="flex-grow overflow-y-auto pr-2 deck-list">
            {deckListForDisplay.length > 0 ? (
              deckListForDisplay.map(card => (
                <div key={card.id} className="deck-list-item">
                  <span>{card.name}</span>
                  <span className="font-bold">x {card.quantity}</span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 italic">Your deck is empty. Add cards from the left.</p>
            )}
          </div>
          <button
            onClick={onConfirmDeck}
            disabled={!isDeckValid}
            className="w-full p-4 mt-4 text-xl font-bold font-orbitron rounded-lg bg-purple-600 text-white transition-all duration-300 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed enabled:hover:bg-purple-500"
          >
            Confirm Deck
          </button>
        </div>
      </div>

      {/* Bottom Bar: Selected Drones */}
      <div className="w-full flex-shrink-0 mt-4 p-4 bg-slate-900/50 rounded-t-lg border-t-2 border-cyan-500">
        <h3 className="text-center font-orbitron text-lg mb-2">Your Selected Drones</h3>
        <div className="flex justify-center gap-4">
          {selectedDrones.map(drone => (
            <div key={drone.name} className="flex flex-col items-center">
              <img src={drone.image} alt={drone.name} className="w-16 h-16 rounded-full border-2 border-cyan-400" />
              <span className="text-xs mt-1">{drone.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DeckBuilder;