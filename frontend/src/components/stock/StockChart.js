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

// Default configuration
const DEFAULT_CONFIG = {
  ticker: 'AAPL',
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
  
  // Ref to keep track of the previous chart while loading new one
  const prevChartRef = useRef(null);
  
  // Load initial chart on component mount
  useEffect(() => {
    logger.debug('StockChart component mounted, loading initial chart');
    loadChart(DEFAULT_CONFIG);
  }, []);
  
  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
    logger.debug(`Config ${name} changed to ${value}`);
  };
  
  // Handle indicator selection
  const handleIndicatorChange = (e) => {
    const value = e.target.value;
    
    setConfig(prev => {
      // Check if the indicator is already selected
      const isSelected = prev.indicators.some(ind => 
        typeof ind === 'string' ? ind === value : ind.name === value
      );
      
      let newIndicators;
      
      if (isSelected) {
        // Remove the indicator
        newIndicators = prev.indicators.filter(ind => 
          typeof ind === 'string' ? ind !== value : ind.name !== value
        );
        
        // Also remove from configurations
        const newConfigs = { ...indicatorConfigs };
        delete newConfigs[value];
        setIndicatorConfigs(newConfigs);
      } else {
        // Add the indicator with default config if it has parameters
        if (value in DEFAULT_INDICATOR_PARAMS) {
          // Create a new configuration object with default values
          const defaultParams = DEFAULT_INDICATOR_PARAMS[value];
          setIndicatorConfigs(prev => ({
            ...prev,
            [value]: { ...defaultParams }
          }));
          
          // Add to indicators list as an object with name
          newIndicators = [...prev.indicators, { name: value }];
        } else {
          // Add simple string for indicators without parameters
          newIndicators = [...prev.indicators, value];
        }
      }
      
      logger.debug(`Indicators updated: ${newIndicators.map(ind => 
        typeof ind === 'string' ? ind : ind.name).join(', ')}`);
      return { ...prev, indicators: newIndicators };
    });
  };
  
  // Handle parameter change for indicators
  const handleParamChange = (indicatorName, paramName, value) => {
    setIndicatorConfigs(prev => {
      const newConfigs = {
        ...prev,
        [indicatorName]: {
          ...prev[indicatorName],
          [paramName]: Number(value)
        }
      };
      
      logger.debug(`Updated ${paramName} for ${indicatorName} to ${value}`);
      
      // Also update the config.indicators array
      setConfig(prevConfig => {
        const newIndicators = prevConfig.indicators.map(ind => {
          if (typeof ind === 'object' && ind.name === indicatorName) {
            return { name: indicatorName, ...newConfigs[indicatorName] };
          }
          return ind;
        });
        
        return { ...prevConfig, indicators: newIndicators };
      });
      
      return newConfigs;
    });
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
      
      // Apply the latest indicator configurations before sending
      const configToSend = {
        ...chartConfig,
        indicators: chartConfig.indicators.map(ind => {
          if (typeof ind === 'string') {
            return ind;
          } else {
            const name = ind.name;
            // Ensure all parameter values are numbers, not strings
            const params = { name };
            
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
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
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
              .filter(name => name in DEFAULT_INDICATOR_PARAMS)
              .map(indicatorName => renderParamConfig(indicatorName))
            }
          </div>
        )}
        
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Update Chart'}
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
              style={{ width: "100%", height: "500px" }}
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
            style={{ width: "100%", height: "500px" }}
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
        }
        
        .parameter-config h4 {
          margin-top: 0;
          margin-bottom: 10px;
          color: #79B6F2;
        }
        
        .parameter-inputs {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 10px;
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
          min-height: 500px;
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