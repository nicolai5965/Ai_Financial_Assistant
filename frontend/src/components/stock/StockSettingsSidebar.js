// StockSettingsSidebar.js

// ---------------------------------------------------------------------
// Import Statements: Import React, Next.js Image component, and logging utility.
// ---------------------------------------------------------------------
import React, { useState, useRef, useEffect, useCallback } from 'react'; // Added useCallback
import Image from 'next/image';
import { logger } from '../../utils/logger';

// ---------------------------------------------------------------------
// Constants for Styling - Organized by Purpose (KEEP AS IS)
// ---------------------------------------------------------------------
// LAYOUT - Dimensions and positioning
const SIDEBAR_WIDTH = '350px';
const SIDEBAR_Z_INDEX = 900;
const HEADER_HEIGHT = '80px';

// COLORS - Primary palette
const PRIMARY_DARK = 'rgba(13, 27, 42, 1)';      // Dark blue
const PRIMARY_LIGHT = 'rgba(26, 42, 58, 1)';      // Light blue
const ACCENT_PRIMARY = 'rgba(92, 230, 207, 1)';   // Cyan
const ACCENT_HOVER = 'rgba(59, 205, 186, 1)';     // Darker cyan
const TEXT_PRIMARY = 'rgba(248, 248, 248, 1)';    // White text
const TEXT_SECONDARY = 'rgba(204, 204, 204, 1)';   // Light gray text
const SHADOW_COLOR = 'rgba(0, 0, 0, 0.5)';         // Black shadow

// SIDEBAR - General sidebar styling
const SIDEBAR_BG_COLOR = `linear-gradient(to bottom, ${PRIMARY_DARK}, ${PRIMARY_LIGHT})`;
const SIDEBAR_BORDER = `1px solid rgba(92, 230, 207, 0.1)`;
const SIDEBAR_SHADOW = `-4px 0 15px ${SHADOW_COLOR}`;

// SECTION - Section container styling
const SECTION_BG_COLOR = 'rgba(10, 20, 30, 0.6)';
const SECTION_PADDING = '15px';
const SECTION_BORDER_RADIUS = '4px';
const SECTION_BORDER = `1px solid rgba(92, 230, 207, 0.2)`;
const SECTION_SHADOW = `0 2px 10px rgba(0, 0, 0, 0.2)`;

// INPUT - Form inputs and elements
const INPUT_BG_COLOR = 'rgba(17, 34, 51, 0.95)';
const INPUT_BORDER = `1px solid rgba(92, 230, 207, 0.3)`;
const INPUT_FOCUS_SHADOW = `0 0 8px rgba(92, 230, 207, 0.6)`;
const INPUT_WIDTH = '50%'; // New constant for customizable input width
const INPUT_HEIGHT = '27px';
const BUTTON_HEIGHT = '40px';

// SELECT - Dropdown styling elements (now consistent with inputs)
const SELECT_BG_COLOR = 'rgba(17, 34, 51, 0.95)'; // Matches INPUT_BG_COLOR
const SELECT_BORDER = `1px solid rgba(92, 230, 207, 0.3)`; // Matches INPUT_BORDER
const SELECT_FOCUS_SHADOW = `0 0 2px rgba(92, 230, 207, 0.6)`; // Matches INPUT_FOCUS_SHADOW
const SELECT_OPTION_BG = 'rgba(10, 20, 30, 0.98)'; // Dark blue for dropdown options
const SELECT_OPTION_HOVER_BG = 'rgba(26, 42, 58, 0.9)'; // Similar to PRIMARY_LIGHT for hover

// EFFECTS - Glows and animations
const ACCENT_GLOW = `0 0 10px rgba(92, 230, 207, 0.7)`;
const TEXT_GLOW = `0 0 10px rgba(92, 230, 207, 0.4)`; // Changed to match accent color

// CHECKBOX - Checkbox specific styling
const CHECKBOX_SIZE = '20px'; // Larger checkbox size for better visibility
const CHECKBOX_BG = 'rgba(10, 20, 30, 0.7)';      // Dark blue background (unchecked)
const CHECKBOX_BORDER = 'rgba(92, 230, 207, 0.7)';  // Cyan border
const CHECKBOX_CHECKED_BG = 'rgba(59, 205, 186, 0.8)'; // Changed to match ACCENT_HOVER
const CHECKBOX_MARGIN_RIGHT = '1px'; // Space between checkbox and label
const CHECKBOX_ROW_SPACING = '10px'; // Vertical spacing between checkbox rows

// Some constants for the new UI elements
const HIGHLIGHT_COLOR = 'rgba(92, 230, 207, 0.7)';
const WARNING_COLOR = 'rgba(255, 165, 0, 0.7)';

// ---------------------------------------------------------------------
// Constants for Indicators and Panel Assignments (KEEP AS IS)
// ---------------------------------------------------------------------
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

// INTERVALS - Date intervals for dropdown
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

// CHART_TYPES - Chart types for dropdown
const CHART_TYPES = [
  { value: 'candlestick', label: 'Candlestick' },
  { value: 'line', label: 'Line' },
];

// DEFAULT_PANEL_PLACEMENT - Default panel placement for indicators
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

// DEFAULT_INDICATOR_PARAMS - Default indicator parameters
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

  // PARAMETER_DISPLAY_NAMES - Display names for indicator parameters
  const PARAMETER_DISPLAY_NAMES = {
    window: "Window Period",
    fast_window: "Fast Period",
    slow_window: "Slow Period",
    signal_window: "Signal Period",
    std_dev: "Standard Deviation",
    k_window: "K Period",
    d_window: "D Period",
    conversion_period: "Conversion Line Period",
    base_period: "Base Line Period",
    lagging_span_b_period: "Lagging Span B Period"
  };


