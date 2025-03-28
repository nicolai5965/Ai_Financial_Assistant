// StockChart.js

// ---------------------------------------------------------------------
// Import Statements
// ---------------------------------------------------------------------
import React, { useState, useEffect, useRef } from 'react';
import { logger } from '../../utils/logger';
import ChartDisplay from './ChartDisplay';
import ErrorMessage from './ErrorMessage';
import StockSettingsSidebar from './StockSettingsSidebar';

// ---------------------------------------------------------------------
// Configuration Constants
// ---------------------------------------------------------------------

// --- Colors ---
const COLORS = {
  CONTAINER_BG: '#1B1610',
  TEXT_PRIMARY: '#fff',
  LIGHT_GRAY: '#f8f8f8',
  ERROR_PLACEHOLDER_BG: 'rgba(0, 0, 0, 0.05)',
};

// ---------------------------------------------------------------------
// Utility Functions
// ---------------------------------------------------------------------
const generateInstanceId = () => {
  return 'chart-' + Math.random().toString(36).substring(2, 9);
};

// ---------------------------------------------------------------------
// StockChart Component
// ---------------------------------------------------------------------
const StockChart = ({
  settings,
  onSettingsChange,
  onTickerChange,
  onErrorChange,
  chartData,
  loading,
  error,
  dashboardData,
  onUpdateClick
}) => {

  // Refs and State
  const instanceId = useRef(generateInstanceId());
  const [isSettingsSidebarOpen, setIsSettingsSidebarOpen] = useState(false);
  const prevChartRef = useRef(null);

  // useEffect Hooks
  useEffect(() => { logger.debug(`StockChart: mounted (instance: ${instanceId.current})`); return () => { logger.debug(`StockChart: unmounting (instance: ${instanceId.current})`); }; }, []);
  useEffect(() => { logger.debug(`StockChart: error state changed: ${error}`); if (onErrorChange) { onErrorChange(error !== null); } }, [error, onErrorChange]);
  useEffect(() => { if (chartData) { prevChartRef.current = chartData; } }, [chartData]);

  // Event Handlers
  const toggleSettingsSidebar = () => { setIsSettingsSidebarOpen(prev => !prev); logger.debug(`StockChart: Settings sidebar toggled`); };

  // Render / Return JSX
  return (
    <div className="stock-chart-container">
      {error && <ErrorMessage message={error} />}

      <div className="chart-area">
        {error ? (
          <div className="placeholder-message">
            Please select a valid stock ticker or adjust settings to load the chart.
          </div>
        ) : (
          <ChartDisplay
            chartData={chartData?.chart}
            isLoading={loading}
            prevChartData={prevChartRef.current?.chart}
            onUpdateClick={onUpdateClick}
          />
        )}
      </div>

      <StockSettingsSidebar
        isOpen={isSettingsSidebarOpen}
        toggleSidebar={toggleSettingsSidebar}
        settings={settings}
        onSettingsChange={onSettingsChange}
        onUpdateClick={onUpdateClick}
      />

      <style jsx>{`
        /* Apply box-sizing */
        .stock-chart-container,
        .chart-area,
        .placeholder-message {
            box-sizing: border-box;
        }

        .stock-chart-container {
          padding: 20px;
          background-color: ${COLORS.CONTAINER_BG};
          border-radius: 8px;
          margin: 20px 0;
          color: ${COLORS.TEXT_PRIMARY};
          position: relative;
        }

        .chart-area {
          width: 100%;
          min-height: 300px;
          position: relative;
        }

        .placeholder-message {
          text-align: center;
          padding: 40px;
          background: ${COLORS.ERROR_PLACEHOLDER_BG};
          color: ${COLORS.LIGHT_GRAY};
          border-radius: 4px;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: calc(100% - 40px);
        }

        /* Removed media query specific to header h2 */
      `}</style>
    </div>
  );
};

export default React.memo(StockChart);