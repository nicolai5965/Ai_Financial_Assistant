import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
const logger = require('../../utils/logger');
import { fetchStockChart } from '../../services/api/stock';

// Dynamically import Plot with no SSR to avoid server-side rendering issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

const AVAILABLE_INDICATORS = [
  { value: 'SMA', label: 'Simple Moving Average' },
  { value: 'EMA', label: 'Exponential Moving Average' },
  { value: 'Bollinger Bands', label: 'Bollinger Bands' },
  { value: 'VWAP', label: 'Volume Weighted Average Price' },
  { value: 'RSI', label: 'Relative Strength Index' },
  { value: 'MACD', label: 'Moving Average Convergence Divergence' },
  { value: 'ATR', label: 'Average True Range' },
  { value: 'OBV', label: 'On-Balance Volume' },
  { value: 'Stochastic Oscillator', label: 'Stochastic Oscillator' },
  { value: 'Ichimoku Cloud', label: 'Ichimoku Cloud' }
];

const INTERVALS = [
  { value: '1mo', label: 'Monthly' },  // Moved Monthly to the top
  { value: '1wk', label: 'Weekly' },    // Moved Weekly next
  { value: '1d', label: 'Daily' },      // Daily follows Weekly
  { value: '1h', label: 'Hourly' },     // Hourly comes next
  { value: '30m', label: 'Half-hourly' }, // Half-hourly follows Hourly
  { value: '15m', label: '15 Minutes' }, // 15 Minutes next
  { value: '5m', label: '5 Minutes' },   // 5 Minutes follows
  { value: '1m', label: '1 Minute' },    // 1 Minute at the end
];

const CHART_TYPES = [
  { value: 'candlestick', label: 'Candlestick' },
  { value: 'line', label: 'Line' },
];

// Define default parameters for each indicator type
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

// Input field type mapping for each parameter
const PARAM_INPUT_TYPES = {
  window: { type: 'number', min: 2, max: 200, step: 1 },
  std_dev: { type: 'number', min: 1, max: 4, step: 0.5 },
  fast_window: { type: 'number', min: 2, max: 50, step: 1 },
  slow_window: { type: 'number', min: 5, max: 100, step: 1 },
  signal_window: { type: 'number', min: 2, max: 50, step: 1 },
  k_window: { type: 'number', min: 2, max: 50, step: 1 },
  d_window: { type: 'number', min: 2, max: 20, step: 1 },
  conversion_period: { type: 'number', min: 2, max: 50, step: 1 },
  base_period: { type: 'number', min: 2, max: 100, step: 1 },
  lagging_span_b_period: { type: 'number', min: 2, max: 200, step: 1 },
};

// Define default panel placement for each indicator
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

// Panel options for the dropdown
const PANEL_OPTIONS = [
  { value: 'main', label: 'Main Price Chart' },
  { value: 'oscillator', label: 'Oscillator Panel (0-100)' },
  { value: 'macd', label: 'MACD Panel' },
  { value: 'volume', label: 'Volume Panel' },
  { value: 'volatility', label: 'Volatility Panel' }
];

// Default configuration
const DEFAULT_CONFIG = {
  ticker: 'NVDA',
  days: 30,
  interval: '1h',
  indicators: [],
  chartType: 'candlestick'
};

/**
 * StockChart component for displaying stock charts with technical indicators.
 */
