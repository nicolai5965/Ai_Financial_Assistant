import React from 'react';

// Constants for configuration options
// These represent all available technical indicators that can be applied to the stock chart
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

// Time interval options for data granularity
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

// Available chart visualization types
const CHART_TYPES = [
  { value: 'candlestick', label: 'Candlestick' },
  { value: 'line', label: 'Line' },
];

/**
 * ChartConfigurationForm component for handling stock chart configuration inputs
 * Including ticker symbol, time period, interval, chart type, and indicator selection
 * 
 * @param {Object} props - Component props
 * @param {Object} props.config - The current chart configuration state
 * @param {Function} props.onInputChange - Handler for input field changes
 * @param {Function} props.onIndicatorChange - Handler for indicator selection changes
 * @param {Function} props.onSubmit - Handler for form submission
 * @param {boolean} props.isLoading - Loading state for the submit button
 * @param {boolean} props.hideTicker - Whether to hide the ticker input field (default: false)
 * @returns {React.Component} - Chart configuration form component
 */
const ChartConfigurationForm = ({ 
  config, 
  onInputChange, 
  onIndicatorChange, 
  onSubmit, 
  isLoading,
  hideTicker = false
}) => {
  // Helper function to render a basic form input field
  const renderFormInput = (id, label, type, min, max) => (
    <div className="form-group">
      <label htmlFor={id}>{label}:</label>
      <input
        type={type}
        id={id}
        name={id}
        min={min}
        max={max}
        value={config[id]}
        onChange={onInputChange}
        required={id === 'ticker'}
      />
    </div>
  );

  // Helper function to render a dropdown select field
  const renderSelectField = (id, label, options) => (
    <div className="form-group">
      <label htmlFor={id}>{label}:</label>
      <select 
        id={id} 
        name={id} 
        value={config[id]} 
        onChange={onInputChange}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  // Helper function to check if an indicator is selected
  const isIndicatorSelected = (indicatorValue) => {
    return config.indicators.some(ind => 
      typeof ind === 'string' ? ind === indicatorValue : ind.name === indicatorValue
    );
  };

  return (
    <form onSubmit={onSubmit} className="stock-chart-form">
      {/* Ticker input field - conditionally rendered */}
      {!hideTicker && renderFormInput('ticker', 'Ticker Symbol', 'text')}
      
      {/* Days of history input */}
      {renderFormInput('days', 'Days of History', 'number', '1', '365')}
      
      {/* Interval selection dropdown */}
      {renderSelectField('interval', 'Interval', INTERVALS)}
      
      {/* Chart type selection dropdown */}
      {renderSelectField('chartType', 'Chart Type', CHART_TYPES)}
      
      {/* Technical indicators selection checkboxes */}
      <div className="form-group">
        <label>Technical Indicators:</label>
        <div className="indicators-checkboxes">
          {AVAILABLE_INDICATORS.map(indicator => (
            <div key={indicator.value} className="indicator-checkbox">
              <input
                type="checkbox"
                id={`indicator-${indicator.value}`}
                value={indicator.value}
                checked={isIndicatorSelected(indicator.value)}
                onChange={onIndicatorChange}
              />
              <label htmlFor={`indicator-${indicator.value}`}>
                {indicator.label}
              </label>
            </div>
          ))}
        </div>
      </div>
      
      {/* Submit button - text changes based on hideTicker prop */}
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Loading...' : hideTicker ? 'Update Chart Configuration' : 'Update Ticker/Time Period'}
      </button>

      {/* Styled JSX for component-scoped styling */}
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