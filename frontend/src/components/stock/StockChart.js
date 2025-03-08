import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
const logger = require('../../utils/logger');
import { fetchStockChart } from '../../services/api/stock';

// Dynamically import Plot with no SSR to avoid server-side rendering issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

const AVAILABLE_INDICATORS = [
  { value: '20-Day SMA', label: 'Simple Moving Average (20)' },
  { value: '20-Day EMA', label: 'Exponential Moving Average (20)' },
  { value: '20-Day Bollinger Bands', label: 'Bollinger Bands (20)' },
  { value: 'VWAP', label: 'Volume Weighted Average Price' }
];

const INTERVALS = [
  { value: '1d', label: 'Daily' },
  { value: '1h', label: 'Hourly' },
  { value: '30m', label: 'Half-hourly' },
  { value: '15m', label: '15 Minutes' },
  { value: '5m', label: '5 Minutes' },
  { value: '1m', label: '1 Minute' },
];

const CHART_TYPES = [
  { value: 'candlestick', label: 'Candlestick' },
  { value: 'line', label: 'Line' },
];

// Default configuration
const DEFAULT_CONFIG = {
  ticker: 'AAPL',
  days: 10,
  interval: '1d',
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
      // Toggle indicator selection
      const newIndicators = prev.indicators.includes(value)
        ? prev.indicators.filter(i => i !== value)
        : [...prev.indicators, value];
      
      logger.debug(`Indicators updated: ${newIndicators.join(', ')}`);
      return { ...prev, indicators: newIndicators };
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
      const data = await fetchStockChart(chartConfig);
      setChartData(data);
      logger.info('Chart data loaded successfully');
    } catch (err) {
      setError(err.message);
      logger.error(`Failed to load chart: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    loadChart(config);
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
                  checked={config.indicators.includes(indicator.value)}
                  onChange={handleIndicatorChange}
                />
                <label htmlFor={`indicator-${indicator.value}`}>
                  {indicator.label}
                </label>
              </div>
            ))}
          </div>
        </div>
        
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