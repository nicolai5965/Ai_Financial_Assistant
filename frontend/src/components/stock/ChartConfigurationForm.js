import React from 'react';

// Constants from the original StockChart.js
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
  { value: '1mo', label: 'Monthly' },
  { value: '1wk', label: 'Weekly' },
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

/**
 * ChartConfigurationForm component for handling stock chart configuration inputs
 * Including ticker symbol, time period, interval, chart type, and indicator selection
 */
const ChartConfigurationForm = ({ 
  config, 
  onInputChange, 
  onIndicatorChange, 
  onSubmit, 
  isLoading,
  hideTicker = false
}) => {
  return (
    <form onSubmit={onSubmit} className="stock-chart-form">
      {!hideTicker && (
        <div className="form-group">
          <label htmlFor="ticker">Ticker Symbol:</label>
          <input
            type="text"
            id="ticker"
            name="ticker"
            value={config.ticker}
            onChange={onInputChange}
            required
          />
        </div>
      )}
      
      <div className="form-group">
        <label htmlFor="days">Days of History:</label>
        <input
          type="number"
          id="days"
          name="days"
          min="1"
          max="365"
          value={config.days}
          onChange={onInputChange}
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="interval">Interval:</label>
        <select 
          id="interval" 
          name="interval" 
          value={config.interval} 
          onChange={onInputChange}
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
          onChange={onInputChange}
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
                onChange={onIndicatorChange}
              />
              <label htmlFor={`indicator-${indicator.value}`}>
                {indicator.label}
              </label>
            </div>
          ))}
        </div>
      </div>
      
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Loading...' : hideTicker ? 'Update Chart Configuration' : 'Update Ticker/Time Period'}
      </button>

      <style jsx>{`
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
      `}</style>
    </form>
  );
};

export default ChartConfigurationForm; 