import React, { useState, useEffect, useRef } from 'react';
import { logger } from '../../utils/logger';
import { DEFAULT_CHART_CONFIG, REFRESH_INTERVAL } from '../../services/api/stock'; // Keep REFRESH_INTERVAL import for stock.js

// Import the new components
import ChartDisplay from './ChartDisplay';
import ErrorMessage from './ErrorMessage';
import StockSettingsSidebar from './StockSettingsSidebar';

// Constants for configuration
// Default panel placement for each indicator
const DEFAULT_PANEL_PLACEMENT = {
  'SMA': 'main',
  'EMA': 'main',
  'Bollinger Bands': 'main',
  'VWAP': 'main',
  'Ichimoku Cloud': 'main',
  'RSI': 'oscillator',
  'Stochastic Oscillator': 'oscillator',
  'MACD': 'macd',
  'ATR': 'volatility',
  'OBV': 'volume'
};

// Default indicator parameters
const DEFAULT_INDICATOR_PARAMS = {
  'SMA': { window: 20 },
  'EMA': { window: 20 },
  'Bollinger Bands': { window: 20, std_dev: 2 },
  'RSI': { window: 14 },
  'MACD': { fast_window: 12, slow_window: 26, signal_window: 9 },
  'ATR': { window: 14 },
  'Stochastic Oscillator': { k_window: 14, d_window: 3 },
  'Ichimoku Cloud': { conversion_period: 9, base_period: 26, lagging_span_b_period: 52 }
  // VWAP and OBV don't have configurable parameters
};

// Styling constants
const CONTAINER_BG_COLOR = '#1B1610';
const TEXT_COLOR = '#fff';


/**
 * Generates a simple unique ID for component instance tracking
 * @returns {string} A unique identifier for the component instance
 */
const generateInstanceId = () => {
  return 'chart-' + Math.random().toString(36).substring(2, 9);
};

/**
 * StockChart component for displaying stock charts with technical indicators.
 * Acts as the main container orchestrating the form, indicator panel, and chart display.
 *
 * @param {Object} props Component props
 * @param {Function} props.onTickerChange Callback function when ticker changes
 * @param {Function} props.onErrorChange Callback function when chart error state changes
 * @param {Object} props.chartData The chart data to display.
 * @param {boolean} props.loading Whether the chart data is loading.
 * @param {string} props.error The error message, if any.
 */
