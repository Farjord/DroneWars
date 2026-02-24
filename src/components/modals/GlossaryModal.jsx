/**
 * GlossaryModal.jsx
 *
 * Dynamic in-game glossary displaying all available game mechanics,
 * effect types, targeting patterns, and their parameters.
 * Designed for developer reference when creating new cards/abilities.
 */

import React, { useState, useMemo } from 'react';
import { BookOpen } from 'lucide-react';
import { generateCompleteGlossary, generateMechanicsSummary } from '../../logic/glossary/glossaryAnalyzer';

const GlossaryModal = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');

  // Generate glossary data once on mount
  const glossary = useMemo(() => generateCompleteGlossary(), []);
  const summary = useMemo(() => generateMechanicsSummary(), []);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'effects', label: 'Effect Types' },
    { id: 'targeting', label: 'Targeting' },
    { id: 'stats', label: 'Stat Modifications' },
    { id: 'keywords', label: 'Keywords' },
    { id: 'conditions', label: 'Conditions' },
    { id: 'filters', label: 'Filters' },
    { id: 'scopes', label: 'Scopes' }
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-cyan-400 mb-2">Game Mechanics Glossary</h3>
        <p className="text-gray-300 mb-4">
          This glossary is dynamically generated from the game data files. It provides comprehensive
          documentation of all available effects, targeting patterns, and parameters for developers
          creating new cards and abilities.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800 p-4 rounded border border-gray-700">
          <h4 className="text-cyan-400 font-semibold mb-2">Data Sources</h4>
          <ul className="text-gray-300 text-sm space-y-1">
            <li>• {glossary.metadata.totalCards} Action Cards</li>
            <li>• {glossary.metadata.totalDrones} Drone Types</li>
            <li>• Generated: {new Date(glossary.metadata.generatedAt).toLocaleTimeString()}</li>
          </ul>
        </div>

        <div className="bg-gray-800 p-4 rounded border border-gray-700">
          <h4 className="text-cyan-400 font-semibold mb-2">Available Mechanics</h4>
          <ul className="text-gray-300 text-sm space-y-1">
            <li>• {summary.totalEffectTypes} Effect Types</li>
            <li>• {summary.totalTargetingTypes} Targeting Types</li>
            <li>• {summary.totalKeywords} Keywords</li>
            <li>• {summary.totalConditions} Condition Types</li>
          </ul>
        </div>
      </div>

      <div className="bg-gray-800 p-4 rounded border border-gray-700">
        <h4 className="text-cyan-400 font-semibold mb-3">Quick Reference - All Items</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400 font-semibold mb-2">Effect Types ({summary.effectTypesList.length}):</p>
            <div className="text-gray-300 space-y-1 max-h-96 overflow-y-auto pr-2 dw-modal-scroll">
              {summary.effectTypesList.map(type => (
                <div key={type}>• {type}</div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-gray-400 font-semibold mb-2">Targeting Types ({summary.targetingTypesList.length}):</p>
            <div className="text-gray-300 space-y-1 max-h-96 overflow-y-auto pr-2 dw-modal-scroll">
              {summary.targetingTypesList.map(type => (
                <div key={type}>• {type}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Missing Descriptions Section */}
      {glossary.missingDescriptions && (
        Object.values(glossary.missingDescriptions).some(arr => arr.length > 0) && (
          <div className="bg-red-900 bg-opacity-20 border border-red-500 p-4 rounded">
            <h4 className="text-red-400 font-semibold mb-3">⚠️ Missing Descriptions</h4>
            <p className="text-gray-300 text-sm mb-3">
              The following mechanics exist in the game but do not have developer-written descriptions yet:
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {glossary.missingDescriptions.effectTypes.length > 0 && (
                <div>
                  <p className="text-red-300 font-semibold mb-2">Effect Types ({glossary.missingDescriptions.effectTypes.length}):</p>
                  <div className="text-gray-300 space-y-1">
                    {glossary.missingDescriptions.effectTypes.map(item => (
                      <div key={item.type} className="text-xs">
                        • {item.type} <span className="text-gray-500">({item.exampleCount} examples)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {glossary.missingDescriptions.targetingTypes.length > 0 && (
                <div>
                  <p className="text-red-300 font-semibold mb-2">Targeting Types ({glossary.missingDescriptions.targetingTypes.length}):</p>
                  <div className="text-gray-300 space-y-1">
                    {glossary.missingDescriptions.targetingTypes.map(item => (
                      <div key={item.type} className="text-xs">
                        • {item.type}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {glossary.missingDescriptions.conditions.length > 0 && (
                <div>
                  <p className="text-red-300 font-semibold mb-2">Conditions ({glossary.missingDescriptions.conditions.length}):</p>
                  <div className="text-gray-300 space-y-1">
                    {glossary.missingDescriptions.conditions.map(item => (
                      <div key={item.type} className="text-xs">
                        • {item.type}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {glossary.missingDescriptions.keywords.length > 0 && (
                <div>
                  <p className="text-red-300 font-semibold mb-2">Keywords ({glossary.missingDescriptions.keywords.length}):</p>
                  <div className="text-gray-300 space-y-1">
                    {glossary.missingDescriptions.keywords.map(item => (
                      <div key={item.keyword} className="text-xs">
                        • {item.keyword}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );

  const renderEffects = () => (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-cyan-400">Effect Types</h3>
        <p className="text-gray-400 text-sm">
          All available effect types extracted from cards and drone abilities
        </p>
      </div>

      {Object.entries(glossary.effectTypes).sort(([a], [b]) => a.localeCompare(b)).map(([type, data]) => (
        <div key={type} className="bg-gray-800 p-4 rounded border border-gray-700">
          <h4 className="text-cyan-400 font-bold text-lg mb-2">{type}</h4>

          {/* Description */}
          {data.description && (
            <div className="bg-gray-900 p-3 rounded mb-3 border-l-4 border-cyan-500">
              <p className="text-gray-300 text-sm italic">{data.description}</p>
            </div>
          )}
          {!data.hasDescription && (
            <div className="bg-red-900 bg-opacity-20 border border-red-500 p-2 rounded mb-3">
              <p className="text-red-300 text-xs">⚠️ Missing developer description</p>
            </div>
          )}

          {/* Technical Details */}
          {data.technicalDetails && (
            <div className="bg-blue-900 bg-opacity-20 border border-blue-500 p-3 rounded mb-3">
              <h5 className="text-blue-300 font-semibold text-sm mb-2">Technical Details</h5>

              {data.technicalDetails.implementation && (
                <div className="text-xs text-gray-400 mb-2">
                  <span className="font-semibold">Implementation:</span> {data.technicalDetails.implementation}
                </div>
              )}

              {data.technicalDetails.requiredParameters && data.technicalDetails.requiredParameters.length > 0 && (
                <div className="mb-2">
                  <span className="text-gray-400 font-semibold text-xs">Required Parameters:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {data.technicalDetails.requiredParameters.map(param => (
                      <span key={param} className="bg-red-900 text-red-300 px-2 py-1 rounded text-xs">
                        {param}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {data.technicalDetails.validSubEffects && (
                <div className="mb-2">
                  <span className="text-gray-400 font-semibold text-xs">Valid Sub-Effects:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {data.technicalDetails.validSubEffects.map(subEff => (
                      <span key={subEff} className="bg-gray-900 text-green-300 px-2 py-1 rounded text-xs">
                        {subEff}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {data.technicalDetails.validParameters && (
                <div className="mb-2">
                  <span className="text-gray-400 font-semibold text-xs">Valid Parameters:</span>
                  <pre className="text-gray-300 text-xs mt-1 overflow-x-auto bg-gray-900 p-2 rounded">
                    {JSON.stringify(data.technicalDetails.validParameters, null, 2)}
                  </pre>
                </div>
              )}

              {data.technicalDetails.notes && (
                <div className="text-xs text-gray-400 italic mt-2">
                  {data.technicalDetails.notes}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
            <div>
              <span className="text-gray-400 font-semibold">Used in:</span>{' '}
              <span className="text-gray-300">{data.usedIn.join(', ')}</span>
            </div>
            {data.targetingTypes.length > 0 && (
              <div>
                <span className="text-gray-400 font-semibold">Targeting:</span>{' '}
                <span className="text-gray-300">{data.targetingTypes.join(', ')}</span>
              </div>
            )}
          </div>

          {/* Cross-References */}
          {data.relatedTargeting && data.relatedTargeting.length > 0 && (
            <div className="mb-3">
              <span className="text-gray-400 font-semibold text-sm">Related Targeting Types:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {data.relatedTargeting.map(rel => (
                  <button
                    key={rel.type}
                    onClick={() => setActiveTab('targeting')}
                    className="bg-gray-900 text-blue-300 px-2 py-1 rounded text-xs hover:bg-gray-700 transition-colors"
                    title={rel.description || 'No description'}
                  >
                    {rel.type} →
                  </button>
                ))}
              </div>
            </div>
          )}

          {data.relatedConditions && data.relatedConditions.length > 0 && (
            <div className="mb-3">
              <span className="text-gray-400 font-semibold text-sm">Related Conditions:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {data.relatedConditions.map(rel => (
                  <button
                    key={rel.type}
                    onClick={() => setActiveTab('conditions')}
                    className="bg-gray-900 text-purple-300 px-2 py-1 rounded text-xs hover:bg-gray-700 transition-colors"
                    title={rel.description || 'No description'}
                  >
                    {rel.type} →
                  </button>
                ))}
              </div>
            </div>
          )}

          {data.parameters.length > 0 && (
            <div className="mb-3">
              <span className="text-gray-400 font-semibold text-sm">Discovered Parameters:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {data.parameters.map(param => (
                  <span key={param} className="bg-gray-900 text-cyan-300 px-2 py-1 rounded text-xs">
                    {param}
                  </span>
                ))}
              </div>
            </div>
          )}

          {data.examples.length > 0 && (
            <div>
              <span className="text-gray-400 font-semibold text-sm">Examples:</span>
              <div className="mt-2 space-y-2">
                {data.examples.map((example, idx) => (
                  <div key={idx} className="bg-gray-900 p-2 rounded text-xs">
                    <div className="text-cyan-300 font-semibold">{example.name}</div>
                    <div className="text-gray-400 italic mb-1">{example.description}</div>
                    <pre className="text-gray-300 overflow-x-auto">
                      {JSON.stringify(example.effect, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderTargeting = () => (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-cyan-400">Targeting Types</h3>
        <p className="text-gray-400 text-sm">
          Available targeting patterns and their configuration options
        </p>
      </div>

      {Object.entries(glossary.targetingTypes).sort(([a], [b]) => a.localeCompare(b)).map(([type, data]) => (
        <div key={type} className="bg-gray-800 p-4 rounded border border-gray-700">
          <h4 className="text-cyan-400 font-bold text-lg mb-2">{type}</h4>

          {/* Description */}
          {data.description && (
            <div className="bg-gray-900 p-3 rounded mb-3 border-l-4 border-cyan-500">
              <p className="text-gray-300 text-sm italic">{data.description}</p>
            </div>
          )}
          {!data.hasDescription && (
            <div className="bg-red-900 bg-opacity-20 border border-red-500 p-2 rounded mb-3">
              <p className="text-red-300 text-xs">⚠️ Missing developer description</p>
            </div>
          )}

          {/* Technical Details */}
          {data.technicalDetails && (
            <div className="bg-blue-900 bg-opacity-20 border border-blue-500 p-3 rounded mb-3">
              <h5 className="text-blue-300 font-semibold text-sm mb-2">Technical Details</h5>

              {data.technicalDetails.validParameters && (
                <div className="mb-2">
                  <span className="text-gray-400 font-semibold text-xs">Valid Parameters:</span>
                  <pre className="text-gray-300 text-xs mt-1 overflow-x-auto bg-gray-900 p-2 rounded">
                    {JSON.stringify(data.technicalDetails.validParameters, null, 2)}
                  </pre>
                </div>
              )}

              {data.technicalDetails.notes && (
                <div className="text-xs text-gray-400 italic mt-2">
                  {data.technicalDetails.notes}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
            {data.affinityOptions.length > 0 && (
              <div>
                <span className="text-gray-400 font-semibold">Affinity:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {data.affinityOptions.map(aff => (
                    <span key={aff} className="bg-gray-900 text-green-300 px-2 py-1 rounded text-xs">
                      {aff}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {data.locationOptions.length > 0 && (
              <div>
                <span className="text-gray-400 font-semibold">Location:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {data.locationOptions.map(loc => (
                    <span key={loc} className="bg-gray-900 text-blue-300 px-2 py-1 rounded text-xs">
                      {loc}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {data.customFilters.length > 0 && (
              <div>
                <span className="text-gray-400 font-semibold">Custom Filters:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {data.customFilters.map(filter => (
                    <span key={filter} className="bg-gray-900 text-yellow-300 px-2 py-1 rounded text-xs">
                      {filter}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Cross-References */}
          {data.relatedEffects && data.relatedEffects.length > 0 && (
            <div className="mb-3">
              <span className="text-gray-400 font-semibold text-sm">Related Effect Types:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {data.relatedEffects.map(rel => (
                  <button
                    key={rel.type}
                    onClick={() => setActiveTab('effects')}
                    className="bg-gray-900 text-cyan-300 px-2 py-1 rounded text-xs hover:bg-gray-700 transition-colors"
                    title={rel.description || 'No description'}
                  >
                    {rel.type} →
                  </button>
                ))}
              </div>
            </div>
          )}

          {data.usedByEffects.length > 0 && (
            <div className="mb-3">
              <span className="text-gray-400 font-semibold text-sm">Used by effects:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {data.usedByEffects.map(eff => (
                  <span key={eff} className="bg-gray-900 text-cyan-300 px-2 py-1 rounded text-xs">
                    {eff}
                  </span>
                ))}
              </div>
            </div>
          )}

          {data.examples.length > 0 && (
            <div>
              <span className="text-gray-400 font-semibold text-sm">Examples:</span>
              <div className="mt-2 space-y-2">
                {data.examples.map((example, idx) => (
                  <div key={idx} className="bg-gray-900 p-2 rounded text-xs">
                    <div className="text-cyan-300 font-semibold">{example.name}</div>
                    <div className="text-gray-400 italic mb-1">{example.description}</div>
                    <pre className="text-gray-300">
                      {JSON.stringify(example.targeting, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderStats = () => (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-cyan-400">Stat Modifications</h3>
        <p className="text-gray-400 text-sm">
          All modifiable stats and their value ranges
        </p>
      </div>

      <div className="bg-gray-800 p-4 rounded border border-gray-700">
        <h4 className="text-cyan-400 font-semibold mb-3">Modifiable Drone Stats</h4>
        <div className="flex flex-wrap gap-2">
          {glossary.modifiableStats.droneStats.map(stat => (
            <span key={stat} className="bg-gray-900 text-green-300 px-3 py-1 rounded">
              {stat}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-gray-800 p-4 rounded border border-gray-700">
        <h4 className="text-cyan-400 font-semibold mb-3">Modification Types</h4>
        <div className="flex flex-wrap gap-2">
          {glossary.modifiableStats.modificationTypes.map(type => (
            <span key={type} className="bg-gray-900 text-blue-300 px-3 py-1 rounded">
              {type}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-gray-800 p-4 rounded border border-gray-700">
        <h4 className="text-cyan-400 font-semibold mb-3">Value Ranges by Stat</h4>
        <div className="space-y-2">
          {Object.entries(glossary.modifiableStats.valueRanges).map(([stat, range]) => (
            <div key={stat} className="bg-gray-900 p-3 rounded">
              <div className="text-gray-300 font-semibold">{stat}</div>
              <div className="text-sm text-gray-400">
                Range: {range.min} to {range.max}
              </div>
              <div className="text-xs text-gray-500">
                Values used: {[...new Set(range.values)].sort((a, b) => a - b).join(', ')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderKeywords = () => (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-cyan-400">Keywords</h3>
        <p className="text-gray-400 text-sm">
          Special keywords granted to drones and their sources
        </p>
      </div>

      {Object.entries(glossary.keywords).sort(([a], [b]) => a.localeCompare(b)).map(([keyword, data]) => (
        <div key={keyword} className="bg-gray-800 p-4 rounded border border-gray-700">
          <h4 className="text-cyan-400 font-bold text-lg mb-3">{keyword}</h4>

          {/* Description */}
          {data.description && (
            <div className="bg-gray-900 p-3 rounded mb-3 border-l-4 border-cyan-500">
              <p className="text-gray-300 text-sm italic">{data.description}</p>
            </div>
          )}
          {!data.hasDescription && (
            <div className="bg-red-900 bg-opacity-20 border border-red-500 p-2 rounded mb-3">
              <p className="text-red-300 text-xs">⚠️ Missing developer description</p>
            </div>
          )}

          {/* Technical Details */}
          {data.technicalDetails && (
            <div className="bg-blue-900 bg-opacity-20 border border-blue-500 p-3 rounded mb-3">
              <h5 className="text-blue-300 font-semibold text-sm mb-2">Technical Behavior</h5>
              <div className="text-xs text-gray-400 italic">
                {data.technicalDetails}
              </div>
            </div>
          )}

          <div>
            <span className="text-gray-400 font-semibold text-sm">Granted by:</span>
            <div className="mt-2 space-y-2">
              {data.grantedBy.map((source, idx) => (
                <div key={idx} className="bg-gray-900 p-2 rounded">
                  <div className="text-cyan-300 font-semibold text-sm">
                    {source.name} <span className="text-gray-500">({source.type})</span>
                  </div>
                  <div className="text-gray-400 text-xs italic">{source.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      {Object.keys(glossary.keywords).length === 0 && (
        <div className="text-gray-400 text-center py-8">
          No keywords found in current game data.
        </div>
      )}
    </div>
  );

  const renderConditions = () => (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-cyan-400">Conditions</h3>
        <p className="text-gray-400 text-sm">
          Conditional triggers and requirements for effects
        </p>
      </div>

      {Object.entries(glossary.conditions).sort(([a], [b]) => a.localeCompare(b)).map(([type, data]) => (
        <div key={type} className="bg-gray-800 p-4 rounded border border-gray-700">
          <h4 className="text-cyan-400 font-bold text-lg mb-2">{type}</h4>

          {/* Description */}
          {data.description && (
            <div className="bg-gray-900 p-3 rounded mb-3 border-l-4 border-cyan-500">
              <p className="text-gray-300 text-sm italic">{data.description}</p>
            </div>
          )}
          {!data.hasDescription && (
            <div className="bg-red-900 bg-opacity-20 border border-red-500 p-2 rounded mb-3">
              <p className="text-red-300 text-xs">⚠️ Missing developer description</p>
            </div>
          )}

          {/* Technical Details */}
          {data.technicalDetails && (
            <div className="bg-blue-900 bg-opacity-20 border border-blue-500 p-3 rounded mb-3">
              <h5 className="text-blue-300 font-semibold text-sm mb-2">Technical Details</h5>

              {data.technicalDetails.validParameters && (
                <div className="mb-2">
                  <span className="text-gray-400 font-semibold text-xs">Valid Parameters:</span>
                  <pre className="text-gray-300 text-xs mt-1 overflow-x-auto bg-gray-900 p-2 rounded">
                    {JSON.stringify(data.technicalDetails.validParameters, null, 2)}
                  </pre>
                </div>
              )}

              {data.technicalDetails.returns && (
                <div className="mb-2">
                  <span className="text-gray-400 font-semibold text-xs">Returns:</span>{' '}
                  <span className="text-purple-300 text-xs">{data.technicalDetails.returns}</span>
                </div>
              )}

              {data.technicalDetails.notes && (
                <div className="text-xs text-gray-400 italic mt-2">
                  {data.technicalDetails.notes}
                </div>
              )}
            </div>
          )}

          {data.parameters.length > 0 && (
            <div className="mb-3">
              <span className="text-gray-400 font-semibold text-sm">Discovered Parameters:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {data.parameters.map(param => (
                  <span key={param} className="bg-gray-900 text-purple-300 px-2 py-1 rounded text-xs">
                    {param}
                  </span>
                ))}
              </div>
            </div>
          )}

          {data.examples.length > 0 && (
            <div>
              <span className="text-gray-400 font-semibold text-sm">Examples:</span>
              <div className="mt-2 space-y-2">
                {data.examples.map((example, idx) => (
                  <div key={idx} className="bg-gray-900 p-2 rounded text-xs">
                    <div className="text-cyan-300 font-semibold">{example.name}</div>
                    <div className="text-gray-400 italic mb-1">{example.description}</div>
                    <pre className="text-gray-300">
                      {JSON.stringify(example.condition, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      {Object.keys(glossary.conditions).length === 0 && (
        <div className="text-gray-400 text-center py-8">
          No conditions found in current game data.
        </div>
      )}
    </div>
  );

  const renderFilters = () => (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-cyan-400">Filters</h3>
        <p className="text-gray-400 text-sm">
          Filter patterns for scoped and conditional effects
        </p>
      </div>

      <div className="bg-gray-800 p-4 rounded border border-gray-700">
        <h4 className="text-cyan-400 font-semibold mb-3">Filterable Stats</h4>
        <div className="flex flex-wrap gap-2">
          {glossary.filters.stats.map(stat => (
            <span key={stat} className="bg-gray-900 text-green-300 px-3 py-1 rounded">
              {stat}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-gray-800 p-4 rounded border border-gray-700">
        <h4 className="text-cyan-400 font-semibold mb-3">Comparison Operators</h4>
        <div className="flex flex-wrap gap-2">
          {glossary.filters.comparisons.map(comp => (
            <span key={comp} className="bg-gray-900 text-blue-300 px-3 py-1 rounded">
              {comp}
            </span>
          ))}
        </div>
      </div>

      {glossary.filters.valueRange && (
        <div className="bg-gray-800 p-4 rounded border border-gray-700">
          <h4 className="text-cyan-400 font-semibold mb-3">Value Range</h4>
          <div className="text-gray-300">
            {glossary.filters.valueRange.min} to {glossary.filters.valueRange.max}
          </div>
        </div>
      )}

      {glossary.filters.examples.length > 0 && (
        <div className="bg-gray-800 p-4 rounded border border-gray-700">
          <h4 className="text-cyan-400 font-semibold mb-3">Examples</h4>
          <div className="space-y-2">
            {glossary.filters.examples.map((example, idx) => (
              <div key={idx} className="bg-gray-900 p-2 rounded text-xs">
                <div className="text-cyan-300 font-semibold">{example.name}</div>
                <div className="text-gray-400 italic mb-1">{example.description}</div>
                <pre className="text-gray-300">
                  {JSON.stringify(example.filter, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderScopes = () => (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-cyan-400">Scopes</h3>
        <p className="text-gray-400 text-sm">
          Area-of-effect scope patterns for multi-target effects
        </p>
      </div>

      {Object.entries(glossary.scopes).sort(([a], [b]) => a.localeCompare(b)).map(([scope, data]) => (
        <div key={scope} className="bg-gray-800 p-4 rounded border border-gray-700">
          <h4 className="text-cyan-400 font-bold text-lg mb-3">{scope}</h4>

          {/* Description */}
          {data.description && (
            <div className="bg-gray-900 p-3 rounded mb-3 border-l-4 border-cyan-500">
              <p className="text-gray-300 text-sm italic">{data.description}</p>
            </div>
          )}
          {!data.hasDescription && (
            <div className="bg-red-900 bg-opacity-20 border border-red-500 p-2 rounded mb-3">
              <p className="text-red-300 text-xs">⚠️ Missing developer description</p>
            </div>
          )}

          {/* Technical Details */}
          {data.technicalDetails && (
            <div className="bg-blue-900 bg-opacity-20 border border-blue-500 p-3 rounded mb-3">
              <h5 className="text-blue-300 font-semibold text-sm mb-2">Technical Behavior</h5>
              <div className="text-xs text-gray-400 italic">
                {data.technicalDetails}
              </div>
            </div>
          )}

          <div className="mb-3">
            <span className="text-gray-400 font-semibold text-sm">Used with effect types:</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {data.effectTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setActiveTab('effects')}
                  className="bg-gray-900 text-cyan-300 px-2 py-1 rounded text-xs hover:bg-gray-700 transition-colors"
                >
                  {type} →
                </button>
              ))}
            </div>
          </div>

          {data.examples.length > 0 && (
            <div>
              <span className="text-gray-400 font-semibold text-sm">Examples:</span>
              <div className="mt-2 space-y-2">
                {data.examples.map((example, idx) => (
                  <div key={idx} className="bg-gray-900 p-2 rounded text-xs">
                    <div className="text-cyan-300 font-semibold">{example.name}</div>
                    <div className="text-gray-400 italic">{example.description}</div>
                    <div className="text-gray-500">Effect: {example.effect}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      {Object.keys(glossary.scopes).length === 0 && (
        <div className="text-gray-400 text-center py-8">
          No scopes found in current game data.
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'effects': return renderEffects();
      case 'targeting': return renderTargeting();
      case 'stats': return renderStats();
      case 'keywords': return renderKeywords();
      case 'conditions': return renderConditions();
      case 'filters': return renderFilters();
      case 'scopes': return renderScopes();
      default: return renderOverview();
    }
  };

  return (
    <div className="dw-modal-overlay" onClick={onClose}>
      <div className="dw-modal-content dw-modal--xxl dw-modal--action" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div className="dw-modal-header">
          <div className="dw-modal-header-icon">
            <BookOpen size={28} />
          </div>
          <div className="dw-modal-header-info">
            <h2 className="dw-modal-header-title">Glossary</h2>
            <p className="dw-modal-header-subtitle">Game Mechanics Reference</p>
          </div>
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
        <div className="flex-1 overflow-y-auto p-6 dw-modal-scroll">
          {renderContent()}
        </div>

        {/* Footer */}
        <div className="dw-modal-footer">
          This glossary is automatically generated from game data. All mechanics are extracted dynamically.
        </div>
      </div>
    </div>
  );
};

export default GlossaryModal;
