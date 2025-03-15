import React, { useState, useEffect, useRef } from 'react';
import { logger } from '../../utils/logger';
import { fetchStockChart } from '../../services/api/stock';

// Import the new components
// import IndicatorConfigurationPanel from './IndicatorConfigurationPanel';
import ChartDisplay from './ChartDisplay';
import ErrorMessage from './ErrorMessage';
import StockSettingsSidebar from './StockSettingsSidebar';
// Import the KPI container component
import KpiContainer from './KpiContainer';

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

// Default configuration
const DEFAULT_CONFIG = {
  ticker: 'NVDA',
  days: 30,
  interval: '1h',
  indicators: [],
  chartType: 'candlestick'
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
 */
const StockChart = () => {
  // Create a unique instance ID for this component
  const instanceId = useRef(generateInstanceId());
  
  // State for form controls
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // State for the chart data
  const [chartData, setChartData] = useState(null);
  
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
  
  // Load initial chart on component mount
  useEffect(() => {
    logger.debug(`StockChart component mounted (instance: ${instanceId.current}), loading initial chart`);
    loadChart(DEFAULT_CONFIG);
    
    // Clean up when component unmounts
    return () => {
      logger.debug(`StockChart component unmounting (instance: ${instanceId.current})`);
    };
  }, []);
  
  // Automatically reload chart when configuration changes
  useEffect(() => {
    // Skip the initial render
    if (config === DEFAULT_CONFIG) return;
    
    // Use a debounce to prevent too many requests
    const handler = setTimeout(() => {
      logger.debug('Config changed, reloading chart');
      loadChart(config);
    }, 500); // 500ms debounce
    
    // Clean up timeout
    return () => clearTimeout(handler);
  }, [config]); // Re-run when config changes
  
  /**
   * Handles form input changes
   * @param {Object} e - Event object
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
    logger.debug(`Config ${name} changed to ${value}`);
  };
  
  /**
   * Checks if an indicator is selected in the current configuration
   * @param {string} indicatorName - Name of the indicator to check
   * @returns {boolean} Whether the indicator is currently selected
   */
  const isIndicatorSelected = (indicatorName) => {
    return config.indicators.some(ind => 
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
    setConfig(prev => {
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
    return config.indicators.filter(ind => 
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
        [...config.indicators, { name: indicatorName }],
        configs,
        assignments
      ];
    } else {
      // Add simple string for indicators without parameters
      return [
        [...config.indicators, indicatorName],
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
    const newIndicators = config.indicators.map(ind => {
      if (typeof ind === 'object' && ind.name === indicatorName) {
        return { name: indicatorName, ...newConfigs[indicatorName] };
      }
      return ind;
    });
    
    logger.debug(`Updated ${paramName} for ${indicatorName} to ${value}`);
    
    // Batch updates to minimize renders
    setIndicatorConfigs(newConfigs);
    setConfig(prev => ({
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
   * Process API error and generate a user-friendly message
   * @param {Error} err - Error from API call
   * @returns {string} Formatted error message
   */
  const processApiError = (err) => {
    const errorMessage = err.message || 'Unknown error';
    
    // Check for "No data found for ticker" errors
    if (errorMessage.includes('No data found for ticker')) {
      const ticker = config.ticker.toUpperCase();
      return `No data found for ticker "${ticker}". Please check if the ticker symbol is correct or try another one.`;
    } 
    
    // Check if it's an API error with more details
    if (errorMessage.includes('Error processing request') || 
        errorMessage.includes('Validation Error')) {
      logger.error('API Error Details:', err);
      
      // Extract specific error about indicator configuration
      if (errorMessage.includes('IndicatorConfig')) {
        return 'Error with indicator configuration. Please check the parameters and try again.';
      }
    }
    
    return errorMessage;
  };
  
  /**
   * Load chart data from API
   * @param {Object} chartConfig - Current chart configuration
   */
  const loadChart = async (chartConfig) => {
    setIsLoading(true);
    setError(null);
    
    // Store current chart for display while loading
    if (chartData) {
      prevChartRef.current = chartData.chart;
    }
    
    try {
      logger.info(`Loading chart for ${chartConfig.ticker} with ${chartConfig.indicators.length} indicators (instance: ${instanceId.current})`);
      
      // Prepare configuration with processed indicators
      const configToSend = {
        ...chartConfig,
        indicators: prepareIndicatorsForRequest(chartConfig.indicators)
      };
      
      logger.debug(`Sending chart configuration (instance: ${instanceId.current}):`, configToSend);
      
      const data = await fetchStockChart(configToSend);
      setChartData(data);
      
      // Update timestamp to trigger KPI refresh
      setChartUpdateTimestamp(Date.now());
      
      logger.info(`Chart data loaded successfully (instance: ${instanceId.current})`);
    } catch (err) {
      const errorMessage = processApiError(err);
      setError(errorMessage);
      logger.error(`Failed to load chart (instance: ${instanceId.current}): ${errorMessage}`);
      
      // Set chartData to null to prevent displaying incorrect chart
      setChartData(null);
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Handle form submission for ticker/time period changes
   * @param {Object} e - Event object
   */
  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    logger.info('Submitting new configuration');
    loadChart(config);
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
      
      {/* Error Message */}
      <ErrorMessage message={error} />
      
      {/* Main chart area with error handling */}
      <div className="chart-area">
        {error ? (
          <ErrorMessage message={error} />
        ) : (
          <>
            <ChartDisplay 
              chartData={chartData?.chart} 
              isLoading={isLoading}
              prevChartData={prevChartRef.current}
              onUpdate={handleSubmit}
            />
            
            {/* KPI Container */}
            {chartData && (
              <KpiContainer 
                ticker={config.ticker} 
                onTickerChange={(newTicker) => {
                  setConfig(prev => ({ ...prev, ticker: newTicker }));
                  loadChart({ ...config, ticker: newTicker });
                }}
                forceUpdate={chartUpdateTimestamp}
              />
            )}
          </>
        )}
      </div>
      
      {/* Stock Settings Sidebar */}
      <StockSettingsSidebar
        isOpen={isSettingsSidebarOpen}
        toggleSidebar={toggleSettingsSidebar}
        config={config}
        onInputChange={handleInputChange}
        onIndicatorChange={handleIndicatorChange}
        onSubmit={handleSubmit}
        isLoading={isLoading}
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
      `}</style>
    </div>
  );
};

export default StockChart; 