const StockChart = ({ settings, onSettingsChange, onTickerChange, onErrorChange, chartData, loading, error }) => {
  // Create a unique instance ID for this component
  const instanceId = useRef(generateInstanceId());

  // State for indicator configurations
  const [indicatorConfigs, setIndicatorConfigs] = useState({});
  // State for panel assignments
  const [panelAssignments, setPanelAssignments] = useState({});
  // State for settings sidebar visibility
  const [isSettingsSidebarOpen, setIsSettingsSidebarOpen] = useState(false);
  // Ref to keep track of the previous chart while loading new one
  const prevChartRef = useRef(null);
  // New state to track chart updates (used to signal KPI container to update)
  const [chartUpdateTimestamp, setChartUpdateTimestamp] = useState(Date.now());

  // Initialize the ticker change callback with the default ticker
  useEffect(() => {
    if (onTickerChange && typeof onTickerChange === 'function') {
      logger.debug(`StockChart ticker initialized to: ${settings.ticker}`);
    }
  }, [onTickerChange, settings.ticker]);

  // Notify parent component about error state changes
  useEffect(() => {
    if (onErrorChange && typeof onErrorChange === 'function') {
      onErrorChange(error !== null);
    }
  }, [error, onErrorChange]);

  // Log when component mounts and unmounts
  useEffect(() => {
    logger.debug(`StockChart component mounted (instance: ${instanceId.current})`);
    return () => {
      logger.debug(`StockChart component unmounting (instance: ${instanceId.current})`);
    };
  }, []);

  //useEffect to set previous chart ref.
  useEffect(() => {
    if (chartData) {
      prevChartRef.current = chartData;
    }
  }, [chartData]);

  //useEffect to set timestamp for the Kpi Container
  useEffect(() => {
    setChartUpdateTimestamp(Date.now());
  }, [chartData]);

  /**
   * Handles form input changes
   * @param {Object} e - Event object
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    onSettingsChange(prev => ({ ...prev, [name]: value }));
    logger.debug(`Config ${name} changed to ${value}`);

  };

  /**
   * Checks if an indicator is selected in the current configuration
   * @param {string} indicatorName - Name of the indicator to check
   * @returns {boolean} Whether the indicator is currently selected
   */
  const isIndicatorSelected = (indicatorName) => {
    return settings.indicators.some(ind =>
      typeof ind === 'string' ? ind === indicatorName : ind.name === indicatorName
    );
  };

  /**
   * Handles indicator selection/deselection
   * @param {Object} e - Event object
   */
  const handleIndicatorChange = (e) => {
    const indicatorName = e.target.value;
    const selected = isIndicatorSelected(indicatorName);

    // Create state update objects
    let newIndicators;
    let newConfigs = { ...indicatorConfigs };
    let newPanelAssignments = { ...panelAssignments };

    if (selected) {
      // Remove the indicator
      newIndicators = removeIndicator(indicatorName);

      // Also remove from configurations and panel assignments
      delete newConfigs[indicatorName];
      delete newPanelAssignments[indicatorName];
    } else {
      // Add the indicator
      [newIndicators, newConfigs, newPanelAssignments] = addIndicator(
        indicatorName,
        newConfigs,
        newPanelAssignments
      );
    }

    // Batch the state updates to reduce re-renders
    setIndicatorConfigs(newConfigs);
    setPanelAssignments(newPanelAssignments);
    onSettingsChange(prev => {
      const updatedConfig = { ...prev, indicators: newIndicators };
      logger.debug(`Indicators updated: ${newIndicators.map(ind =>
        typeof ind === 'string' ? ind : ind.name).join(', ')}`);
      return updatedConfig;
    });
  };

  /**
   * Removes an indicator from the configuration
   * @param {string} indicatorName - Name of the indicator to remove
   * @returns {Array} Updated list of indicators
   */
  const removeIndicator = (indicatorName) => {
    return settings.indicators.filter(ind =>
      typeof ind === 'string' ? ind !== indicatorName : ind.name !== indicatorName
    );
  };

  /**
   * Adds an indicator to the configuration with appropriate defaults
   * @param {string} indicatorName - Name of the indicator to add
   * @param {Object} configs - Current indicator configurations
   * @param {Object} assignments - Current panel assignments
   * @returns {Array} [newIndicators, newConfigs, newAssignments]
   */
  const addIndicator = (indicatorName, configs, assignments) => {
    // Set default panel assignment
    assignments[indicatorName] = DEFAULT_PANEL_PLACEMENT[indicatorName] || 'main';

    // Check if this indicator has configurable parameters
    if (indicatorName in DEFAULT_INDICATOR_PARAMS) {
      // Create a new configuration object with default values
      const defaultParams = DEFAULT_INDICATOR_PARAMS[indicatorName];
      configs[indicatorName] = { ...defaultParams };

      // Add to indicators list as an object with name
      return [
        [...settings.indicators, { name: indicatorName }],
        configs,
        assignments
      ];
    } else {
      // Add simple string for indicators without parameters
      return [
        [...settings.indicators, indicatorName],
        configs,
        assignments
      ];
    }
  };

  /**
   * Handles parameter change for indicators
   * @param {string} indicatorName - Name of the indicator
   * @param {string} paramName - Name of the parameter
   * @param {string|number} value - New parameter value
   */
  const handleParamChange = (indicatorName, paramName, value) => {
    // Convert string value to number if applicable
    const numericValue = Number(value);

    // Create updated configurations
    const newConfigs = {
      ...indicatorConfigs,
      [indicatorName]: {
        ...indicatorConfigs[indicatorName],
        [paramName]: numericValue
      }
    };

    // Create updated indicators array with the new parameter value
    const newIndicators = settings.indicators.map(ind => {
      if (typeof ind === 'object' && ind.name === indicatorName) {
        return { name: indicatorName, ...newConfigs[indicatorName] };
      }
      return ind;
    });

    logger.debug(`Updated ${paramName} for ${indicatorName} to ${value}`);

    // Batch updates to minimize renders
    setIndicatorConfigs(newConfigs);
    onSettingsChange(prev => ({
      ...prev,
      indicators: newIndicators
    }));
  };

  /**
   * Handles panel assignment change for indicators
   * @param {string} indicatorName - Name of the indicator
   * @param {string} panelName - Name of the panel
   */
  const handlePanelChange = (indicatorName, panelName) => {
    // Create new assignments with updated panel
    const newAssignments = {
      ...panelAssignments,
      [indicatorName]: panelName
    };

    logger.debug(`Updated panel for ${indicatorName} to ${panelName}`);
    setPanelAssignments(newAssignments);
  };

  /**
   * Prepares indicator configuration for API request
   * @param {Array} indicators - List of indicators from current config
   * @returns {Array} Formatted indicators with proper panel assignments and parameters
   */
  const prepareIndicatorsForRequest = (indicators) => {
    return indicators.map(ind => {
      const indicatorName = typeof ind === 'string' ? ind : ind.name;

      // Set up base configuration with panel assignment
      const indicatorConfig = {
        name: indicatorName,
        panel: panelAssignments[indicatorName] ||
               DEFAULT_PANEL_PLACEMENT[indicatorName] ||
               'main'
      };

      // For indicators with parameters, add them to the config
      if (typeof ind !== 'string' && indicatorConfigs[indicatorName]) {
        // Ensure all parameter values are numbers, not strings
        Object.entries(indicatorConfigs[indicatorName]).forEach(([key, value]) => {
          indicatorConfig[key] = typeof value === 'string' && !isNaN(value)
            ? Number(value)
            : value;
        });
      }

      return indicatorConfig;
    });
  };



  /**
   * Handle form submission for ticker/time period changes
   * @param {Object} e - Event object
   */
    const handleSubmit = (e) => {
        e.preventDefault();
        const newTicker = settings.ticker;
        logger.info(`Submitting new configuration with ticker: ${newTicker}`);

        // Call onTickerChange to notify the parent component
        if (onTickerChange && typeof onTickerChange === 'function') {
            onTickerChange(newTicker);
        }
    };

  /**
   * Toggle settings sidebar visibility
   */
  const toggleSettingsSidebar = () => {
    const newState = !isSettingsSidebarOpen;
    setIsSettingsSidebarOpen(newState);
    logger.debug(`Settings sidebar toggled: ${newState ? 'open' : 'closed'}`);
  };

  return (
    <div className="stock-chart-container">
      <h2>Stock Chart Analysis</h2>

      {/* Error Message - only display once at the top level */}
      {error && <ErrorMessage message={error} />}

      {/* Main chart area with error handling */}
      <div className="chart-area">
        {error ? (
          <div className="placeholder-message">
            Please correct the error above to load the chart.
          </div>
        ) : (
          <>
            <ChartDisplay
              chartData={chartData}
              isLoading={loading}
              prevChartData={prevChartRef.current}
            />
          </>
        )}
      </div>

      {/* Stock Settings Sidebar */}
      <StockSettingsSidebar
        isOpen={isSettingsSidebarOpen}
        toggleSidebar={toggleSettingsSidebar}
        settings={settings}
        onSettingsChange={onSettingsChange}
        isLoading={loading}
        indicatorConfigs={indicatorConfigs}
        panelAssignments={panelAssignments}
        onParamChange={handleParamChange}
        onPanelChange={handlePanelChange}
      />

      <style jsx>{`
        .stock-chart-container {
          padding: 20px;
          background-color: ${CONTAINER_BG_COLOR};
          border-radius: 8px;
          margin: 20px 0;
          color: ${TEXT_COLOR};
          position: relative; /* For proper positioning of sidebar toggle button */
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

export default StockChart;