import React from 'react';
import Image from 'next/image';
const logger = require('../../utils/logger');

// Constants for indicators and their panel assignments
const AVAILABLE_INDICATORS = [
  { value: 'SMA', label: 'Simple Moving Average', panel: 'main' },
  { value: 'EMA', label: 'Exponential Moving Average', panel: 'main' },
  { value: 'Bollinger Bands', label: 'Bollinger Bands', panel: 'main' },
  { value: 'VWAP', label: 'Volume Weighted Average Price', panel: 'main' },
  { value: 'Ichimoku Cloud', label: 'Ichimoku Cloud', panel: 'main' },
  { value: 'RSI', label: 'Relative Strength Index', panel: 'oscillator' },
  { value: 'Stochastic Oscillator', label: 'Stochastic Oscillator', panel: 'oscillator' },
  { value: 'MACD', label: 'Moving Average Convergence Divergence', panel: 'macd' },
  { value: 'ATR', label: 'Average True Range', panel: 'volatility' },
  { value: 'OBV', label: 'On-Balance Volume', panel: 'volume' }
];

// Group indicators by panel type
const PANEL_GROUPS = {
  main: AVAILABLE_INDICATORS.filter(ind => ind.panel === 'main'),
  oscillator: AVAILABLE_INDICATORS.filter(ind => ind.panel === 'oscillator'),
  macd: AVAILABLE_INDICATORS.filter(ind => ind.panel === 'macd'),
  volume: AVAILABLE_INDICATORS.filter(ind => ind.panel === 'volume'),
  volatility: AVAILABLE_INDICATORS.filter(ind => ind.panel === 'volatility')
};

// Panel display names
const PANEL_NAMES = {
  main: 'Main Chart Indicators',
  oscillator: 'Oscillator Indicators',
  macd: 'MACD Indicators',
  volume: 'Volume Indicators',
  volatility: 'Volatility Indicators'
};

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
 * StockSettingsSidebar component for displaying and configuring stock chart settings
 * Organized by panel type for better usability
 */
