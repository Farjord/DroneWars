import React from 'react';
import { ChevronUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { CHART_COLORS, renderCustomizedLabel } from '../../utils/chartUtils.jsx';

// --- Reusable Chart Primitives ---

const StatBarChart = ({ data, barColor = '#8884d8', barLabel = 'Count' }) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} margin={{ top: 5, right: 20, left: -15, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
      <XAxis dataKey="name" tick={{ fill: '#A0AEC0' }} interval={0} />
      <YAxis allowDecimals={false} tick={{ fill: '#A0AEC0' }} />
      <Tooltip cursor={{ fill: 'rgba(128, 90, 213, 0.2)' }} contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #4A5568' }} />
      <Bar dataKey="count" fill={barColor} name={barLabel} />
    </BarChart>
  </ResponsiveContainer>
);

const StatPieChart = ({ data, colorSource, labelRenderer, outerRadius = 60, showLegend = false }) => (
  <ResponsiveContainer width="100%" height="100%">
    <PieChart margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        labelLine={false}
        label={labelRenderer || (({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`)}
        outerRadius={outerRadius}
        dataKey="value"
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={colorSource === 'entry' ? entry.color : CHART_COLORS[index % CHART_COLORS.length]} />
        ))}
      </Pie>
      <Tooltip contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #4A5568' }} />
      {showLegend && <Legend />}
    </PieChart>
  </ResponsiveContainer>
);

const ChartPanel = ({ title, children }) => (
  <div className="w-full h-full flex flex-col items-center">
    <h4 className="font-semibold mb-1">{title}</h4>
    {children}
  </div>
);

// --- Tab Definitions ---

const DECK_TABS = [
  { key: 'cost', label: 'Cost' },
  { key: 'type', label: 'Type' },
  { key: 'ability', label: 'Abilities' },
];

const DRONE_TABS = [
  { key: 'cost', label: 'Cost' },
  { key: 'attack', label: 'Attack' },
  { key: 'speed', label: 'Speed' },
  { key: 'shields', label: 'Shields' },
  { key: 'hull', label: 'Hull' },
  { key: 'limit', label: 'Limit' },
  { key: 'upgrades', label: 'Upgrades' },
  { key: 'ability', label: 'Abilities' },
];

const DRONE_BAR_CHARTS = [
  { key: 'cost', title: 'Drone Cost Distribution', dataKey: 'costData', color: '#8884d8' },
  { key: 'attack', title: 'Attack Distribution', dataKey: 'attackData', color: '#ef4444' },
  { key: 'speed', title: 'Speed Distribution', dataKey: 'speedData', color: '#3b82f6' },
  { key: 'shields', title: 'Shield Distribution', dataKey: 'shieldsData', color: '#06b6d4' },
  { key: 'hull', title: 'Hull Distribution', dataKey: 'hullData', color: '#22c55e' },
  { key: 'limit', title: 'Deployment Limit Distribution', dataKey: 'limitData', color: '#f59e0b' },
  { key: 'upgrades', title: 'Upgrade Slots Distribution', dataKey: 'upgradesData', color: '#a855f7' },
];

// --- Deck Statistics ---

const buildTypeDistribution = (deckListForDisplay) => {
  const types = [
    { name: 'Ordnance', color: '#ef4444' },
    { name: 'Tactic', color: '#f59e0b' },
    { name: 'Support', color: '#10b981' },
    { name: 'Upgrade', color: '#c084fc' },
  ];
  return types
    .map(t => ({
      ...t,
      value: deckListForDisplay.filter(card => card.type === t.name).reduce((sum, card) => sum + card.quantity, 0),
    }))
    .filter(item => item.value > 0);
};

const DeckStatsContent = ({ deckStats, deckListForDisplay, activeChartView }) => (
  <div className="text-xs h-48 sm:h-56 lg:h-72">
    {activeChartView === 'cost' && (
      <ChartPanel title="Card Cost Distribution">
        <StatBarChart data={deckStats.barChartData} barLabel="Card Count" />
      </ChartPanel>
    )}
    {activeChartView === 'type' && (
      <ChartPanel title="Card Type Distribution">
        <StatPieChart data={buildTypeDistribution(deckListForDisplay)} colorSource="entry" outerRadius={80} showLegend />
      </ChartPanel>
    )}
    {activeChartView === 'ability' && (
      <ChartPanel title="Ability Breakdown">
        <StatPieChart data={deckStats.pieChartData} labelRenderer={renderCustomizedLabel} />
      </ChartPanel>
    )}
  </div>
);

// --- Drone Statistics ---

const DroneStatsContent = ({ droneStats, activeChartView }) => (
  <div className="text-xs h-48 sm:h-56 lg:h-72">
    {DRONE_BAR_CHARTS.map(chart => (
      activeChartView === chart.key && (
        <ChartPanel key={chart.key} title={chart.title}>
          <StatBarChart data={droneStats[chart.dataKey]} barColor={chart.color} barLabel="Drone Count" />
        </ChartPanel>
      )
    ))}
    {activeChartView === 'ability' && (
      <ChartPanel title="Ability Breakdown">
        <StatPieChart data={droneStats.abilityData} />
      </ChartPanel>
    )}
  </div>
);

// --- Main Component ---

const DeckStatisticsCharts = ({
  rightPanelView,
  cardCount,
  droneCount,
  deckStats,
  droneStats,
  deckListForDisplay,
  activeChartView,
  setActiveChartView,
  isStatsVisible,
  setIsStatsVisible,
}) => {
  const isDeck = rightPanelView === 'deck' && cardCount > 0;
  const isDrones = rightPanelView === 'drones' && droneCount > 0;

  if (!isDeck && !isDrones) return null;

  const tabs = isDeck ? DECK_TABS : DRONE_TABS;
  const title = isDeck ? 'Deck Statistics' : 'Drone Statistics';
  const tabStyle = isDeck
    ? { fontSize: '12px', padding: '6px 12px' }
    : { fontSize: '11px', padding: '5px 10px' };
  const tabBarStyle = isDeck
    ? { justifyContent: 'center', borderBottom: 'none', marginBottom: '8px', paddingBottom: '8px' }
    : { justifyContent: 'center', borderBottom: 'none', marginBottom: '8px', paddingBottom: '8px', flexWrap: 'wrap' };

  return (
    <div className="dw-stats-section">
      <button
        onClick={() => setIsStatsVisible(!isStatsVisible)}
        className="dw-stats-toggle"
      >
        {title}
        <ChevronUp size={18} className={`dw-stats-toggle-icon ${!isStatsVisible ? 'dw-stats-toggle-icon--collapsed' : ''}`} />
      </button>

      <div className={`dw-stats-content ${isStatsVisible ? 'dw-stats-content--visible' : 'dw-stats-content--hidden'}`}>
        <div className="dw-modal-tabs" style={tabBarStyle}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveChartView(tab.key)}
              className={`dw-modal-tab ${activeChartView === tab.key ? 'dw-modal-tab--active' : ''}`}
              style={tabStyle}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isDeck && (
          <DeckStatsContent
            deckStats={deckStats}
            deckListForDisplay={deckListForDisplay}
            activeChartView={activeChartView}
          />
        )}
        {isDrones && (
          <DroneStatsContent
            droneStats={droneStats}
            activeChartView={activeChartView}
          />
        )}
      </div>
    </div>
  );
};

export default DeckStatisticsCharts;