const StockChart = () => {
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
  
  // Ref to keep track of the previous chart while loading new one
  const prevChartRef = useRef(null);
  
  // Load initial chart on component mount
  useEffect(() => {
    logger.debug('StockChart component mounted, loading initial chart');
    loadChart(DEFAULT_CONFIG);
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
  
  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
    logger.debug(`Config ${name} changed to ${value}`);
  };
  
  // Handle indicator selection
  const handleIndicatorChange = (e) => {
    const value = e.target.value;
    
    // Check if the indicator is already selected in current config
    const isSelected = config.indicators.some(ind => 
      typeof ind === 'string' ? ind === value : ind.name === value
    );
    
    // Create state update objects
    let newIndicators;
    let newConfigs = { ...indicatorConfigs };
    let newPanelAssignments = { ...panelAssignments };
    
    if (isSelected) {
      // Remove the indicator
      newIndicators = config.indicators.filter(ind => 
        typeof ind === 'string' ? ind !== value : ind.name !== value
      );
      
      // Also remove from configurations and panel assignments
      delete newConfigs[value];
      delete newPanelAssignments[value];
    } else {
      // Add the indicator with default config if it has parameters
      if (value in DEFAULT_INDICATOR_PARAMS) {
        // Create a new configuration object with default values
        const defaultParams = DEFAULT_INDICATOR_PARAMS[value];
        newConfigs[value] = { ...defaultParams };
        
        // Add to indicators list as an object with name
        newIndicators = [...config.indicators, { name: value }];
        
        // Set default panel assignment
        newPanelAssignments[value] = DEFAULT_PANEL_PLACEMENT[value] || 'main';
      } else {
        // Add simple string for indicators without parameters
        newIndicators = [...config.indicators, value];
        
        // Set default panel assignment
        newPanelAssignments[value] = DEFAULT_PANEL_PLACEMENT[value] || 'main';
      }
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
  
  // Handle parameter change for indicators
  const handleParamChange = (indicatorName, paramName, value) => {
    // Create new configs object
    const newConfigs = {
      ...indicatorConfigs,
      [indicatorName]: {
        ...indicatorConfigs[indicatorName],
        [paramName]: Number(value)
      }
    };
    
    // Create new indicators array for config
    const newIndicators = config.indicators.map(ind => {
      if (typeof ind === 'object' && ind.name === indicatorName) {
        return { name: indicatorName, ...newConfigs[indicatorName] };
      }
      return ind;
    });
    
    // Log once
    logger.debug(`Updated ${paramName} for ${indicatorName} to ${value}`);
    
    // Batch updates to minimize renders
    setIndicatorConfigs(newConfigs);
    setConfig(prev => ({
      ...prev,
      indicators: newIndicators
    }));
  };
  
  // Handle panel assignment change for indicators
  const handlePanelChange = (indicatorName, panelName) => {
    // Create new assignments object
    const newAssignments = {
      ...panelAssignments,
      [indicatorName]: panelName
    };
    
    // Log
    logger.debug(`Updated panel for ${indicatorName} to ${panelName}`);
    
    // Update panel assignments
    setPanelAssignments(newAssignments);
  };
  
  // Load chart data from API
  const loadChart = async (chartConfig) => {
    setIsLoading(true);
    setError(null);
    
    // Store current chart for display while loading
    if (chartData) {
      prevChartRef.current = chartData.chart;
    }
    
    try {
      logger.info(`Loading chart for ${chartConfig.ticker} with ${chartConfig.indicators.length} indicators`);
      
      // Apply the latest indicator configurations and panel assignments before sending
      const configToSend = {
        ...chartConfig,
        indicators: chartConfig.indicators.map(ind => {
          if (typeof ind === 'string') {
            // For simple string indicators, add panel assignment
            return {
              name: ind,
              panel: panelAssignments[ind] || DEFAULT_PANEL_PLACEMENT[ind] || 'main'
            };
          } else {
            const name = ind.name;
            // Ensure all parameter values are numbers, not strings
            const params = { 
              name,
              panel: panelAssignments[name] || DEFAULT_PANEL_PLACEMENT[name] || 'main'
            };
            
            if (indicatorConfigs[name]) {
              Object.entries(indicatorConfigs[name]).forEach(([key, value]) => {
                // Convert string values to numbers for numeric parameters
                if (typeof value === 'string' && !isNaN(value)) {
                  params[key] = Number(value);
                } else {
                  params[key] = value;
                }
              });
            }
            
            return params;
          }
        })
      };
      
      logger.debug('Sending chart configuration:', configToSend);
      
      const data = await fetchStockChart(configToSend);
      setChartData(data);
      logger.info('Chart data loaded successfully');
    } catch (err) {
      // Extract the most helpful error message
      let errorMessage = err.message || 'Unknown error';
      
      // Check if it's an API error with more details
      if (errorMessage.includes('Error processing request') || 
          errorMessage.includes('Validation Error')) {
        logger.error('API Error Details:', err);
        
        // Try to extract specific error about indicator configuration
        if (errorMessage.includes('IndicatorConfig')) {
          errorMessage = 'Error with indicator configuration. Please check the parameters and try again.';
        }
      }
      
      setError(errorMessage);
      logger.error(`Failed to load chart: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle form submission for ticker/time period changes
  const handleSubmit = (e) => {
    e.preventDefault();
    logger.info('Submitting new ticker/time period configuration');
    loadChart(config);
  };

  // Render parameter configuration panel for an indicator
  const renderParamConfig = (indicatorName) => {
    // If this indicator doesn't have configurable parameters, return nothing
    if (!(indicatorName in DEFAULT_INDICATOR_PARAMS)) {
      return null;
    }
    
    const params = indicatorConfigs[indicatorName] || DEFAULT_INDICATOR_PARAMS[indicatorName];
    
    return (
      <div className="parameter-config" key={`params-${indicatorName}`}>
        <h4>{indicatorName} Parameters</h4>
        <div className="parameter-config-container">
          <div className="parameter-inputs">
            {Object.entries(params).map(([paramName, defaultValue]) => {
              const inputConfig = PARAM_INPUT_TYPES[paramName] || { type: 'number', min: 1, max: 100 };
              
              return (
                <div className="param-input" key={`${indicatorName}-${paramName}`}>
                  <label htmlFor={`param-${indicatorName}-${paramName}`}>
                    {paramName.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').toLowerCase()}:
                  </label>
                  <input
                    id={`param-${indicatorName}-${paramName}`}
                    type={inputConfig.type}
                    min={inputConfig.min}
                    max={inputConfig.max}
                    step={inputConfig.step}
                    value={params[paramName]}
                    onChange={(e) => handleParamChange(indicatorName, paramName, e.target.value)}
                  />
                </div>
              );
            })}
          </div>
          
          <div className="panel-selection">
            <label htmlFor={`panel-${indicatorName}`}>
              Display in:
            </label>
            <select
              id={`panel-${indicatorName}`}
              value={panelAssignments[indicatorName] || DEFAULT_PANEL_PLACEMENT[indicatorName] || 'main'}
              onChange={(e) => handlePanelChange(indicatorName, e.target.value)}
            >
              {PANEL_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="stock-chart-container">
      <h2>Stock Chart Analysis</h2>
      
      {/* Configuration Form */}
      <form onSubmit={handleSubmit} className="stock-chart-form">
        <div className="form-group">
          <label htmlFor="ticker">Ticker Symbol:</label>
          <input
            type="text"
            id="ticker"
            name="ticker"
            value={config.ticker}
            onChange={handleInputChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="days">Days of History:</label>
          <input
            type="number"
            id="days"
            name="days"
            min="1"
            max="365"
            value={config.days}
            onChange={handleInputChange}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="interval">Interval:</label>
          <select 
            id="interval" 
            name="interval" 
            value={config.interval} 
            onChange={handleInputChange}
          >
            {INTERVALS.map(interval => (
              <option key={interval.value} value={interval.value}>
                {interval.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="chartType">Chart Type:</label>
          <select 
            id="chartType" 
            name="chartType" 
            value={config.chartType} 
            onChange={handleInputChange}
          >
            {CHART_TYPES.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label>Technical Indicators:</label>
          <div className="indicators-checkboxes">
            {AVAILABLE_INDICATORS.map(indicator => (
              <div key={indicator.value} className="indicator-checkbox">
                <input
                  type="checkbox"
                  id={`indicator-${indicator.value}`}
                  value={indicator.value}
                  checked={config.indicators.some(ind => 
                    typeof ind === 'string' ? ind === indicator.value : ind.name === indicator.value
                  )}
                  onChange={handleIndicatorChange}
                />
                <label htmlFor={`indicator-${indicator.value}`}>
                  {indicator.label}
                </label>
              </div>
            ))}
          </div>
        </div>
        
        {/* Indicator Parameter Configuration Panels */}
        {config.indicators.length > 0 && (
          <div className="indicator-parameters">
            <h3>Indicator Parameters</h3>
            {config.indicators
              .map(ind => typeof ind === 'string' ? ind : ind.name)
              .map(indicatorName => renderParamConfig(indicatorName))
            }
          </div>
        )}
        
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Update Ticker/Time Period'}
        </button>
      </form>
      
      {/* Error Message */}
      {error && (
        <div className="error-message">
          <p>Error: {error}</p>
        </div>
      )}
      
      {/* Chart Container */}
      <div className="chart-display">
        {isLoading && !prevChartRef.current && <p>Loading chart...</p>}
        
        {/* Show previous chart while loading */}
        {isLoading && prevChartRef.current && (
          <div className="loading-overlay">
            <Plot 
              data={prevChartRef.current ? JSON.parse(prevChartRef.current).data || [] : []}
              layout={prevChartRef.current ? JSON.parse(prevChartRef.current).layout || {} : {}}
              style={{ width: "100%", height: "600px" }}
              useResizeHandler={true}
            />
            <div className="loading-spinner">
              Loading...
            </div>
          </div>
        )}
        
        {/* Show current chart when not loading */}
        {!isLoading && chartData?.chart && (
          <Plot 
            data={chartData.chart ? JSON.parse(chartData.chart).data || [] : []}
            layout={chartData.chart ? JSON.parse(chartData.chart).layout || {} : {}}
            style={{ width: "100%", height: "600px" }}
            useResizeHandler={true}
          />
        )}
      </div>
      
      <style jsx>{`
        .stock-chart-container {
          padding: 20px;
          background-color: #1B1610;
          border-radius: 8px;
          margin: 20px 0;
          color: #fff;
        }
        
        .stock-chart-form {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 20px;
        }
        
        .form-group {
          margin-bottom: 15px;
        }
        
        label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
        }
        
        input, select {
          width: 100%;
          padding: 8px;
          border: 1px solid #444;
          border-radius: 4px;
          background-color: #0d1b2a;
          color: #fff;
        }
        
        button {
          grid-column: 1 / -1;
          padding: 10px;
          background-color: #79B6F2;
          color: #0d1b2a;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
        }
        
        button:hover {
          background-color: #5a9cd9;
        }
        
        button:disabled {
          background-color: #555;
          cursor: not-allowed;
        }
        
        .indicators-checkboxes {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 5px;
        }
        
        .indicator-checkbox {
          display: flex;
          align-items: center;
        }
        
        .indicator-checkbox input {
          margin-right: 5px;
          width: auto;
        }
        
        .indicator-parameters {
          grid-column: 1 / -1;
          margin-top: 15px;
          padding: 15px;
          background-color: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
        }
        
        .indicator-parameters h3 {
          margin-top: 0;
          margin-bottom: 15px;
          border-bottom: 1px solid #444;
          padding-bottom: 8px;
        }
        
        .parameter-config {
          margin-bottom: 20px;
          border-bottom: 1px dotted #333;
          padding-bottom: 15px;
        }
        
        .parameter-config h4 {
          margin-top: 0;
          margin-bottom: 10px;
          color: #79B6F2;
        }
        
        .parameter-config-container {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-start;
          gap: 15px;
        }
        
        .parameter-inputs {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 10px;
          flex: 3;
        }
        
        .panel-selection {
          flex: 1;
          min-width: 200px;
        }
        
        .param-input {
          margin-bottom: 5px;
        }
        
        .param-input label {
          font-size: 0.9em;
          text-transform: capitalize;
        }
        
        .param-input input {
          width: 100%;
          padding: 5px;
          font-size: 0.9em;
        }
        
        .chart-display {
          position: relative;
          min-height: 600px;
          margin-top: 20px;
        }
        
        .loading-overlay {
          position: relative;
        }
        
        .loading-spinner {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background-color: rgba(0, 0, 0, 0.7);
          padding: 15px 30px;
          border-radius: 4px;
          z-index: 10;
        }
        
        .error-message {
          padding: 10px;
          background-color: rgba(255, 0, 0, 0.1);
          border-left: 4px solid #ff0000;
          margin-bottom: 20px;
        }
      `}</style>
    </div>
  );
};

export default StockChart; 