const StockSettingsSidebar = ({ 
  isOpen, 
  toggleSidebar, 
  config, 
  onInputChange, 
  onIndicatorChange, 
  onSubmit, 
  isLoading,
  indicatorConfigs,
  panelAssignments,
  onParamChange,
  onPanelChange
}) => {
  // Log when sidebar state changes
  React.useEffect(() => {
    logger.info(`Stock settings sidebar ${isOpen ? 'opened' : 'closed'}`);
  }, [isOpen]);

  // Handle close button click
  const handleCloseClick = () => {
    logger.debug('User clicked stock settings sidebar close button');
    toggleSidebar();
  };

  // Handle form submission
  const handleFormSubmit = (e) => {
    e.preventDefault();
    logger.debug('User submitted settings from sidebar');
    onSubmit(e);
  };

  return (
    <>
      {/* Settings sidebar component */}
      <div className={`stock-settings-sidebar ${isOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-content">
          {/* Close button in the upper right corner */}
          <div className="close-button" onClick={handleCloseClick}>
            <Image 
              src="/assets/sidebar_close_arrow.png"
              alt="Close Settings" 
              width={24}
              height={24}
            />
          </div>
          
          <h3>Chart Settings</h3>
          
          {/* Chart settings form */}
          <form onSubmit={handleFormSubmit} className="settings-form">
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
            
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Loading...' : 'Update Chart'}
            </button>
          </form>
          
          <div className="indicators-section">
            <h3>Technical Indicators</h3>
            
            {/* Indicators grouped by panel type */}
            {Object.keys(PANEL_GROUPS).map(panelType => (
              <div key={panelType} className="indicator-group">
                <h4>{PANEL_NAMES[panelType]}</h4>
                <div className="indicators-checkboxes">
                  {PANEL_GROUPS[panelType].map(indicator => (
                    <div key={indicator.value} className="indicator-checkbox">
                      <input
                        type="checkbox"
                        id={`sidebar-indicator-${indicator.value}`}
                        value={indicator.value}
                        checked={config.indicators.some(ind => 
                          typeof ind === 'string' ? ind === indicator.value : ind.name === indicator.value
                        )}
                        onChange={onIndicatorChange}
                      />
                      <label htmlFor={`sidebar-indicator-${indicator.value}`}>
                        {indicator.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          {/* Indicator Configuration Panel embedded in sidebar */}
          {config.indicators.length > 0 && (
            <div className="indicator-configuration-section">
              <h3>Indicator Settings</h3>
              {config.indicators.filter(ind => {
                const name = typeof ind === 'string' ? ind : ind.name;
                // Get all indicators with configurable parameters
                return Object.entries(indicatorConfigs).some(([key]) => key === name);
              }).map(ind => {
                const indicatorName = typeof ind === 'string' ? ind : ind.name;
                const params = indicatorConfigs[indicatorName] || {};
                
                return (
                  <div className="parameter-config" key={`params-${indicatorName}`}>
                    <h4>{indicatorName} Parameters</h4>
                    <div className="parameter-config-container">
                      <div className="parameter-inputs">
                        {Object.entries(params).map(([paramName, paramValue]) => {
                          return (
                            <div className="param-input" key={`${indicatorName}-${paramName}`}>
                              <label htmlFor={`sidebar-param-${indicatorName}-${paramName}`}>
                                {paramName.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').toLowerCase()}:
                              </label>
                              <input
                                id={`sidebar-param-${indicatorName}-${paramName}`}
                                type="number"
                                value={paramValue}
                                onChange={(e) => onParamChange(indicatorName, paramName, e.target.value)}
                              />
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="panel-selection">
                        <label htmlFor={`sidebar-panel-${indicatorName}`}>
                          Display in:
                        </label>
                        <select
                          id={`sidebar-panel-${indicatorName}`}
                          value={panelAssignments[indicatorName] || 'main'}
                          onChange={(e) => onPanelChange(indicatorName, e.target.value)}
                        >
                          <option value="main">Main Price Chart</option>
                          <option value="oscillator">Oscillator Panel</option>
                          <option value="macd">MACD Panel</option>
                          <option value="volume">Volume Panel</option>
                          <option value="volatility">Volatility Panel</option>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* Open sidebar button - only visible when sidebar is closed */}
      {!isOpen && (
        <div className="settings-open-button" onClick={toggleSidebar}>
          <Image 
            src="/assets/stock_settings_icon.png"
            alt="Open Settings" 
            width={30}
            height={30}
          />
        </div>
      )}

      {/* Styles for the sidebar */}
      <style jsx>{`
        .stock-settings-sidebar {
          position: fixed;
          top: 80px; /* Position below the header */
          right: 0; /* Position on the right side of the screen */
          height: calc(100vh - 80px); /* Full height minus header */
          background-color: rgba(13, 27, 42, 0.7); /* Semi-transparent dark blue */
          box-shadow: -2px 0 5px rgba(0, 0, 0, 0.2);
          transition: transform 0.3s ease;
          width: 300px;
          z-index: 900; /* Lower than header but higher than content */
          overflow-y: auto; /* Enable scrolling for overflow content */
        }
        
        .stock-settings-sidebar.closed {
          transform: translateX(100%); /* Move off-screen when closed */
        }
        
        .stock-settings-sidebar.open {
          transform: translateX(0); /* Visible when open */
        }
        
        .sidebar-content {
          padding: 1rem;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        
        .close-button {
          align-self: flex-end;
          cursor: pointer;
          padding: 0.5rem;
          transition: opacity 0.2s;
        }
        
        .close-button:hover {
          opacity: 0.8;
        }
        
        .settings-open-button {
          position: fixed;
          top: 90px; /* Just below the header */
          right: 10px;
          cursor: pointer;
          z-index: 800;
          padding: 0.5rem;
          border-radius: 50%;
          transition: opacity 0.2s;
          background-color: rgba(13, 27, 42, 0.7); /* Semi-transparent dark blue */
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        .settings-open-button:hover {
          opacity: 0.8;
        }
        
        h3 {
          margin-top: 1rem;
          margin-bottom: 1rem;
          color: #f8f8f8;
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
          padding-bottom: 0.5rem;
        }
        
        h4 {
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
          color: #f8f8f8;
          font-size: 1rem;
        }
        
        .settings-form {
          display: flex;
          flex-direction: column;
          gap: 15px;
          margin-bottom: 20px;
        }
        
        .form-group {
          margin-bottom: 10px;
        }
        
        label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
          color: #f8f8f8;
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
          padding: 10px;
          background-color: #79B6F2;
          color: #0d1b2a;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
          margin-top: 10px;
        }
        
        button:hover {
          background-color: #5a9cd9;
        }
        
        button:disabled {
          background-color: #555;
          cursor: not-allowed;
        }
        
        .indicators-section {
          margin-bottom: 15px;
        }
        
        .indicator-group {
          margin-bottom: 15px;
          background-color: rgba(0, 0, 0, 0.2);
          padding: 10px;
          border-radius: 4px;
        }
        
        .indicators-checkboxes {
          display: flex;
          flex-direction: column;
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
        
        .indicator-configuration-section {
          margin-top: 20px;
        }
        
        .parameter-config {
          margin-bottom: 15px;
          background-color: rgba(0, 0, 0, 0.2);
          padding: 10px;
          border-radius: 4px;
        }
        
        .parameter-config-container {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .parameter-inputs {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 10px;
        }
        
        .param-input {
          display: flex;
          flex-direction: column;
        }
        
        .panel-selection {
          margin-top: 10px;
        }
      `}</style>
    </>
  );
};

export default StockSettingsSidebar; 