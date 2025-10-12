/**
 * AIStrategyModal.jsx
 *
 * In-game guide displaying AI decision-making logic and scoring factors.
 * Helps players understand why the AI makes specific choices.
 */

import React, { useState } from 'react';
import {
  aiOverview,
  emojiLegend,
  deploymentScoring,
  attackScoring,
  cardScoring,
  movementScoring,
  specialSystems,
  decisionExamples,
  playerTips
} from '../../data/aiStrategyDescriptions.js';

const AIStrategyModal = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'emoji', label: 'Emoji Legend' },
    { id: 'deployment', label: 'Deployment' },
    { id: 'attacks', label: 'Attacks' },
    { id: 'cards', label: 'Cards' },
    { id: 'movement', label: 'Movement' },
    { id: 'advanced', label: 'Advanced' },
    { id: 'examples', label: 'Examples' },
    { id: 'tips', label: 'Tips' }
  ];

  // ========================================
  // TAB RENDERERS
  // ========================================

  const renderOverview = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-cyan-400 mb-2">{aiOverview.title}</h3>
        <p className="text-gray-300 mb-4 leading-relaxed">{aiOverview.description}</p>
      </div>

      <div className="bg-gray-800 p-4 rounded border border-gray-700">
        <h4 className="text-cyan-400 font-semibold mb-3">Decision Flow</h4>
        <div className="space-y-2">
          {aiOverview.decisionFlow.map((step, idx) => (
            <div key={idx} className="text-gray-300 text-sm">
              {step}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800 p-4 rounded border border-gray-700">
          <h4 className="text-cyan-400 font-semibold mb-2">Passing Thresholds</h4>
          <div className="text-gray-300 text-sm space-y-2">
            <div><span className="text-yellow-300">Deployment:</span> {aiOverview.passingThresholds.deployment}</div>
            <div><span className="text-yellow-300">Action:</span> {aiOverview.passingThresholds.action}</div>
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded border border-gray-700">
          <h4 className="text-cyan-400 font-semibold mb-2">Randomization</h4>
          <p className="text-gray-300 text-sm">{aiOverview.randomization}</p>
        </div>
      </div>
    </div>
  );

  const renderEmojiLegend = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-cyan-400 mb-2">Emoji Legend</h3>
        <p className="text-gray-400 text-sm mb-4">
          The AI uses emojis in its decision logs to indicate different types of scoring factors.
          Learn to read these to understand AI decisions in real-time.
        </p>
      </div>

      <div className="space-y-3">
        {Object.entries(emojiLegend).map(([emoji, data]) => (
          <div key={emoji} className="bg-gray-800 p-4 rounded border border-gray-700">
            <div className="flex items-start gap-3 mb-2">
              <span className="text-3xl">{emoji}</span>
              <div className="flex-1">
                <h4 className="text-cyan-400 font-semibold text-lg">{data.name}</h4>
                <p className="text-gray-300 text-sm mt-1">{data.description}</p>
              </div>
            </div>
            <div className="ml-12">
              <span className="text-gray-400 text-xs font-semibold">Examples:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {data.examples.map((example, idx) => (
                  <span key={idx} className="bg-gray-900 text-gray-300 px-2 py-1 rounded text-xs">
                    {emoji} {example}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderDeployment = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-cyan-400 mb-2">Deployment Scoring</h3>
        <p className="text-gray-400 text-sm mb-4">{deploymentScoring.overview}</p>
      </div>

      <div className="bg-blue-900 bg-opacity-20 border border-blue-500 p-3 rounded">
        <h4 className="text-blue-300 font-semibold mb-2">Energy Management</h4>
        <p className="text-gray-300 text-sm">{deploymentScoring.energyManagement}</p>
      </div>

      <div className="space-y-4">
        {Object.entries(deploymentScoring.factors).map(([key, factor]) => (
          <div key={key} className="bg-gray-800 p-4 rounded border border-gray-700">
            <h4 className="text-cyan-400 font-bold mb-2">{factor.name}</h4>

            {factor.formula && (
              <div className="bg-gray-900 p-2 rounded mb-2">
                <span className="text-gray-400 text-xs font-semibold">Formula: </span>
                <span className="text-green-300 text-sm font-mono">{factor.formula}</span>
              </div>
            )}

            {factor.value && (
              <div className="bg-gray-900 p-2 rounded mb-2">
                <span className="text-gray-400 text-xs font-semibold">Value: </span>
                <span className="text-yellow-300 text-sm font-mono">{factor.value}</span>
              </div>
            )}

            {factor.description && (
              <p className="text-gray-300 text-sm mb-2">{factor.description}</p>
            )}

            {factor.range && (
              <div className="text-gray-400 text-xs">
                <span className="font-semibold">Range: </span>{factor.range}
              </div>
            )}

            {factor.trigger && (
              <div className="text-purple-300 text-xs mt-2">
                <span className="font-semibold">Trigger: </span>{factor.trigger}
              </div>
            )}

            {factor.conditions && (
              <div className="mt-3 space-y-2">
                {factor.conditions.map((cond, idx) => (
                  <div key={idx} className="bg-gray-900 p-2 rounded">
                    <div className="text-yellow-300 text-sm font-semibold mb-1">{cond.condition}</div>
                    <div className="ml-3 space-y-1">
                      {cond.bonuses.map((bonus, bidx) => (
                        <div key={bidx} className="text-gray-300 text-xs">• {bonus}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderAttacks = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-cyan-400 mb-2">Attack Scoring</h3>
        <p className="text-gray-400 text-sm mb-4">{attackScoring.overview}</p>
      </div>

      <div className="bg-gray-800 p-4 rounded border border-cyan-500">
        <h3 className="text-cyan-400 font-bold text-lg mb-4">Drone Attacks</h3>
        <div className="space-y-3">
          {Object.entries(attackScoring.droneAttacks).map(([key, factor]) => (
            <div key={key} className="bg-gray-900 p-3 rounded">
              <h4 className="text-cyan-300 font-semibold mb-1">{factor.name}</h4>

              {factor.formula && (
                <div className="text-green-300 text-sm font-mono mb-1">
                  Formula: {factor.formula}
                </div>
              )}

              {factor.value && (
                <div className="text-yellow-300 text-sm font-mono mb-1">
                  Value: {factor.value}
                </div>
              )}

              <p className="text-gray-300 text-sm">{factor.description}</p>

              {factor.range && (
                <div className="text-gray-400 text-xs mt-1">Range: {factor.range}</div>
              )}

              {factor.trigger && (
                <div className="text-purple-300 text-xs mt-1">Trigger: {factor.trigger}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-800 p-4 rounded border border-red-500">
        <h3 className="text-red-400 font-bold text-lg mb-4">Ship Attacks</h3>
        <div className="space-y-3">
          {Object.entries(attackScoring.shipAttacks).map(([key, factor]) => (
            <div key={key} className="bg-gray-900 p-3 rounded">
              <h4 className="text-red-300 font-semibold mb-1">{factor.name}</h4>

              {factor.formula && (
                <div className="text-green-300 text-sm font-mono mb-1">
                  Formula: {factor.formula}
                </div>
              )}

              {factor.value && (
                <div className="text-yellow-300 text-sm font-mono mb-1">
                  Value: {factor.value}
                </div>
              )}

              <p className="text-gray-300 text-sm">{factor.description}</p>

              {factor.range && (
                <div className="text-gray-400 text-xs mt-1">Range: {factor.range}</div>
              )}

              {factor.trigger && (
                <div className="text-purple-300 text-xs mt-1">Trigger: {factor.trigger}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderCards = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-cyan-400 mb-2">Card Scoring</h3>
        <p className="text-gray-400 text-sm mb-4">{cardScoring.overview}</p>
      </div>

      <div className="bg-red-900 bg-opacity-20 border border-red-500 p-3 rounded">
        <h4 className="text-red-300 font-semibold mb-2">{cardScoring.universalFactor.costPenalty.name}</h4>
        <div className="text-green-300 text-sm font-mono mb-1">
          Formula: {cardScoring.universalFactor.costPenalty.formula}
        </div>
        <p className="text-gray-300 text-sm">{cardScoring.universalFactor.costPenalty.description}</p>
        <div className="text-gray-400 text-xs mt-1">
          Range: {cardScoring.universalFactor.costPenalty.range}
        </div>
      </div>

      <div className="space-y-3">
        {Object.entries(cardScoring.cardTypes).map(([key, cardType]) => (
          <div key={key} className="bg-gray-800 p-4 rounded border border-gray-700">
            <h4 className="text-cyan-400 font-bold mb-2">{cardType.name}</h4>

            {cardType.formula && (
              <div className="bg-gray-900 p-2 rounded mb-2">
                <span className="text-gray-400 text-xs font-semibold">Formula: </span>
                <span className="text-green-300 text-sm font-mono">{cardType.formula}</span>
              </div>
            )}

            {cardType.value && (
              <div className="bg-gray-900 p-2 rounded mb-2">
                <span className="text-gray-400 text-xs font-semibold">Value: </span>
                <span className="text-yellow-300 text-sm font-mono">{cardType.value}</span>
              </div>
            )}

            <p className="text-gray-300 text-sm mb-2">{cardType.description}</p>

            {cardType.example && (
              <div className="bg-blue-900 bg-opacity-20 border border-blue-500 p-2 rounded text-xs text-blue-300 mt-2">
                <span className="font-semibold">Example: </span>{cardType.example}
              </div>
            )}

            {cardType.lowPriority && (
              <div className="text-yellow-300 text-xs mt-2">
                <span className="font-semibold">Low Priority: </span>{cardType.lowPriority}
              </div>
            )}

            {cardType.noCostPenalty && (
              <div className="text-green-300 text-xs mt-2">
                ✓ No cost penalty applied
              </div>
            )}

            {cardType.multiHitBonus && (
              <div className="text-gray-400 text-xs mt-2">
                <span className="font-semibold">Multi-Hit Bonus: </span>{cardType.multiHitBonus}
              </div>
            )}

            {cardType.lethalBonus && (
              <div className="text-gray-400 text-xs mt-2">
                <span className="font-semibold">Lethal Bonus: </span>{cardType.lethalBonus}
              </div>
            )}

            {cardType.scaling && (
              <div className="text-purple-300 text-xs mt-2">
                <span className="font-semibold">Scaling: </span>{cardType.scaling}
              </div>
            )}

            {cardType.blocked && (
              <div className="text-red-300 text-xs mt-2">
                <span className="font-semibold">Blocked: </span>{cardType.blocked}
              </div>
            )}

            {cardType.variants && (
              <div className="mt-3 space-y-2">
                <div className="text-gray-400 text-xs font-semibold">Variants:</div>
                {cardType.variants.map((variant, idx) => (
                  <div key={idx} className="bg-gray-900 p-2 rounded">
                    <div className="text-cyan-300 text-sm font-semibold mb-1">{variant.type}</div>
                    {variant.formula && (
                      <div className="text-green-300 text-xs font-mono mb-1">
                        Formula: {variant.formula}
                      </div>
                    )}
                    <p className="text-gray-300 text-xs">{variant.description}</p>
                  </div>
                ))}
              </div>
            )}

            {cardType.modifiers && (
              <div className="mt-3 bg-gray-900 p-2 rounded">
                <div className="text-gray-400 text-xs font-semibold mb-1">Modifiers:</div>
                <div className="space-y-1">
                  {Object.entries(cardType.modifiers).map(([modKey, modValue]) => (
                    <div key={modKey} className="text-purple-300 text-xs">
                      • {modKey}: {modValue}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderMovement = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-cyan-400 mb-2">Movement Scoring</h3>
        <p className="text-gray-400 text-sm mb-4">{movementScoring.overview}</p>
      </div>

      <div className="space-y-4">
        {Object.entries(movementScoring.factors).map(([key, factor]) => (
          <div key={key} className="bg-gray-800 p-4 rounded border border-gray-700">
            <h4 className="text-cyan-400 font-bold mb-2">{factor.name}</h4>

            {factor.formula && (
              <div className="bg-gray-900 p-2 rounded mb-2">
                <span className="text-gray-400 text-xs font-semibold">Formula: </span>
                <span className="text-green-300 text-sm font-mono">{factor.formula}</span>
              </div>
            )}

            {factor.value && (
              <div className="bg-gray-900 p-2 rounded mb-2">
                <span className="text-gray-400 text-xs font-semibold">Value: </span>
                <span className="text-yellow-300 text-sm font-mono">{factor.value}</span>
              </div>
            )}

            <p className="text-gray-300 text-sm mb-2">{factor.description}</p>

            {factor.range && (
              <div className="text-gray-400 text-xs mt-2">
                <span className="font-semibold">Range: </span>{factor.range}
              </div>
            )}

            {factor.trigger && (
              <div className="text-purple-300 text-xs mt-2">
                <span className="font-semibold">Trigger: </span>{factor.trigger}
              </div>
            )}

            {factor.blocking && (
              <div className="text-red-300 text-xs mt-2">
                ⚠️ This is a blocking restriction
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderAdvanced = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-cyan-400 mb-2">Advanced Systems</h3>
        <p className="text-gray-400 text-sm mb-4">
          These systems use multi-pass scoring to handle complex interactions.
        </p>
      </div>

      {Object.entries(specialSystems).map(([key, system]) => (
        <div key={key} className="bg-gray-800 p-4 rounded border border-purple-500">
          <h3 className="text-purple-400 font-bold text-lg mb-2">{system.name}</h3>
          <p className="text-gray-300 text-sm mb-4 leading-relaxed">{system.description}</p>

          {system.blocking && (
            <div className="bg-red-900 bg-opacity-20 border border-red-500 p-3 rounded mb-3">
              <h4 className="text-red-300 font-semibold mb-2">Blocking</h4>
              <div className="text-gray-300 text-sm space-y-1">
                <div><span className="text-gray-400">Trigger:</span> {system.blocking.trigger}</div>
                <div><span className="text-gray-400">Effect:</span> {system.blocking.effect}</div>
                <div><span className="text-gray-400">Logic:</span> {system.blocking.logic}</div>
              </div>
            </div>
          )}

          {system.removalBonus && (
            <div className="bg-green-900 bg-opacity-20 border border-green-500 p-3 rounded mb-3">
              <h4 className="text-green-300 font-semibold mb-2">{system.removalBonus.name}</h4>
              <div className="text-gray-300 text-sm space-y-1">
                <div className="text-green-300 font-mono">{system.removalBonus.formula}</div>
                <div>{system.removalBonus.description}</div>
                <div className="text-gray-400 text-xs mt-2">{system.removalBonus.additionalBonus}</div>
              </div>
            </div>
          )}

          {system.analysis && (
            <div className="bg-blue-900 bg-opacity-20 border border-blue-500 p-3 rounded mb-3">
              <h4 className="text-blue-300 font-semibold mb-2">Analysis Categories</h4>
              <div className="space-y-2">
                {Object.entries(system.analysis).map(([anaKey, anaValue]) => (
                  <div key={anaKey} className="text-sm">
                    <span className="text-blue-300 font-mono">{anaKey}:</span>
                    <span className="text-gray-300 ml-2">{anaValue}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {system.adjustments && (
            <div className="space-y-3">
              <h4 className="text-purple-300 font-semibold">Score Adjustments</h4>
              {Object.entries(system.adjustments).map(([adjKey, adjustment]) => (
                <div key={adjKey} className="bg-gray-900 p-3 rounded">
                  <h5 className="text-cyan-300 font-semibold mb-1">{adjustment.name}</h5>

                  {adjustment.value && (
                    <div className="text-yellow-300 text-sm font-mono mb-1">
                      Value: {adjustment.value}
                    </div>
                  )}

                  {adjustment.values && (
                    <div className="bg-gray-800 p-2 rounded mb-2">
                      <div className="text-gray-400 text-xs font-semibold mb-1">Values:</div>
                      <div className="space-y-1">
                        {Object.entries(adjustment.values).map(([threat, value]) => (
                          <div key={threat} className="text-xs">
                            <span className="text-yellow-300">{threat}:</span>
                            <span className="text-gray-300 ml-2">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {adjustment.formula && (
                    <div className="text-green-300 text-sm font-mono mb-1">
                      Formula: {adjustment.formula}
                    </div>
                  )}

                  {adjustment.trigger && (
                    <div className="text-purple-300 text-xs mb-1">Trigger: {adjustment.trigger}</div>
                  )}

                  <p className="text-gray-300 text-sm">{adjustment.description}</p>

                  {adjustment.calculation && (
                    <div className="text-gray-400 text-xs mt-2 italic">
                      Calculation: {adjustment.calculation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {system.components && (
            <div className="space-y-3">
              <h4 className="text-purple-300 font-semibold">Components</h4>
              {Object.entries(system.components).map(([compKey, component]) => (
                <div key={compKey} className="bg-gray-900 p-3 rounded">
                  <h5 className="text-cyan-300 font-semibold mb-1">{component.name}</h5>

                  {component.formula && (
                    <div className="text-green-300 text-sm font-mono mb-1">
                      Formula: {component.formula}
                    </div>
                  )}

                  <p className="text-gray-300 text-sm">{component.description}</p>

                  {component.note && (
                    <div className="text-gray-400 text-xs mt-1 italic">Note: {component.note}</div>
                  )}

                  {component.ownSection && (
                    <div className="mt-2 bg-gray-800 p-2 rounded">
                      <div className="text-gray-400 text-xs font-semibold mb-1">Own Section:</div>
                      <div className="space-y-1 text-xs">
                        <div className="text-gray-300">Damaged: {component.ownSection.damaged}</div>
                        <div className="text-gray-300">Critical: {component.ownSection.critical}</div>
                        <div className="text-gray-400 italic">{component.ownSection.description}</div>
                      </div>
                    </div>
                  )}

                  {component.enemySection && (
                    <div className="mt-2 bg-gray-800 p-2 rounded">
                      <div className="text-gray-400 text-xs font-semibold mb-1">Enemy Section:</div>
                      <div className="space-y-1 text-xs">
                        <div className="text-gray-300">Damaged: {component.enemySection.damaged}</div>
                        <div className="text-gray-300">Critical: {component.enemySection.critical}</div>
                        <div className="text-gray-400 italic">{component.enemySection.description}</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {system.finalScore && (
            <div className="mt-3 bg-green-900 bg-opacity-20 border border-green-500 p-2 rounded">
              <span className="text-green-300 font-semibold">Final Score: </span>
              <span className="text-gray-300">{system.finalScore}</span>
            </div>
          )}

          {system.usage && (
            <div className="mt-2 text-gray-400 text-xs italic">
              Usage: {system.usage}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderExamples = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-cyan-400 mb-2">Decision Examples</h3>
        <p className="text-gray-400 text-sm mb-4">
          Real scenarios showing how AI scores and chooses actions.
        </p>
      </div>

      {decisionExamples.map((example, idx) => (
        <div key={idx} className="bg-gray-800 p-4 rounded border border-cyan-500">
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-cyan-900 text-cyan-300 px-2 py-1 rounded text-xs font-semibold">
              {example.category}
            </span>
            <h4 className="text-cyan-400 font-bold">Scenario</h4>
          </div>

          <p className="text-gray-300 text-sm mb-4">{example.scenario}</p>

          <div className="space-y-3 mb-4">
            <div className="text-gray-400 text-sm font-semibold">Options Considered:</div>
            {example.options.map((option, oidx) => (
              <div key={oidx} className="bg-gray-900 p-3 rounded">
                <div className="text-gray-300 font-semibold mb-1">{option.choice}</div>
                <div className="text-sm text-gray-400 font-mono">{option.calculation}</div>
              </div>
            ))}
          </div>

          <div className="bg-green-900 bg-opacity-20 border border-green-500 p-3 rounded mb-3">
            <span className="text-green-300 font-semibold">Decision: </span>
            <span className="text-gray-300">{example.decision}</span>
          </div>

          <div className="bg-blue-900 bg-opacity-20 border border-blue-500 p-3 rounded">
            <span className="text-blue-300 font-semibold">Lesson: </span>
            <span className="text-gray-300">{example.lesson}</span>
          </div>
        </div>
      ))}
    </div>
  );

  const renderTips = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-cyan-400 mb-2">Tips for Playing Against AI</h3>
        <p className="text-gray-400 text-sm mb-4">
          Use your knowledge of AI scoring to gain strategic advantages.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {playerTips.map((tipData, idx) => (
          <div key={idx} className="bg-gray-800 p-4 rounded border border-gray-700">
            <h4 className="text-cyan-400 font-bold mb-2 flex items-center gap-2">
              <span className="text-yellow-400">💡</span>
              {tipData.tip}
            </h4>
            <p className="text-gray-300 text-sm leading-relaxed">{tipData.explanation}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'emoji': return renderEmojiLegend();
      case 'deployment': return renderDeployment();
      case 'attacks': return renderAttacks();
      case 'cards': return renderCards();
      case 'movement': return renderMovement();
      case 'advanced': return renderAdvanced();
      case 'examples': return renderExamples();
      case 'tips': return renderTips();
      default: return renderOverview();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-2xl border-2 border-cyan-500 w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-cyan-400">AI Strategy Guide</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl font-bold px-3"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-700 px-4">
          <div className="flex space-x-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 font-semibold transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-cyan-400 border-b-2 border-cyan-400'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderContent()}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 text-center text-sm text-gray-500">
          Understanding AI behavior helps you make better strategic decisions.
        </div>
      </div>
    </div>
  );
};

export default AIStrategyModal;
