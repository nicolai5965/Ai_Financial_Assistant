import React, { useState, useEffect, useRef } from 'react';
import { logger } from '../../utils/logger';
import { fetchStockChart, DEFAULT_CHART_CONFIG, REFRESH_INTERVAL } from '../../services/api/stock';

// Import the new components
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

// Styling constants
const CONTAINER_BG_COLOR = '#1B1610';
const TEXT_COLOR = '#fff';
const AUTO_REFRESH_NOTIF_BG = 'rgba(92, 230, 207, 0.2)';
const AUTO_REFRESH_NOTIF_BORDER = 'rgba(92, 230, 207, 0.7)';
const AUTO_REFRESH_NOTIF_TEXT = '#fff';

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
 */
const StockChart = ({ onTickerChange, onErrorChange }) => {
  // Create a unique instance ID for this component
  const instanceId = useRef(generateInstanceId());
  
  // State for form controls
  const [config, setConfig] = useState(DEFAULT_CHART_CONFIG);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Add new state for the currently displayed ticker (separate from config.ticker)
  const [displayedTicker, setDisplayedTicker] = useState(DEFAULT_CHART_CONFIG.ticker);
  
  // State for the chart data
  const [chartData, setChartData] = useState(null);
  
  // State for indicator configurations
  const [indicatorConfigs, setIndicatorConfigs] = useState({});
  
  // State for panel assignments
  const [panelAssignments, setPanelAssignments] = useState({});
  
  // State for settings sidebar visibility
  const [isSettingsSidebarOpen, setIsSettingsSidebarOpen] = useState(false);
  
  // Add state for the auto-refresh notification
  const [showAutoRefreshNotif, setShowAutoRefreshNotif] = useState(false);
  
  // Ref to keep track of the previous chart while loading new one
  const prevChartRef = useRef(null);
  
  // New state to track chart updates (used to signal KPI container to update)
  const [chartUpdateTimestamp, setChartUpdateTimestamp] = useState(Date.now());
  
  // Add refresh timer reference and interval setting
  const refreshTimerRef = useRef(null);
  const DEFAULT_REFRESH_INTERVAL = REFRESH_INTERVAL * 60 * 1000; // convert to milliseconds
  // Also add a ref for the current config to avoid stale closures in the timer
  const configRef = useRef(config);
  
  // Update configRef whenever config changes
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // Initialize the ticker change callback with the default ticker
  useEffect(() => {
    if (onTickerChange && typeof onTickerChange === 'function') {
      // Only update the parent if we need to - this avoids unnecessary API calls
      // during initialization. The parent already has a default (AAPL) so we only
      // need to call this if our default ticker is different, which it no longer is
      // since we changed it to match.
      //onTickerChange(DEFAULT_CHART_CONFIG.ticker);
      
      // Instead, just log that we're initialized
      logger.debug(`StockChart ticker initialized to: ${DEFAULT_CHART_CONFIG.ticker}`);
    }
  }, [onTickerChange]);

  // Notify parent component about error state changes
  useEffect(() => {
    if (onErrorChange && typeof onErrorChange === 'function') {
      onErrorChange(error !== null);
    }
  }, [error, onErrorChange]);

  // Load initial chart on component mount and set up auto-refresh
  useEffect(() => {
    logger.debug(`StockChart component mounted (instance: ${instanceId.current}), loading initial chart`);
    loadChart(DEFAULT_CHART_CONFIG);
    
    // Set up the auto-refresh timer
    setupRefreshTimer();
    
    // Clean up when component unmounts
    return () => {
      logger.debug(`StockChart component unmounting (instance: ${instanceId.current})`);
      // Clear the refresh timer when component unmounts
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);
  
  /**
   * Sets up or resets the auto-refresh timer
   */
  const setupRefreshTimer = () => {
    // Clear any existing timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    
    // Set a new timer
    refreshTimerRef.current = setTimeout(() => {
      logger.debug(`Auto-refresh timer triggered, reloading chart (instance: ${instanceId.current})`);
      // Log the ticker to make it clear we're using the current config
      logger.info(`AUTO-REFRESH: Reloading chart for ${configRef.current.ticker} at ${new Date().toLocaleTimeString()}`);
      // Use the current config from the ref to avoid stale closure issues
      loadChart(configRef.current, true); // Pass true to indicate this is an auto-refresh
      // Reset the timer after refresh
      setupRefreshTimer();
    }, DEFAULT_REFRESH_INTERVAL);
    
    logger.debug(`Auto-refresh timer set for ${DEFAULT_REFRESH_INTERVAL/1000} seconds from ${new Date().toLocaleTimeString()}`);
  };
  
  /**
   * Handles form input changes
   * @param {Object} e - Event object
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
    logger.debug(`Config ${name} changed to ${value}`);
    
    // Remove the premature ticker update - only update ticker when chart is actually updated
    // if (name === 'ticker' && onTickerChange && typeof onTickerChange === 'function') {
    //   onTickerChange(value);
    // }
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
   * Load chart data from API
   * @param {Object} chartConfig - Current chart configuration
   * @param {boolean} isAutoRefresh - Whether this is an automatic refresh
   */
  const loadChart = async (chartConfig, isAutoRefresh = false) => {
    setIsLoading(true);
    setError(null);
    
    // Notify parent of error state change (no error when starting load)
    if (onErrorChange && typeof onErrorChange === 'function') {
      onErrorChange(false);
    }
    
    // Store current chart for display while loading
    if (chartData) {
      prevChartRef.current = chartData.chart;
    }
    
    logger.info(`Loading chart for ${chartConfig.ticker} with ${chartConfig.indicators.length} indicators (instance: ${instanceId.current})`);
    
    // Prepare configuration with processed indicators
    const configToSend = {
      ...chartConfig,
      indicators: prepareIndicatorsForRequest(chartConfig.indicators)
    };
    
    logger.debug(`Sending chart configuration (instance: ${instanceId.current}):`, configToSend);
    
    // Get response from API (might contain data or error)
    const response = await fetchStockChart(configToSend);
    
    // Check if the response contains an error
    if (response.error) {
      // Log the error
      logger.error(`Error details (instance: ${instanceId.current}):`, response);
      
      // Process the error message to make it user-friendly
      const errorMessage = processErrorMessage(response);
      
      // Set the error state
      setError(errorMessage);
      logger.error(`Failed to load chart (instance: ${instanceId.current}): ${errorMessage}`);
      
      // Set chartData to null to prevent displaying incorrect chart
      setChartData(null);
      
      // Notify parent of error state change
      if (onErrorChange && typeof onErrorChange === 'function') {
        onErrorChange(true);
      }
    } else {
      // Successfully got chart data
      setChartData(response);
      
      // Update the displayed ticker to match what's now shown on the chart
      // This is key for ensuring other components only update when chart updates
      setDisplayedTicker(chartConfig.ticker);
      
      // Only call onTickerChange when the displayed ticker actually changes
      if (chartConfig.ticker !== displayedTicker && onTickerChange && typeof onTickerChange === 'function') {
        onTickerChange(chartConfig.ticker);
      }
      
      // Update timestamp to trigger KPI refresh
      setChartUpdateTimestamp(Date.now());
      
      logger.info(`Chart data loaded successfully (instance: ${instanceId.current})`);
      
      // Show auto-refresh notification if this was an auto-refresh
      if (isAutoRefresh) {
        setShowAutoRefreshNotif(true);
        // Hide notification after 3 seconds
        setTimeout(() => {
          setShowAutoRefreshNotif(false);
        }, 3000);
      }
      
      // Notify parent of error state change (no error on success)
      if (onErrorChange && typeof onErrorChange === 'function') {
        onErrorChange(false);
      }
    }
    
    // Reset the auto-refresh timer whenever a chart is loaded (manual or auto)
    setupRefreshTimer();
    
    setIsLoading(false);
  };
  
  /**
   * Process error message from API response
   * @param {Object} errorResponse - Error response from API
   * @returns {string} User-friendly error message
   */
  const processErrorMessage = (errorResponse) => {
    const errorMessage = errorResponse.message || 'Unknown error';
    const ticker = errorResponse.ticker ? errorResponse.ticker.toUpperCase() : config.ticker.toUpperCase();
    
    // Check for "No data found for ticker" errors
    if (errorMessage.includes('No data found for ticker')) {
      return `No data found for ticker "${ticker}". Please check if the ticker symbol is correct or try another one.`;
    } 
    
    // Check if it's an API error with more details
    if (errorMessage.includes('Error processing request') || 
        errorMessage.includes('Validation Error')) {
      // Extract specific error about indicator configuration
      if (errorMessage.includes('IndicatorConfig')) {
        return 'Error with indicator configuration. Please check the parameters and try again.';
      }
      
      // Check if it might be a no data found error wrapped in a generic error
      if (errorMessage.toLowerCase().includes('no data') ||
          errorMessage.toLowerCase().includes('not found') ||
          errorMessage.toLowerCase().includes('404')) {
        return `No data found for ticker "${ticker}". Please check if the ticker symbol is correct or try another one.`;
      }
      
      // If we have a generic "Error processing request" with no other details
      if (errorMessage === 'Error processing request') {
        return `Unable to process your request. This may be due to an invalid ticker symbol or a temporary service issue. Please try a different ticker or try again later.`;
      }
    }
    
    return errorMessage;
  };
  
  // Maintain the old processApiError function for backward compatibility
  const processApiError = processErrorMessage;
  
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
      
      {/* Error Message - only display once at the top level */}
      {error && <ErrorMessage message={error} />}
      
      {/* Auto-refresh notification */}
      {showAutoRefreshNotif && (
        <div className="auto-refresh-notification">
          <div className="notification-icon">🔄</div>
          <div className="notification-text">Chart automatically refreshed at {new Date().toLocaleTimeString()}</div>
        </div>
      )}
      
      {/* Main chart area with error handling */}
      <div className="chart-area">
        {error ? (
          <div className="placeholder-message">
            Please correct the error above to load the chart.
          </div>
        ) : (
          <>
            <ChartDisplay 
              chartData={chartData?.chart} 
              isLoading={isLoading}
              prevChartData={prevChartRef.current}
              onUpdate={handleSubmit}
            />
            
            {/* KPI Container - pass displayedTicker instead of config.ticker */}
            {chartData && (
              <KpiContainer 
                ticker={displayedTicker} 
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
        lastAutoRefreshTime={showAutoRefreshNotif ? Date.now() : null}
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
        
        .auto-refresh-notification {
          display: flex;
          align-items: center;
          padding: 8px 16px;
          background-color: ${AUTO_REFRESH_NOTIF_BG};
          border: 1px solid ${AUTO_REFRESH_NOTIF_BORDER};
          border-radius: 4px;
          margin-bottom: 15px;
          color: ${AUTO_REFRESH_NOTIF_TEXT};
          animation: fadeInOut 3s;
          font-size: 14px;
        }
        
        .notification-icon {
          margin-right: 10px;
          font-size: 16px;
        }
        
        @keyframes fadeInOut {
          0% { opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default StockChart; 