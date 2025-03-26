// StockChart.js

// ---------------------------------------------------------------------
// Import Statements: Import React, logging utilities, and child components.
// ---------------------------------------------------------------------
import React, { useState, useEffect, useRef } from 'react';
import { logger } from '../../utils/logger';

// Import child components
// ChartDisplay: Displays the chart; receives chart data and update callback.
// ErrorMessage: Renders any error messages.
// StockSettingsSidebar: Displays the sidebar with settings; receives settings data and callback functions.
import ChartDisplay from './ChartDisplay';
import ErrorMessage from './ErrorMessage';
import StockSettingsSidebar from './StockSettingsSidebar';

// ---------------------------------------------------------------------
// Constants: Define styling.
// ---------------------------------------------------------------------


const CONTAINER_BG_COLOR = '#1B1610';
const TEXT_COLOR = '#fff';

// ---------------------------------------------------------------------
// Utility Functions: Helper functions used within this file.
// ---------------------------------------------------------------------
/**
 * Generates a simple unique ID for component instance tracking.
 * @returns {string} A unique identifier for the component instance.
 */
const generateInstanceId = () => {
  return 'chart-' + Math.random().toString(36).substring(2, 9);
};

// ---------------------------------------------------------------------
// StockChart Component: Main container component for displaying stock charts.
// This component receives props from the parent and passes data and functions
// down to child components.
// ---------------------------------------------------------------------
/**
 * StockChart component for displaying stock charts with technical indicators.
 *
 * Props Received:
 * - settings: Object containing current settings (e.g., ticker, indicators).
 * - onSettingsChange: Callback for updating settings.
 * - onTickerChange: Callback when the ticker changes.
 * - onErrorChange: Callback when an error occurs.
 * - chartData: Object containing chart data.
 * - loading: Boolean indicating if data is loading.
 * - error: Error message string.
 * - onUpdateClick: Callback to trigger chart data update.
 */
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

  // ---------------------------------------------------------------------
  // Refs and State: Declare refs and state variables for internal use.
  // ---------------------------------------------------------------------
  // Unique instance ID for logging and tracking
  const instanceId = useRef(generateInstanceId());


  // State to control visibility of the settings sidebar (passed to StockSettingsSidebar)
  const [isSettingsSidebarOpen, setIsSettingsSidebarOpen] = useState(false);

  // Ref to store previous chart data (used for smooth updates in ChartDisplay)
  const prevChartRef = useRef(null);

  // ---------------------------------------------------------------------
  // useEffect Hooks (Lifecycle): Handle component lifecycle events,
  // log changes, and invoke callbacks as needed.
  // ---------------------------------------------------------------------
  // On mount and unmount, log initial props and lifecycle events.
  useEffect(() => {
    logger.debug(`StockChart: component mounted (instance: ${instanceId.current})`);
    logger.debug('StockChart: Initial props from:', { settings, chartData, loading, error });
    return () => {
      logger.debug(`StockChart: component unmounting (instance: ${instanceId.current})`);
    };
  }, []);

  useEffect(() => {
    logger.debug(`StockChart: settings passed down from index.js component:`, settings);
    logger.debug(`StockChart: dashboardData passed down from index.js component:`, dashboardData);  
  }, [settings, dashboardData]);

  // Log changes in chartData
  useEffect(() => {
    logger.debug(`StockChart: ChartData updated (instance: ${instanceId.current}):`, chartData);
  }, [chartData]);

  // Log changes in loading state
  useEffect(() => {
    logger.debug(`StockChart: Loading state changed (instance: ${instanceId.current}):`, loading);
  }, [loading]);

  // Log changes in error state
  useEffect(() => {
    logger.debug(`StockChart: Error state changed (instance: ${instanceId.current}):`, error);
  }, [error]);

  // Invoke onTickerChange callback when the ticker changes (prop received from parent)
  useEffect(() => {
    if (onTickerChange && typeof onTickerChange === 'function') {
      logger.debug(`StockChart: ticker initialized to: ${settings.ticker}`);
    }
  }, [onTickerChange, settings.ticker]);

  // Notify parent about error state changes via onErrorChange callback (prop received from parent)
  useEffect(() => {
    if (onErrorChange && typeof onErrorChange === 'function') {
      onErrorChange(error !== null);
    }
  }, [error, onErrorChange]);

  // Update previous chart data ref when chartData changes (internal usage for ChartDisplay)
  useEffect(() => {
    if (chartData) {
      logger.debug(`StockChart: Updating prevChartRef with new chartData (instance: ${instanceId.current})`);
      prevChartRef.current = chartData;
    }
  }, [chartData]);


  /**
   * Toggles the visibility of the settings sidebar.
   *
   * Updates internal state controlling sidebar visibility and is passed down
   * to the StockSettingsSidebar component.
   */
  const toggleSettingsSidebar = () => {
    const newState = !isSettingsSidebarOpen;
    setIsSettingsSidebarOpen(newState);
    logger.debug(`StockChart: Settings sidebar toggled: ${newState ? 'open' : 'closed'}`);
  };

  // ---------------------------------------------------------------------
  // Render / Return JSX: Define the component's UI structure.
  // Data and callbacks are passed to child components as props.
  // ---------------------------------------------------------------------
  return (
    <div className="stock-chart-container">
      <h2>Stock Chart Analysis</h2>

      {/* Display error message if an error exists */}
      {error && <ErrorMessage message={error} />}

      {/* Main chart area: Renders ChartDisplay component or a placeholder message if an error exists */}
      <div className="chart-area">
        {error ? (
          <div className="placeholder-message">
            Please correct the error above to load the chart.
          </div>
        ) : (
          <>
            {logger.debug(`StockChart: Rendering ChartDisplay with data (instance: ${instanceId.current}):`, {
              chartData: chartData?.chart,
              isLoading: loading,
              prevChartData: prevChartRef.current?.chart
            })}
            <ChartDisplay
              chartData={chartData?.chart}
              isLoading={loading}
              prevChartData={prevChartRef.current?.chart}
              onUpdateClick={onUpdateClick}
            />
          </>
        )}
      </div>

      {/* Render StockSettingsSidebar and pass necessary data and callbacks */}
      <StockSettingsSidebar
        isOpen={isSettingsSidebarOpen}
        toggleSidebar={toggleSettingsSidebar}
        settings={settings}
        onSettingsChange={onSettingsChange}
        onUpdateClick={onUpdateClick}
      />

      {/* Inline JSX styling */}
      <style jsx>{`
        .stock-chart-container {
          padding: 20px;
          background-color: ${CONTAINER_BG_COLOR};
          border-radius: 8px;
          margin: 20px 0;
          color: ${TEXT_COLOR};
          position: relative;
        }

        .chart-area {
          width: 100%;
        }

        h2 {
          margin-bottom: 20px;
        }

        .placeholder-message {
          text-align: center;
          padding: 40px;
          background: rgba(0, 0, 0, 0.05);
          border-radius: 4px;
          margin: 20px 0;
        }
      `}</style>
    </div>
  );
};

// Export the StockChart component wrapped with React.memo for performance optimization.
export default React.memo(StockChart);