// ---------------------------------------------------------------------
// StockSettingsSidebar Component: Displays and configures stock chart settings.
// ---------------------------------------------------------------------
/**
 * StockSettingsSidebar component for displaying and configuring stock chart settings.
 * Organized by panel type for better usability.
 *
 * Props:
 * - isOpen: Boolean indicating whether the sidebar is open.
 * - toggleSidebar: Function to toggle sidebar open/closed state.
 * - settings: Current chart settings.
 * - onSettingsChange: Handler for settings changes.
 * - lastAutoRefreshTime: Timestamp of the last auto-refresh (null if none).
 * - onUpdateClick: Callback function to trigger a data update.
 */
const StockSettingsSidebar = ({
  isOpen,
  toggleSidebar,
  settings,
  onSettingsChange,
  lastAutoRefreshTime,
  onUpdateClick, // Added onUpdateClick
}) => {
  // ---------------------------------------------------------------------
  // State and Refs: Local state and references used within the component.
  // ---------------------------------------------------------------------
  // Track if there are unsaved changes.
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  // Keep track of the last auto-refresh time using a ref.
  const lastAutoRefreshTimeRef = useRef(lastAutoRefreshTime);
  // Ref for the main sidebar container to check focus
  const sidebarRef = useRef(null); // <<< Added Ref for sidebar container

  // ---------------------------------------------------------------------
  // Debug Logging: Output passed-down props for debugging purposes.
  // ---------------------------------------------------------------------
  // console.log("DEBUG-SC: StockSettingsSidebar - RENDER - START");
  // console.log("DEBUG-SC: StockSettingsSidebar - settings passed down from StockChart:", settings);

  // ---------------------------------------------------------------------
  // Event Handlers: Functions that handle user interactions.
  // ---------------------------------------------------------------------

  // Handle update click; triggers data update and resets unsaved changes.
  // Wrap in useCallback for stable reference in useEffect dependency array.
  const handleUpdateClick = useCallback(() => {
    // Only proceed if there are actual changes to prevent unnecessary updates
    if (hasUnsavedChanges) {
        console.log('DEBUG-SC: StockSettingsSidebar: handleUpdateClick: Update triggered.');
        onUpdateClick();
        setHasUnsavedChanges(false);
        console.log('DEBUG-SC: StockSettingsSidebar: handleUpdateClick: hasUnsavedChanges set to false');
    } else {
        console.log('DEBUG-SC: StockSettingsSidebar: handleUpdateClick: No unsaved changes, update skipped.');
    }
  }, [onUpdateClick, hasUnsavedChanges]); // <<< Added dependencies

  // ---------------------------------------------------------------------
  // useEffect Hooks: Lifecycle events and side effects.
  // ---------------------------------------------------------------------
  // Log when sidebar state changes.
  useEffect(() => {
    logger.info(`StockSettingsSidebar: Stock settings sidebar ${isOpen ? 'opened' : 'closed'}`);
  }, [isOpen]);

  // Reset unsaved changes when an auto-refresh occurs.
  useEffect(() => {
    if (lastAutoRefreshTime !== null && lastAutoRefreshTime !== lastAutoRefreshTimeRef.current) {
      lastAutoRefreshTimeRef.current = lastAutoRefreshTime;

      if (hasUnsavedChanges) {
        logger.debug('StockSettingsSidebar: Auto-refresh occurred, clearing unsaved changes notification');
        setHasUnsavedChanges(false);
      }
    }
  }, [lastAutoRefreshTime, hasUnsavedChanges]);

  // --- >>> NEW useEffect for handling 'Enter' key press <<< ---
  useEffect(() => {
    const handleGlobalKeyDown = (event) => {
      // Conditions:
      // 1. Sidebar is open
      // 2. Key pressed is 'Enter'
      // 3. There are unsaved changes
      // 4. The currently focused element is inside the sidebar container
      if (
        isOpen &&
        event.key === 'Enter' &&
        hasUnsavedChanges &&
        sidebarRef.current &&
        sidebarRef.current.contains(document.activeElement)
      ) {
        // Prevent default Enter behavior (like form submission or newline in textarea)
        event.preventDefault();
        console.log("DEBUG-SC: Enter pressed inside sidebar with unsaved changes. Triggering update.");
        handleUpdateClick();
      }
    };

    // Add event listener to the document
    document.addEventListener('keydown', handleGlobalKeyDown);

    // Cleanup function to remove the event listener
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [isOpen, hasUnsavedChanges, handleUpdateClick]); // Dependencies: listen changes on these states/functions
  // --- >>> END NEW useEffect <<< ---


  // ---------------------------------------------------------------------
  // Event Handlers (Continued): Functions that handle user interactions.
  // ---------------------------------------------------------------------
  // Handle close button click.
  const handleCloseClick = () => {
    logger.debug('StockSettingsSidebar: User clicked stock settings sidebar close button');
    toggleSidebar();
  };

  // Wrapper for input change handler to track unsaved changes.
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    onSettingsChange({ [name]: value });
    setHasUnsavedChanges(true);
  };

// Helper function to create a complete indicator object
const createIndicatorObject = (indicatorName, configs, panelAssignments) => {
  // Get the current config and panel assignment for this indicator
  const config = configs?.[indicatorName] || {};
  const panel = panelAssignments?.[indicatorName] || 'main';

  return {
      name: indicatorName,
      panel: panel,
      window: config.window || null,
      fast_window: config.fast_window || null,
      slow_window: config.slow_window || null,
      signal_window: config.signal_window || null,
      std_dev: config.std_dev || null,
      k_window: config.k_window || null,
      d_window: config.d_window || null,
      conversion_period: config.conversion_period || null,
      base_period: config.base_period || null,
      lagging_span_b_period: config.lagging_span_b_period || null
  };
};

// Modified handler for indicator selection changes
const handleIndicatorChange = (e) => {
  const { value: indicatorName, checked } = e.target;
  const currentIndicators = settings.selectedIndicators || [];
  const currentConfigs = settings.indicatorConfigs || {};
  const currentPanels = settings.panelAssignments || {};

  let newSelectedIndicators;
  let newIndicatorConfigs = { ...currentConfigs };
  let newPanelAssignments = { ...currentPanels };

  if (checked) {
      // Add indicator with complete configuration
      // First, set up default config if available
      if (DEFAULT_INDICATOR_PARAMS[indicatorName]) {
          newIndicatorConfigs[indicatorName] = { ...DEFAULT_INDICATOR_PARAMS[indicatorName] };
      }

      // Set default panel assignment
      newPanelAssignments[indicatorName] = DEFAULT_PANEL_PLACEMENT[indicatorName] || 'main';

      // Create complete indicator object
      const newIndicator = createIndicatorObject(
          indicatorName,
          newIndicatorConfigs,
          newPanelAssignments
      );

      newSelectedIndicators = [...currentIndicators, newIndicator];
  } else {
      // Remove indicator and its configurations
      newSelectedIndicators = currentIndicators.filter(ind =>
          (typeof ind === 'string' ? ind : ind.name) !== indicatorName
      );
      delete newIndicatorConfigs[indicatorName];
      delete newPanelAssignments[indicatorName];
  }

  // Log the new state for debugging
  // console.log('DEBUG-SC: handleIndicatorChange - New State:', {
  //     selectedIndicators: newSelectedIndicators,
  //     indicatorConfigs: newIndicatorConfigs,
  //     panelAssignments: newPanelAssignments
  // });

  // Update all related state pieces
  onSettingsChange({
      selectedIndicators: newSelectedIndicators,
      indicatorConfigs: newIndicatorConfigs,
      panelAssignments: newPanelAssignments
  });
  setHasUnsavedChanges(true);
};

// Modified handler for parameter changes
const handleParamChange = (indicatorName, paramName, value) => {
  const numericValue = Number(value);
  if (isNaN(numericValue)) {
      console.warn('Invalid numeric value:', value);
      return;
  }

  const currentConfigs = settings.indicatorConfigs || {};
  const newConfigs = {
      ...currentConfigs,
      [indicatorName]: {
          ...(currentConfigs[indicatorName] || {}),
          [paramName]: numericValue
      }
  };

  // Update the selectedIndicators array with new parameter values
  const updatedIndicators = (settings.selectedIndicators || []).map(indicator => {
      if ((typeof indicator === 'string' ? indicator : indicator.name) === indicatorName) {
          return createIndicatorObject(
              indicatorName,
              newConfigs,
              settings.panelAssignments
          );
      }
      return indicator;
  });

  // console.log('DEBUG-SC: handleParamChange - New State:', {
  //     selectedIndicators: updatedIndicators,
  //     indicatorConfigs: newConfigs
  // });

  // Update both configs and selectedIndicators
  onSettingsChange({
      selectedIndicators: updatedIndicators,
      indicatorConfigs: newConfigs
  });
  setHasUnsavedChanges(true);
};

// Modified handler for panel changes
const handlePanelChange = (indicatorName, panelName) => {
  const currentPanels = settings.panelAssignments || {};
  const newAssignments = {
      ...currentPanels,
      [indicatorName]: panelName
  };

  // Update the selectedIndicators array with new panel assignment
  const updatedIndicators = (settings.selectedIndicators || []).map(indicator => {
      if ((typeof indicator === 'string' ? indicator : indicator.name) === indicatorName) {
          return createIndicatorObject(
              indicatorName,
              settings.indicatorConfigs,
              newAssignments
          );
      }
      return indicator;
  });

  // console.log('DEBUG-SC: handlePanelChange - New State:', {
  //     selectedIndicators: updatedIndicators,
  //     panelAssignments: newAssignments
  // });

  // Update both assignments and selectedIndicators
  onSettingsChange({
      selectedIndicators: updatedIndicators,
      panelAssignments: newAssignments
  });
  setHasUnsavedChanges(true);
  };

  // ---------------------------------------------------------------------
  // Render Helpers: Functions to render sub-sections of the UI. (KEEP AS IS)
  // ---------------------------------------------------------------------
  /**
   * Renders a form input group with label and input/select element.
   *
   * @param {string} id - Input element ID.
   * @param {string} label - Label text.
   * @param {string} name - Input element name.
   * @param {string} type - Input element type (number, select, etc).
   * @param {any} value - Current input value.
   * @param {Function} onChange - Change handler.
   * @param {Object} options - Additional options (min, max, options array for select).
   * @returns {JSX.Element} Form group element.
   */
  const renderFormGroup = (id, label, name, type, value, onChange, options = {}) => {
    return (
      <div className="form-group">
        <label htmlFor={id}>{label}</label>
        {type === 'select' ? (
          <div className="futuristic-select-wrapper">
            <select
              id={id}
              name={name}
              value={value}
              onChange={onChange}
              className="futuristic-select"
              style={{
                height: INPUT_HEIGHT,
                width: INPUT_WIDTH,
                color: TEXT_PRIMARY,
                backgroundColor: SELECT_BG_COLOR,
                border: SELECT_BORDER,
                WebkitTextFillColor: TEXT_PRIMARY,
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                appearance: 'none',
                boxShadow: SELECT_FOCUS_SHADOW
              }}
            >
              {options.items && options.items.map(item => (
                <option
                  key={item.value}
                  value={item.value}
                  style={{
                    backgroundColor: SELECT_OPTION_BG,
                    color: TEXT_PRIMARY
                  }}
                  // Inline hover styles for options (keep as is)
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = SELECT_OPTION_HOVER_BG;
                    e.target.style.background = SELECT_OPTION_HOVER_BG;
                    e.target.style.color = TEXT_PRIMARY;
                    e.target.style.fontWeight = 'bold';
                    e.target.style.textDecoration = 'none';
                    e.target.style.boxShadow = `0 0 5px rgba(92, 230, 207, 0.3)`;
                    e.target.style.outline = `1px solid ${ACCENT_PRIMARY}`;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = SELECT_OPTION_BG;
                    e.target.style.background = SELECT_OPTION_BG;
                    e.target.style.color = TEXT_PRIMARY;
                    e.target.style.fontWeight = 'normal';
                    e.target.style.textDecoration = 'none';
                    e.target.style.boxShadow = 'none';
                    e.target.style.outline = 'none';
                  }}
                >
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <input
            type={type}
            id={id}
            name={name}
            min={options.min}
            max={options.max}
            value={value}
            onChange={onChange}
            required={options.required}
            className="futuristic-input"
            style={{ backgroundColor: INPUT_BG_COLOR, border: INPUT_BORDER, height: INPUT_HEIGHT, width: INPUT_WIDTH }}
          />
        )}
      </div>
    );
  };

  /**
   * Renders an indicator group with checkboxes.
   *
   * @param {string} panelType - Type of panel (main, oscillator, etc).
   * @returns {JSX.Element} Indicator group element.
   */
  const renderIndicatorGroup = (panelType) => {
    return (
      <div key={panelType} className="indicator-group">
        <h4 className="indicator-group-title">{PANEL_NAMES[panelType]}</h4>
        <div className="indicators-grid" style={{ gap: CHECKBOX_ROW_SPACING }}>
          {PANEL_GROUPS[panelType].map(indicator => {
            const isSelected = settings.selectedIndicators.some(ind =>
              typeof ind === 'string' ? ind === indicator.value : ind.name === indicator.value
            );
            return (
              <div
                key={indicator.value}
                className={`indicator-checkbox ${isSelected ? 'selected' : ''}`}
                onClick={() => handleIndicatorChange({ target: { value: indicator.value, checked: !isSelected } })}
                style={{ marginBottom: CHECKBOX_ROW_SPACING }}
              >
                <table className="indicator-table" cellSpacing="0" cellPadding="0" style={{ width: '100%' }}>
                  <tbody>
                    <tr>
                      <td className="checkbox-cell" style={{ width: '30px', verticalAlign: 'top', paddingTop: '2px' }}>
                        <div className={`table-checkbox ${isSelected ? 'checked' : ''}`}>
                          <svg
                            width={CHECKBOX_SIZE}
                            height={CHECKBOX_SIZE}
                            viewBox="0 0 20 20"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <rect
                              width="20"
                              height="20"
                              rx="3"
                              fill={isSelected ? CHECKBOX_CHECKED_BG : CHECKBOX_BG}
                              stroke={CHECKBOX_BORDER}
                              strokeWidth="1.5"
                            />
                            {isSelected && (
                              <path
                                d="M5 10L8 13L15 7"
                                stroke={PRIMARY_DARK}
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            )}
                          </svg>
                        </div>
                      </td>
                      <td className="label-cell" style={{ paddingLeft: CHECKBOX_MARGIN_RIGHT, verticalAlign: 'top', paddingTop: '0px' }}>
                        <span className="checkbox-text" style={{ display: 'inline-block', lineHeight: '20px' }}>{indicator.label}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /**
   * Renders an indicator parameter configuration section.
   *
   * @param {string} indicatorName - Name of the indicator.
   * @param {Object} params - Parameter configuration object.
   * @returns {JSX.Element} Parameter configuration element.
   */
  const renderParameterConfig = (indicatorName, params) => {
    // Debug logging for incoming data
    // console.log('DEBUG-SC: renderParameterConfig - START', {
    //     indicatorName,
    //     params,
    //     currentConfigs: settings.indicatorConfigs,
    //     currentPanelAssignments: settings.panelAssignments
    // });

    // Validate required data
    if (!indicatorName || !params) {
        console.warn('DEBUG-SC: Missing required data for parameter config:', { indicatorName, params });
        return null;
    }

    // Get the specific indicator's parameters and current config
    const indicatorParams = params[indicatorName] || {};
    const currentConfig = settings.indicatorConfigs?.[indicatorName] || {};

    // console.log('DEBUG-SC: Processing indicator:', {
    //     indicatorName,
    //     indicatorParams,
    //     currentConfig
    // });

    // Process parameters to include display names and current values
    const parameters = Object.entries(indicatorParams).map(([paramName, defaultValue]) => {
        const currentValue = currentConfig[paramName] ?? defaultValue;
        // console.log('DEBUG-SC: Processing parameter:', {
        //     paramName,
        //     defaultValue,
        //     currentValue
        // });

        return {
            technicalName: paramName,
            displayName: PARAMETER_DISPLAY_NAMES[paramName] || paramName.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').toLowerCase(),
            value: currentValue
        };
    });

    // console.log('DEBUG-SC: Processed parameters:', parameters);

    return (
        <div className="parameter-config" key={`params-${indicatorName}`}>
            {/* Title Section */}
            <h4 className="parameter-title">
                {indicatorName} Parameters
            </h4>

            <div className="parameter-config-container">
                {/* Parameters Input Section */}
                <div className="parameter-inputs">
                    {parameters.map(({ technicalName, displayName, value }) => (
                        <div className="param-input"
                             key={`${indicatorName}-${technicalName}`}>
                            <label htmlFor={`sidebar-param-${indicatorName}-${technicalName}`}>
                                {displayName}
                            </label>
                            <input
                                id={`sidebar-param-${indicatorName}-${technicalName}`}
                                type="number"
                                value={value}
                                onChange={(e) => handleParamChange(
                                    indicatorName,
                                    technicalName,
                                    e.target.value
                                )}
                                style={{
                                    backgroundColor: INPUT_BG_COLOR,
                                    border: INPUT_BORDER,
                                    color: TEXT_PRIMARY,
                                    height: '32px',
                                    width: '100%'
                                }}
                            />
                        </div>
                    ))}
                </div>

                {/* Panel Selection Section */}
                <div className="panel-selection">
                    <label htmlFor={`sidebar-panel-${indicatorName}`}>
                        Display in
                    </label>
                    <div className="futuristic-select-wrapper">
                        <select
                            id={`sidebar-panel-${indicatorName}`}
                            value={settings.panelAssignments?.[indicatorName] || 'main'}
                            onChange={(e) => handlePanelChange(indicatorName, e.target.value)}
                            className="futuristic-select"
                            style={{
                                height: INPUT_HEIGHT,
                                width: INPUT_WIDTH,
                                color: TEXT_PRIMARY,
                                backgroundColor: SELECT_BG_COLOR,
                                border: SELECT_BORDER,
                                WebkitTextFillColor: TEXT_PRIMARY,
                                WebkitAppearance: 'none',
                                MozAppearance: 'none',
                                appearance: 'none',
                                boxShadow: SELECT_FOCUS_SHADOW
                            }}
                        >
                            {/* Options with inline hover styles (keep as is) */}
                            <option value="main"
                              style={{ backgroundColor: SELECT_OPTION_BG, color: TEXT_PRIMARY }}
                              onMouseEnter={(e) => { e.target.style.backgroundColor = SELECT_OPTION_HOVER_BG; e.target.style.background = SELECT_OPTION_HOVER_BG; e.target.style.color = TEXT_PRIMARY; e.target.style.fontWeight = 'bold'; e.target.style.textDecoration = 'none'; e.target.style.boxShadow = `0 0 5px rgba(92, 230, 207, 0.3)`; e.target.style.outline = `1px solid ${ACCENT_PRIMARY}`; }}
                              onMouseLeave={(e) => { e.target.style.backgroundColor = SELECT_OPTION_BG; e.target.style.background = SELECT_OPTION_BG; e.target.style.color = TEXT_PRIMARY; e.target.style.fontWeight = 'normal'; e.target.style.textDecoration = 'none'; e.target.style.boxShadow = 'none'; e.target.style.outline = 'none'; }}
                            >Main Price Chart</option>
                            <option value="oscillator"
                              style={{ backgroundColor: SELECT_OPTION_BG, color: TEXT_PRIMARY }}
                              onMouseEnter={(e) => { e.target.style.backgroundColor = SELECT_OPTION_HOVER_BG; e.target.style.background = SELECT_OPTION_HOVER_BG; e.target.style.color = TEXT_PRIMARY; e.target.style.fontWeight = 'bold'; e.target.style.textDecoration = 'none'; e.target.style.boxShadow = `0 0 5px rgba(92, 230, 207, 0.3)`; e.target.style.outline = `1px solid ${ACCENT_PRIMARY}`; }}
                              onMouseLeave={(e) => { e.target.style.backgroundColor = SELECT_OPTION_BG; e.target.style.background = SELECT_OPTION_BG; e.target.style.color = TEXT_PRIMARY; e.target.style.fontWeight = 'normal'; e.target.style.textDecoration = 'none'; e.target.style.boxShadow = 'none'; e.target.style.outline = 'none'; }}
                            >Oscillator Panel</option>
                            <option value="macd"
                              style={{ backgroundColor: SELECT_OPTION_BG, color: TEXT_PRIMARY }}
                              onMouseEnter={(e) => { e.target.style.backgroundColor = SELECT_OPTION_HOVER_BG; e.target.style.background = SELECT_OPTION_HOVER_BG; e.target.style.color = TEXT_PRIMARY; e.target.style.fontWeight = 'bold'; e.target.style.textDecoration = 'none'; e.target.style.boxShadow = `0 0 5px rgba(92, 230, 207, 0.3)`; e.target.style.outline = `1px solid ${ACCENT_PRIMARY}`; }}
                              onMouseLeave={(e) => { e.target.style.backgroundColor = SELECT_OPTION_BG; e.target.style.background = SELECT_OPTION_BG; e.target.style.color = TEXT_PRIMARY; e.target.style.fontWeight = 'normal'; e.target.style.textDecoration = 'none'; e.target.style.boxShadow = 'none'; e.target.style.outline = 'none'; }}
                            >MACD Panel</option>
                            <option value="volume"
                              style={{ backgroundColor: SELECT_OPTION_BG, color: TEXT_PRIMARY }}
                              onMouseEnter={(e) => { e.target.style.backgroundColor = SELECT_OPTION_HOVER_BG; e.target.style.background = SELECT_OPTION_HOVER_BG; e.target.style.color = TEXT_PRIMARY; e.target.style.fontWeight = 'bold'; e.target.style.textDecoration = 'none'; e.target.style.boxShadow = `0 0 5px rgba(92, 230, 207, 0.3)`; e.target.style.outline = `1px solid ${ACCENT_PRIMARY}`; }}
                              onMouseLeave={(e) => { e.target.style.backgroundColor = SELECT_OPTION_BG; e.target.style.background = SELECT_OPTION_BG; e.target.style.color = TEXT_PRIMARY; e.target.style.fontWeight = 'normal'; e.target.style.textDecoration = 'none'; e.target.style.boxShadow = 'none'; e.target.style.outline = 'none'; }}
                            >Volume Panel</option>
                            <option value="volatility"
                              style={{ backgroundColor: SELECT_OPTION_BG, color: TEXT_PRIMARY }}
                              onMouseEnter={(e) => { e.target.style.backgroundColor = SELECT_OPTION_HOVER_BG; e.target.style.background = SELECT_OPTION_HOVER_BG; e.target.style.color = TEXT_PRIMARY; e.target.style.fontWeight = 'bold'; e.target.style.textDecoration = 'none'; e.target.style.boxShadow = `0 0 5px rgba(92, 230, 207, 0.3)`; e.target.style.outline = `1px solid ${ACCENT_PRIMARY}`; }}
                              onMouseLeave={(e) => { e.target.style.backgroundColor = SELECT_OPTION_BG; e.target.style.background = SELECT_OPTION_BG; e.target.style.color = TEXT_PRIMARY; e.target.style.fontWeight = 'normal'; e.target.style.textDecoration = 'none'; e.target.style.boxShadow = 'none'; e.target.style.outline = 'none'; }}
                            >Volatility Panel</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
  };

  // Function to check if an indicator is configured. (KEEP AS IS)
  const isIndicatorConfigured = (ind) => {
    // console.log("DEBUG-SC: StockSettingsSidebar: isIndicatorConfigured - START");
    // console.log("DEBUG-SC: StockSettingsSidebar:   ind:", ind);
    const name = typeof ind === 'string' ? ind : ind.name;
    // console.log("DEBUG-SC: StockSettingsSidebar:   name:", name);
    const isConfigured = settings.selectedIndicators.some(indicator =>
      (typeof indicator === 'string' ? indicator : indicator.name) === name
  );
    // console.log('DEBUG-SC: StockSettingsSidebar: isIndicatorConfigured: indicator', name, 'is configured?', isConfigured, 'configs:', settings.selectedIndicators);
    // console.log("DEBUG-SC: StockSettingsSidebar: isIndicatorConfigured - END, returning:", isConfigured);
    return isConfigured;
  };

  // Function to get the indicator name from an indicator object or string. (KEEP AS IS)
  const getIndicatorName = (ind) => {
    // console.log("DEBUG-SC: StockSettingsSidebar: getIndicatorName, START");
    // console.log("DEBUG-SC: StockSettingsSidebar: getIndicatorName, ind", ind);
    const result = typeof ind === 'string' ? ind : ind.name;
    // console.log("DEBUG-SC: StockSettingsSidebar: getIndicatorName, END, returning", result);
    return result;
  };

  // Debug log before rendering completes.
  // console.log("DEBUG-SC: StockSettingsSidebar - RENDER - END");

  // ---------------------------------------------------------------------
  // Render / Return JSX: Define the component's UI structure.
  // ---------------------------------------------------------------------
  return (
    <>
      {/* Settings sidebar component - Attach the ref here */}
      <div
        ref={sidebarRef} // <<< Attach ref to the main sidebar container
        className={`stock-settings-sidebar ${isOpen ? 'open' : 'closed'}`}
      >
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

          <div className="section-container chart-settings-section">
            <h3 className="section-title">Chart Settings</h3>

            {/* Chart settings form */}
            <div className="settings-form">
              {renderFormGroup(
                'ticker',
                'Ticker Symbol',
                'ticker',
                'text',
                settings.ticker,
                handleInputChange,
                { required: true }
              )}

              {renderFormGroup(
                'daysOfHistory',
                'Days of History',
                'daysOfHistory',
                'number',
                settings.daysOfHistory,
                handleInputChange,
                { min: '1', max: '365' }
              )}

              {renderFormGroup(
                'interval',
                'Interval',
                'interval',
                'select',
                settings.interval,
                handleInputChange,
                { items: INTERVALS }
              )}

              {renderFormGroup(
                'chartType',
                'Chart Type',
                'chartType',
                'select',
                settings.chartType,
                handleInputChange,
                { items: CHART_TYPES }
              )}

              {/* Unsaved changes indicator */}
              {hasUnsavedChanges && (
                <div className="unsaved-changes-alert">
                  <div className="alert-icon">⚠️</div>
                  <div className="alert-text">Changes not applied. Click "Update Chart" or press Enter to apply.</div> {/* Updated text */}
                </div>
              )}
              <button
                type="button"
                className={`update-button ${hasUnsavedChanges ? 'has-changes' : ''}`}
                onClick={handleUpdateClick}
                disabled={!hasUnsavedChanges} // Optionally disable if no changes
              >
                Update Chart
              </button>
            </div>
          </div>

          <div className="section-container indicators-section">
            <h3 className="section-title">Technical Indicators</h3>

            {/* Indicators grouped by panel type */}
            {Object.keys(PANEL_GROUPS).map(panelType =>
              renderIndicatorGroup(panelType)
            )}
          </div>

          {/* Indicator Configuration Panel embedded in sidebar */}
          {settings.selectedIndicators.length > 0 && (
            <div className="section-container indicator-configuration-section">
              <h3 className="section-title">Indicator Settings</h3>
              {/* console.log('DEBUG-SC: StockSettingsSidebar: indicator-configuration-section, settings.selectedIndicators:', settings.selectedIndicators) */}
              {settings.selectedIndicators
                .filter(isIndicatorConfigured)
                .map(ind => {
                  const indicatorName = getIndicatorName(ind);
                  const params = settings.indicatorConfigs || {}; // Use settings.indicatorConfigs directly
                  // console.log("DEBUG-SC: StockSettingsSidebar: indicator-configuration-section, params:", params);
                  // console.log("DEBUG-SC: StockSettingsSidebar: indicator-configuration-section, indicatorName:", indicatorName);

                  // Pass the correct configs for the specific indicator
                  const indicatorSpecificParams = DEFAULT_INDICATOR_PARAMS[indicatorName]
                                                      ? { [indicatorName]: DEFAULT_INDICATOR_PARAMS[indicatorName] }
                                                      : {};

                  // Only render config if parameters are defined for this indicator
                  if (Object.keys(indicatorSpecificParams).length > 0) {
                     return renderParameterConfig(indicatorName, indicatorSpecificParams);
                  }
                  return null; // Don't render config section if no params (like VWAP, OBV)
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

      {/* Styles for the sidebar (KEEP AS IS - No CSS changes needed for this feature) */}
      <style jsx>{`
        .stock-settings-sidebar {
          position: fixed;
          top: ${HEADER_HEIGHT};
          right: 0;
          height: calc(100vh - ${HEADER_HEIGHT});
          background: ${SIDEBAR_BG_COLOR};
          box-shadow: ${SIDEBAR_SHADOW};
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          width: ${SIDEBAR_WIDTH};
          z-index: ${SIDEBAR_Z_INDEX};
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: ${ACCENT_PRIMARY} rgba(0, 0, 0, 0.2);
          border-left: ${SIDEBAR_BORDER};
        }

        /* Scrollbar styling for WebKit browsers */
        .stock-settings-sidebar::-webkit-scrollbar {
          width: 8px;
        }

        .stock-settings-sidebar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
        }

        .stock-settings-sidebar::-webkit-scrollbar-thumb {
          background-color: ${ACCENT_PRIMARY};
          border-radius: 4px;
        }

        .stock-settings-sidebar.closed {
          transform: translateX(100%);
          box-shadow: none;
        }

        .stock-settings-sidebar.open {
          transform: translateX(0);
        }

        .sidebar-content {
          padding: 1rem;
          height: 100%;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .close-button {
          align-self: flex-end;
          cursor: pointer;
          padding: 0.5rem;
          transition: opacity 0.2s, transform 0.2s;
          background: rgba(92, 230, 207, 0.3);
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          width: 36px;
          height: 36px;
          margin-bottom: 5px;
        }

        .close-button:hover {
          opacity: 0.8;
          transform: rotate(90deg);
        }

        .settings-open-button {
          position: fixed;
          top: 90px;
          right: 10px;
          cursor: pointer;
          z-index: 800;
          padding: 0.5rem;
          border-radius: 50%;
          transition: transform 0.2s, box-shadow 0.2s;
          background: ${SIDEBAR_BG_COLOR};
          display: flex;
          justify-content: center;
          align-items: center;
          box-shadow: 0 0 10px ${SHADOW_COLOR};
        }

        .settings-open-button:hover {
          transform: scale(1.1);
          box-shadow: 0 0 15px rgba(0, 0, 0, 0.6), 0 0 5px ${ACCENT_PRIMARY};
        }

        .section-container {
          background: ${SECTION_BG_COLOR};
          border-radius: ${SECTION_BORDER_RADIUS};
          padding: ${SECTION_PADDING};
          border: ${SECTION_BORDER};
          box-shadow: ${SECTION_SHADOW};
          transition: box-shadow 0.3s ease;
        }

        .section-container:hover {
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3), 0 0 1px ${ACCENT_PRIMARY};
        }

        .section-title {
          margin-top: 0;
          margin-bottom: 15px;
          color: ${TEXT_PRIMARY};
          border-bottom: 1px solid rgba(92, 230, 207, 0.3);
          padding-bottom: 10px;
          font-size: 18px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          text-shadow: ${TEXT_GLOW};
        }

        .settings-form {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .form-group {
          margin-bottom: 12px;
          position: relative;
        }

        .form-group label {
          display: block;
          margin-bottom: 6px;
          font-weight: 500;
          color: ${TEXT_PRIMARY};
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* Futuristic input styling */
        .futuristic-input {
          width: ${INPUT_WIDTH} !important;
          height: ${INPUT_HEIGHT} !important;
          padding: 10px 12px !important;
          border: ${INPUT_BORDER} !important;
          border-radius: 4px !important;
          background-color: ${INPUT_BG_COLOR} !important;
          color: ${TEXT_PRIMARY} !important;
          font-size: 14px !important;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
          -webkit-appearance: none !important;
          -moz-appearance: none !important;
          appearance: none !important;
        }

        .futuristic-input:focus {
          outline: none;
          border-color: ${ACCENT_PRIMARY};
          box-shadow: ${INPUT_FOCUS_SHADOW};
        }

        /* Futuristic select styling */
        .futuristic-select-wrapper {
          position: relative;
          width: ${INPUT_WIDTH} !important;
          height: ${INPUT_HEIGHT} !important;
          overflow: visible !important;
          border: ${SELECT_BORDER} !important;
          border-radius: 4px !important;
          background: ${SELECT_BG_COLOR} url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='5' viewBox='0 0 10 5'%3E%3Cpath d='M0 0l5 5 5-5z' fill='%235CE6CF'/%3E%3C/svg%3E") no-repeat right 12px center !important;
          box-shadow: ${SELECT_FOCUS_SHADOW} !important;
          transition: none !important;
          z-index: 10 !important;
        }

        .futuristic-select-wrapper:hover {
          border-color: ${ACCENT_PRIMARY};
          box-shadow: ${SELECT_FOCUS_SHADOW} !important;
        }

        .futuristic-select {
          width: 100%;
          height: ${INPUT_HEIGHT};
          padding: 10px 12px;
          padding-right: 30px;
          background: transparent;
          color: ${TEXT_PRIMARY};
          font-size: 14px;
          border: none;
          -webkit-appearance: none !important;
          -moz-appearance: none !important;
          appearance: none !important;
          cursor: pointer;
          position: relative;
          z-index: 1;
        }

        .futuristic-select:focus {
          outline: none;
        }

        /* Hide browser-specific dropdown arrows */
        .futuristic-select::-ms-expand {
          display: none;
        }

        /* For webkit browsers */
        .futuristic-select-wrapper::after {
          content: none;
        }

        .update-button {
          padding: 12px;
          background-color: ${ACCENT_PRIMARY};
          color: rgba(0, 0, 0, 1);
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
          margin-top: 5px;
          transition: background-color 0.2s, transform 0.1s, box-shadow 0.2s, opacity 0.2s;
          text-transform: uppercase;
          letter-spacing: 1px;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
          height: ${BUTTON_HEIGHT};
        }

        .update-button.has-changes {
          animation: pulse 2s infinite;
          background-color: ${HIGHLIGHT_COLOR};
          box-shadow: 0 2px 10px ${HIGHLIGHT_COLOR}, 0 0 15px rgba(92, 230, 207, 0.3);
        }

        @keyframes pulse {
          0% {
            box-shadow: 0 2px 10px ${HIGHLIGHT_COLOR}, 0 0 5px rgba(92, 230, 207, 0.3);
          }
          50% {
            box-shadow: 0 2px 15px ${HIGHLIGHT_COLOR}, 0 0 20px rgba(92, 230, 207, 0.5);
          }
          100% {
            box-shadow: 0 2px 10px ${HIGHLIGHT_COLOR}, 0 0 5px rgba(92, 230, 207, 0.3);
          }
        }

        .update-button:not([disabled]):hover {
          background-color: ${ACCENT_HOVER};
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3), ${ACCENT_GLOW};
        }

        .update-button:not([disabled]):active {
          transform: translateY(0);
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        }

        .update-button:disabled {
          background-color: rgba(92, 230, 207, 0.4); /* Dimmed accent */
          color: rgba(0, 0, 0, 0.5);
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
          animation: none;
          opacity: 0.6;
        }

        .unsaved-changes-alert {
          display: flex;
          align-items: center;
          padding: 8px 12px;
          background: rgba(255, 165, 0, 0.15);
          border-left: 3px solid ${WARNING_COLOR};
          border-radius: 3px;
          margin: 10px 0;
          font-size: 13px;
        }

        .alert-icon {
          margin-right: 8px;
          font-size: 16px;
        }

        .alert-text {
          color: ${TEXT_PRIMARY};
          font-weight: 500;
        }

        .indicators-section {
          margin-bottom: 5px;
        }

        .indicator-group {
          margin-bottom: 15px;
          padding: 12px;
          border-radius: 4px;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(92, 230, 207, 0.15);
          transition: box-shadow 0.3s;
        }

        .indicator-group:hover {
          box-shadow: 0 0 8px rgba(92, 230, 207, 0.2);
        }

        .indicator-group-title {
          margin-top: 0;
          margin-bottom: 10px;
          color: ${ACCENT_PRIMARY};
          font-size: 15px;
          padding-bottom: 5px;
          border-bottom: 1px dotted rgba(92, 230, 207, 0.3);
        }

        .indicators-grid {
          display: grid;
          grid-template-columns: 1fr;
        }

        .indicator-checkbox {
          padding: 8px 12px;
          border-radius: 3px;
          transition: all 0.2s;
          cursor: pointer;
          border: 1px solid transparent;
          min-height: 38px;
        }

        .indicator-checkbox:hover {
          background: rgba(92, 230, 207, 0.05);
        }

        .indicator-checkbox.selected {
          background: rgba(92, 230, 207, 0.1);
          border: 1px solid rgba(92, 230, 207, 0.4);
        }

        /* Table layout for guaranteed side-by-side arrangement */
        .indicator-table {
          border: none;
          border-collapse: collapse;
        }

        .checkbox-cell {
          padding: 0;
        }

        .label-cell {
          text-align: left;
        }

        .table-checkbox {
          display: inline-block;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .table-checkbox:hover {
          transform: scale(1.1);
        }

        .checkbox-text {
          font-size: 14px;
          color: ${TEXT_PRIMARY};
          transition: color 0.2s;
        }

        .indicator-checkbox:hover .checkbox-text {
          color: ${TEXT_PRIMARY};
        }

        .indicator-configuration-section {
          margin-top: 5px;
        }

        .parameter-config {
          margin-bottom: 15px;
          padding: 12px;
          border-radius: 4px;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(92, 230, 207, 0.15);
          transition: box-shadow 0.3s;
        }

        .parameter-config:hover {
          box-shadow: 0 0 8px rgba(92, 230, 207, 0.2);
        }

        .parameter-title {
          margin-top: 0;
          margin-bottom: 10px;
          color: ${ACCENT_PRIMARY};
          font-size: 15px;
          padding-bottom: 5px;
          border-bottom: 1px dotted rgba(92, 230, 207, 0.3);
        }

        .parameter-config-container {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .parameter-inputs {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 10px;
        }

        .param-input {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .param-input label {
          font-size: 12px;
          text-transform: capitalize;
          color: ${TEXT_SECONDARY};
        }

        .param-input input {
          width: 100% !important;
          padding: 6px 8px !important;
          font-size: 13px !important;
          border: ${INPUT_BORDER} !important;
          border-radius: 3px !important;
          background-color: ${INPUT_BG_COLOR} !important;
          color: ${TEXT_PRIMARY} !important;
          transition: border-color 0.2s, box-shadow 0.2s;
          height: 32px !important;
          -webkit-appearance: none !important;
          -moz-appearance: none !important;
          appearance: none !important;
        }

        .param-input input:focus {
          outline: none;
          border-color: ${ACCENT_PRIMARY};
          box-shadow: ${INPUT_FOCUS_SHADOW};
        }

        .panel-selection {
          margin-top: 5px;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .panel-selection label {
          font-size: 12px;
          text-transform: uppercase;
          color: ${TEXT_SECONDARY};
        }

        .panel-selection .futuristic-select-wrapper {
          height: 36px;
        }

        .panel-selection .futuristic-select {
          height: 36px;
        }

        /* Styling for dropdown options - using more aggressive browser styling */
        select.futuristic-select option {
          background: ${SELECT_OPTION_BG} !important;
          background-color: ${SELECT_OPTION_BG} !important;
          color: ${TEXT_PRIMARY} !important;
          padding: 8px !important;
          text-shadow: 0 1px 0 rgba(0, 0, 0, 0.4) !important;
        }

        /* Add this to ensure background color is enforced */
        select.futuristic-select option:not(:checked) {
          background: linear-gradient(${SELECT_OPTION_BG}, ${SELECT_OPTION_BG}) !important;
        }

        /* Highlight effect on hover - more visible to user */
        select.futuristic-select option:hover,
        select.futuristic-select option:focus {
          color: ${TEXT_PRIMARY} !important;
          background: ${SELECT_OPTION_HOVER_BG} !important;
          background-color: ${SELECT_OPTION_HOVER_BG} !important;
          background-image: linear-gradient(${SELECT_OPTION_HOVER_BG}, ${SELECT_OPTION_HOVER_BG}) !important;
          box-shadow: 0 0 5px rgba(92, 230, 207, 0.3) inset !important;
          outline: 1px solid ${ACCENT_PRIMARY} !important;
          text-shadow: 0 1px 0 rgba(0, 0, 0, 0.4) !important;
        }
      `}</style>
    </>
  );
};

export default StockSettingsSidebar;