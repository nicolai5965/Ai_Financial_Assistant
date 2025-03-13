import React from 'react';

/**
 * Default parameters for each technical indicator type.
 * These values are used when no configuration has been set by the user.
 */
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

/**
 * Input field type mapping and constraints for each parameter.
 * Defines the input types, minimum/maximum values, and step size for numeric inputs.
 */
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

/**
 * Panel options for the dropdown selection.
 * Each indicator can be assigned to a specific panel for better organization.
 */
const PANEL_OPTIONS = [
  { value: 'main', label: 'Main Price Chart' },
  { value: 'oscillator', label: 'Oscillator Panel (0-100)' },
  { value: 'macd', label: 'MACD Panel' },
  { value: 'volume', label: 'Volume Panel' },
  { value: 'volatility', label: 'Volatility Panel' }
];

// Styling constants for consistent appearance
const STYLES = {
  containerBgColor: 'rgba(0, 0, 0, 0.2)',
  borderColor: '#444',
  dotBorderColor: '#333',
  accentColor: '#79B6F2',
};

/**
 * IndicatorConfigurationPanel component for rendering parameter inputs
 * for each selected indicator and panel assignment controls.
 * 
 * @param {Object} props - Component props
 * @param {Array} props.selectedIndicators - Array of selected indicator names or objects
 * @param {Object} props.indicatorConfigs - Current configurations for each indicator
 * @param {Object} props.panelAssignments - Current panel assignments for each indicator
 * @param {Function} props.onParamChange - Handler for parameter value changes
 * @param {Function} props.onPanelChange - Handler for panel assignment changes
 * @returns {JSX.Element|null} The indicator configuration panel or null if no indicators selected
 */
const IndicatorConfigurationPanel = ({
  selectedIndicators,
  indicatorConfigs,
  panelAssignments,
  onParamChange,
  onPanelChange
}) => {
  // Check if there are any selected indicators
  if (!selectedIndicators || selectedIndicators.length === 0) {
    return null;
  }

  /**
   * Renders an individual parameter input field
   * 
   * @param {string} indicatorName - The name of the indicator
   * @param {string} paramName - The name of the parameter
   * @param {number} paramValue - The current value of the parameter
   * @param {Object} inputConfig - The input field configuration
   * @returns {JSX.Element} The rendered parameter input field
   */
  const renderParameterInput = (indicatorName, paramName, paramValue, inputConfig) => {
    // Format the parameter name for display (replace underscores with spaces, add spaces before capitals)
    const displayName = paramName.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').toLowerCase();
    
    return (
      <div className="param-input" key={`${indicatorName}-${paramName}`}>
        <label htmlFor={`param-${indicatorName}-${paramName}`}>
          {displayName}:
        </label>
        <input
          id={`param-${indicatorName}-${paramName}`}
          type={inputConfig.type}
          min={inputConfig.min}
          max={inputConfig.max}
          step={inputConfig.step}
          value={paramValue}
          onChange={(e) => onParamChange(indicatorName, paramName, e.target.value)}
        />
      </div>
    );
  };

  /**
   * Renders the panel selection dropdown for an indicator
   * 
   * @param {string} indicatorName - The name of the indicator
   * @param {string} currentPanel - The currently selected panel
   * @returns {JSX.Element} The rendered panel selection dropdown
   */
  const renderPanelSelection = (indicatorName, currentPanel) => {
    return (
      <div className="panel-selection">
        <label htmlFor={`panel-${indicatorName}`}>
          Display in:
        </label>
        <select
          id={`panel-${indicatorName}`}
          value={currentPanel || 'main'}
          onChange={(e) => onPanelChange(indicatorName, e.target.value)}
        >
          {PANEL_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  };

  /**
   * Render parameter configuration panel for an indicator
   * 
   * @param {string} indicatorName - The name of the indicator
   * @returns {JSX.Element|null} The parameter configuration panel or null if no configurable parameters
   */
  const renderParamConfig = (indicatorName) => {
    // If this indicator doesn't have configurable parameters, return nothing
    if (!(indicatorName in DEFAULT_INDICATOR_PARAMS)) {
      return null;
    }
    
    // Get current parameters or use defaults if not yet configured
    const params = indicatorConfigs[indicatorName] || DEFAULT_INDICATOR_PARAMS[indicatorName];
    const currentPanel = panelAssignments[indicatorName] || 'main';
    
    return (
      <div className="parameter-config" key={`params-${indicatorName}`}>
        <h4>{indicatorName} Parameters</h4>
        <div className="parameter-config-container">
          <div className="parameter-inputs">
            {Object.entries(params).map(([paramName, paramValue]) => {
              const inputConfig = PARAM_INPUT_TYPES[paramName] || { type: 'number', min: 1, max: 100 };
              return renderParameterInput(indicatorName, paramName, paramValue, inputConfig);
            })}
          </div>
          
          {renderPanelSelection(indicatorName, currentPanel)}
        </div>
      </div>
    );
  };

  // Get normalized indicator names from the selectedIndicators array
  const normalizedIndicatorNames = selectedIndicators
    .map(ind => typeof ind === 'string' ? ind : ind.name);

  return (
    <div className="indicator-parameters">
      <h3>Indicator Parameters</h3>
      {normalizedIndicatorNames.map(indicatorName => renderParamConfig(indicatorName))}
      
      <style jsx>{`
        .indicator-parameters {
          grid-column: 1 / -1;
          margin-top: 15px;
          padding: 15px;
          background-color: ${STYLES.containerBgColor};
          border-radius: 4px;
        }
        
        .indicator-parameters h3 {
          margin-top: 0;
          margin-bottom: 15px;
          border-bottom: 1px solid ${STYLES.borderColor};
          padding-bottom: 8px;
        }
        
        .parameter-config {
          margin-bottom: 20px;
          border-bottom: 1px dotted ${STYLES.dotBorderColor};
          padding-bottom: 15px;
        }
        
        .parameter-config h4 {
          margin-top: 0;
          margin-bottom: 10px;
          color: ${STYLES.accentColor};
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
      `}</style>
    </div>
  );
};

export default IndicatorConfigurationPanel; 